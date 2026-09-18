"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function logDoseTaken(medicationId: string, scheduledForIso: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
  });
  if (!medication || medication.userId !== session.user.id) return;

  const scheduledFor = new Date(scheduledForIso);

  await prisma.doseLog.upsert({
    where: { medicationId_scheduledFor: { medicationId, scheduledFor } },
    create: { medicationId, userId: session.user.id, scheduledFor },
    update: {},
  });

  revalidatePath("/dashboard");
}
