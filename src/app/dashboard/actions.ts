"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function logDoseTaken(medicationId: string, scheduledForIso: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
    include: {
      user: { select: { email: true, lowStockThresholdPercent: true } },
    },
  });
  if (!medication || medication.userId !== session.user.id) return;

  const scheduledFor = new Date(scheduledForIso);

  const existing = await prisma.doseLog.findUnique({
    where: { medicationId_scheduledFor: { medicationId, scheduledFor } },
  });
  if (existing) {
    revalidatePath("/dashboard");
    return;
  }

  const newQuantity = Math.max(
    0,
    medication.quantityAvailable - medication.amountPerDose
  );

  const shouldAlert =
    newQuantity <=
    medication.originalQuantity * (medication.user.lowStockThresholdPercent / 100);

  await prisma.$transaction([
    prisma.doseLog.create({
      data: { medicationId, userId: session.user.id, scheduledFor },
    }),
    prisma.medication.update({
      where: { id: medicationId },
      data: { quantityAvailable: newQuantity },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/medications");

  if (shouldAlert) {
    try {
      const percentRemaining = Math.round(
        (newQuantity / medication.originalQuantity) * 100
      );
      await sendEmail({
        to: medication.user.email,
        subject: `Low stock: ${medication.name}`,
        text: `${medication.name} is running low: ${newQuantity} ${medication.unit} left (${percentRemaining}% of your last recorded ${medication.originalQuantity} ${medication.unit}). Consider refilling soon.`,
      });
    } catch (error) {
      console.error(`Failed to send low-stock alert for ${medication.name}:`, error);
    }
  }
}
