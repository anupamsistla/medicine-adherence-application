"use server";

import { put } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { documentsCollection, chunksCollection, type DocumentType } from "@/lib/mongodb";
import { extractDocumentText } from "@/lib/document-extraction";
import { chunkText } from "@/lib/document-chunking";
import { embedChunks } from "@/lib/voyage";
import { getDosesInRange } from "@/lib/schedule";
import { formatDay, parseDateInput } from "@/lib/timezone";
import { getUserTimeZone } from "@/lib/user-timezone";
import { NO_EM_DASH_INSTRUCTION, stripEmDashes } from "@/lib/llm-text";

const ALLOWED_TYPES: Record<string, true> = {
  "application/pdf": true,
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/gif": true,
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  lab_report: "Lab report",
  visit_note: "Visit note",
  discharge_summary: "Discharge summary",
  referral: "Referral letter",
  prescription_leaflet: "Prescription leaflet",
  other: "Other",
};

export type UploadState = { error?: string } | undefined;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function uploadDocument(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const userId = await requireUserId();

  const file = formData.get("file");
  const type = formData.get("type") as DocumentType | null;
  const title = (formData.get("title") as string | null)?.trim();
  const documentDateInput = (formData.get("documentDate") as string | null)?.trim();
  const timeZone = await getUserTimeZone(userId);

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (!ALLOWED_TYPES[file.type]) {
    return { error: "Unsupported file type. Use PDF, PNG, JPEG, WebP, or GIF." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "File must be smaller than 10MB." };
  }
  if (!type || !DOCUMENT_TYPE_LABELS[type]) {
    return { error: "Choose a document type." };
  }

  try {
    const blob = await put(file.name, file, { access: "public" });

    const rawText = await extractDocumentText(file);
    if (!rawText) {
      return { error: "Couldn't extract any text from that file, try a clearer scan." };
    }

    const chunks = chunkText(rawText);
    const embeddings = await embedChunks(chunks);

    const now = new Date();
    const documentId = new ObjectId();

    await documentsCollection().insertOne({
      _id: documentId,
      userId,
      type,
      title: title || file.name,
      sourceFileUrl: blob.url,
      rawText,
      documentDate: documentDateInput ? parseDateInput(documentDateInput, timeZone) : undefined,
      createdAt: now,
      updatedAt: now,
    });

    await chunksCollection().insertMany(
      chunks.map((text, index) => ({
        documentId,
        userId,
        text,
        embedding: embeddings[index],
        chunkIndex: index,
        createdAt: now,
      }))
    );
  } catch (error) {
    console.error("Document upload failed", error);
    return {
      error: error instanceof Error ? error.message : "Failed to process that document.",
    };
  }

  revalidatePath("/documents");
  return undefined;
}

export async function deleteDocument(id: string) {
  const userId = await requireUserId();
  const documentId = new ObjectId(id);

  const doc = await documentsCollection().findOne({ _id: documentId, userId });
  if (!doc) return;

  await chunksCollection().deleteMany({ documentId });
  await documentsCollection().deleteOne({ _id: documentId });

  revalidatePath("/documents");
}

const PREP_SYSTEM_PROMPT = `You are a pre-appointment prep assistant inside MedTrack. You're given the user's medication adherence data since their last visit, plus the full text of their most recent clinical documents (lab reports and/or visit notes, sometimes two of the same type so you can compare trends).

Respond with ONLY a JSON object, no prose and no code fences, with exactly these keys:
- "changes": array of 1-4 short strings describing what's changed, especially trends across two documents of the same type if given
- "adherenceNotes": array of 1-4 short strings about missed doses, timing patterns, or low stock worth mentioning to the doctor
- "questionsForDoctor": array of 3-5 specific, concrete questions grounded in the data above

Each string is one plain sentence with no markdown. Do not diagnose, recommend treatment changes, or suggest medication adjustments yourself, only summarize what's there and suggest what to ask about. ${NO_EM_DASH_INSTRUCTION}`;

const prepSummarySchema = z.object({
  changes: z.array(z.string()).min(1),
  adherenceNotes: z.array(z.string()),
  questionsForDoctor: z.array(z.string()).min(1),
});

export type PrepSummary = z.infer<typeof prepSummarySchema>;

const CLINICAL_TYPES: DocumentType[] = ["visit_note", "lab_report", "discharge_summary", "referral"];
const DOCS_PER_TYPE = 2;

export async function prepareForAppointment(): Promise<
  { summary: PrepSummary } | { error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "You need to be signed in to do this." };
  const timeZone = await getUserTimeZone(userId);

  try {
    const recentDocsByType = await Promise.all(
      CLINICAL_TYPES.map((type) =>
        documentsCollection()
          .find({ userId, type })
          .sort({ documentDate: -1, createdAt: -1 })
          .limit(DOCS_PER_TYPE)
          .toArray()
      )
    );
    const recentDocs = recentDocsByType.flat();

    if (recentDocs.length === 0) {
      return {
        error:
          "Upload at least one lab report or visit note first, there's nothing to prep from yet.",
      };
    }

    const mostRecentDate = recentDocs
      .map((d) => d.documentDate ?? d.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const now = new Date();
    const medications = await prisma.medication.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    const doseLogs = await prisma.doseLog.findMany({
      where: { userId, scheduledFor: { gte: mostRecentDate, lte: now } },
      select: { medicationId: true, scheduledFor: true, takenAt: true },
    });
    const doses = getDosesInRange(medications, doseLogs, mostRecentDate, now, now, timeZone);

    const adherenceLines = medications.map((med) => {
      const medDoses = doses.filter((d) => d.medication.id === med.id && d.status !== "upcoming");
      const taken = medDoses.filter((d) => d.status === "taken").length;
      const missed = medDoses.filter((d) => d.status === "missed").length;
      const lowStock =
        med.originalQuantity > 0 && med.quantityAvailable / med.originalQuantity <= 0.2;
      const expiring =
        med.expiryDate && med.expiryDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000;
      return [
        `${med.name}: ${taken} taken, ${missed} missed since ${formatDay(mostRecentDate, timeZone)}`,
        `(current stock: ${med.quantityAvailable} ${med.unit}${lowStock ? ", running low" : ""}${expiring ? ", expiring soon" : ""})`,
      ].join(" ");
    });

    const documentsContext = recentDocs
      .map((doc) => {
        const date = formatDay(doc.documentDate ?? doc.createdAt, timeZone);
        return `## ${doc.title} (${DOCUMENT_TYPE_LABELS[doc.type]}, ${date})\n${doc.rawText}`;
      })
      .join("\n\n");

    const context = `Adherence since ${formatDay(mostRecentDate, timeZone)}:\n${adherenceLines.join("\n")}\n\nRecent documents:\n\n${documentsContext}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { error: "The assistant isn't configured yet (missing API key)." };

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system: PREP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: context }],
    });

    const raw = stripEmDashes(response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, ""));

    const parsed = prepSummarySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.error("Appointment prep returned an unexpected shape", parsed.error);
      return { error: "Couldn't generate a summary, try again in a moment." };
    }

    return { summary: parsed.data };
  } catch (error) {
    console.error("Appointment prep failed", error);
    return { error: "Something went wrong generating that, try again in a moment." };
  }
}
