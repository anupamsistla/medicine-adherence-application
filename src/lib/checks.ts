import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { getDueReminders } from "./reminders";
import { daysUntilExpiry, isExpiryAlertDue } from "./expiry";

const POLL_INTERVAL_MS = 60_000;

export async function checkAndSendReminders() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const medications = await prisma.medication.findMany({
    include: { user: { select: { email: true, reminderMinutesBefore: true } } },
  });

  const [doseLogs, reminderLogs] = await Promise.all([
    prisma.doseLog.findMany({
      where: { scheduledFor: { gte: startOfToday } },
      select: { medicationId: true, scheduledFor: true },
    }),
    prisma.reminderLog.findMany({
      where: { scheduledFor: { gte: startOfToday } },
      select: { medicationId: true, scheduledFor: true },
    }),
  ]);

  const takenKeys = new Set(
    doseLogs.map((l) => `${l.medicationId}|${l.scheduledFor.toISOString()}`)
  );
  const remindedKeys = new Set(
    reminderLogs.map((l) => `${l.medicationId}|${l.scheduledFor.toISOString()}`)
  );

  const medicationsByUser = new Map<string, typeof medications>();
  for (const medication of medications) {
    const list = medicationsByUser.get(medication.userId) ?? [];
    list.push(medication);
    medicationsByUser.set(medication.userId, list);
  }

  const due = Array.from(medicationsByUser.values()).flatMap((userMedications) =>
    getDueReminders(
      userMedications,
      takenKeys,
      remindedKeys,
      now,
      POLL_INTERVAL_MS,
      userMedications[0].user.reminderMinutesBefore
    )
  );

  for (const { medication, scheduledFor } of due) {
    try {
      await sendEmail({
        to: medication.user.email,
        subject: `Reminder: take ${medication.name} soon`,
        text: `This is a reminder to take ${medication.amountPerDose} ${medication.unit} of ${medication.name} at ${scheduledFor.toLocaleTimeString(
          [],
          { hour: "numeric", minute: "2-digit" }
        )}.`,
      });

      await prisma.reminderLog.upsert({
        where: {
          medicationId_scheduledFor: { medicationId: medication.id, scheduledFor },
        },
        create: { medicationId: medication.id, userId: medication.userId, scheduledFor },
        update: {},
      });

      console.log(`Reminder sent: ${medication.name} -> ${medication.user.email}`);
    } catch (error) {
      console.error(`Failed to send reminder for ${medication.name}:`, error);
    }
  }
}

export async function checkAndSendExpiryAlerts() {
  const now = new Date();

  const medications = await prisma.medication.findMany({
    where: { expiryDate: { not: null } },
    include: { user: { select: { email: true, expiryAlertDaysBefore: true } } },
  });

  for (const medication of medications) {
    if (!isExpiryAlertDue(medication, now, medication.user.expiryAlertDaysBefore)) {
      continue;
    }

    try {
      const days = daysUntilExpiry(medication.expiryDate!, now);
      const status =
        days > 0
          ? `expires in ${days} day${days === 1 ? "" : "s"}`
          : days === 0
            ? "expires today"
            : `expired ${-days} day${-days === 1 ? "" : "s"} ago`;

      await sendEmail({
        to: medication.user.email,
        subject: `${days <= 0 ? "Expired" : "Expiring soon"}: ${medication.name}`,
        text: `${medication.name} ${status} (${medication.expiryDate!.toLocaleDateString()}). Consider replacing it.`,
      });

      await prisma.medication.update({
        where: { id: medication.id },
        data: { lastExpiryAlertSentAt: now },
      });

      console.log(`Expiry alert sent: ${medication.name} -> ${medication.user.email}`);
    } catch (error) {
      console.error(`Failed to send expiry alert for ${medication.name}:`, error);
    }
  }
}

export async function runChecks() {
  await checkAndSendReminders();
  await checkAndSendExpiryAlerts();
}
