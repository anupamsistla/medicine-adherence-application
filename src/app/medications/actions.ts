"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const medicationSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required." }),
    type: z.string().trim().min(1, { error: "Type is required." }),
    times: z
      .array(z.string().regex(/^\d{2}:\d{2}$/))
      .min(1, { error: "Add at least one time." }),
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)),
    quantityAvailable: z.coerce
      .number()
      .min(0, { error: "Must be zero or more." }),
    amountPerDose: z.coerce
      .number()
      .positive({ error: "Must be greater than zero." }),
    unit: z.string().trim().min(1, { error: "Unit is required." }),
    medicalCondition: z.string().trim().optional(),
    importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    expiryDate: z.string().optional(),
  })
  .refine(
    (data) => !data.expiryDate || data.expiryDate >= todayDateString(),
    { error: "Expiry date cannot be in the past.", path: ["expiryDate"] }
  );

export type MedicationFormState = { error?: string } | undefined;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function parseMedicationForm(formData: FormData) {
  return medicationSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    times: formData.getAll("times"),
    daysOfWeek: formData.getAll("daysOfWeek"),
    quantityAvailable: formData.get("quantityAvailable"),
    amountPerDose: formData.get("amountPerDose"),
    unit: formData.get("unit"),
    medicalCondition: formData.get("medicalCondition") || undefined,
    importance: formData.get("importance"),
    expiryDate: formData.get("expiryDate") || undefined,
  });
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const PRESCRIPTION_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  "application/pdf": "pdf",
};

async function saveUploadIfPresent(
  formData: FormData,
  fieldName: string,
  allowedTypes: Record<string, string>,
  typeErrorMessage: string
): Promise<string | undefined> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return undefined;

  const extension = allowedTypes[file.type];
  if (!extension) throw new Error(typeErrorMessage);
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File must be smaller than 5MB.");
  }

  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);

  return `/uploads/${filename}`;
}

async function deleteUploadedFile(filePath: string) {
  await unlink(path.join(process.cwd(), "public", filePath)).catch(() => {});
}

export async function createMedication(
  _prevState: MedicationFormState,
  formData: FormData
): Promise<MedicationFormState> {
  const userId = await requireUserId();

  const parsed = parseMedicationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }

  let imagePath: string | undefined;
  let prescriptionPath: string | undefined;
  try {
    imagePath = await saveUploadIfPresent(
      formData,
      "image",
      IMAGE_TYPES,
      "Unsupported image type. Use PNG, JPEG, WebP, or GIF."
    );
    prescriptionPath = await saveUploadIfPresent(
      formData,
      "prescription",
      PRESCRIPTION_TYPES,
      "Unsupported file type. Use PNG, JPEG, WebP, GIF, or PDF."
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to upload file." };
  }

  const { expiryDate, ...rest } = parsed.data;
  await prisma.medication.create({
    data: {
      ...rest,
      userId,
      imagePath,
      prescriptionPath,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    },
  });

  revalidatePath("/medications");
  redirect("/medications");
}

export async function updateMedication(
  id: string,
  _prevState: MedicationFormState,
  formData: FormData
): Promise<MedicationFormState> {
  const userId = await requireUserId();

  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return { error: "Medication not found." };
  }

  const parsed = parseMedicationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }

  let imagePath = existing.imagePath ?? undefined;
  let prescriptionPath = existing.prescriptionPath ?? undefined;
  try {
    const newImagePath = await saveUploadIfPresent(
      formData,
      "image",
      IMAGE_TYPES,
      "Unsupported image type. Use PNG, JPEG, WebP, or GIF."
    );
    if (newImagePath) {
      if (existing.imagePath) await deleteUploadedFile(existing.imagePath);
      imagePath = newImagePath;
    }

    const newPrescriptionPath = await saveUploadIfPresent(
      formData,
      "prescription",
      PRESCRIPTION_TYPES,
      "Unsupported file type. Use PNG, JPEG, WebP, GIF, or PDF."
    );
    if (newPrescriptionPath) {
      if (existing.prescriptionPath) await deleteUploadedFile(existing.prescriptionPath);
      prescriptionPath = newPrescriptionPath;
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to upload file." };
  }

  const { expiryDate, ...rest } = parsed.data;
  await prisma.medication.update({
    where: { id },
    data: {
      ...rest,
      imagePath,
      prescriptionPath,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });

  revalidatePath("/medications");
  redirect("/medications");
}

export async function deleteMedication(id: string) {
  const userId = await requireUserId();

  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return;

  if (existing.imagePath) await deleteUploadedFile(existing.imagePath);
  if (existing.prescriptionPath) await deleteUploadedFile(existing.prescriptionPath);
  await prisma.medication.delete({ where: { id } });

  revalidatePath("/medications");
}
