import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { getDueReminders } from "./reminders";
import { daysUntilExpiry, isExpiryAlertDue } from "./expiry";
import { formatDay, formatTime } from "./timezone";

const POLL_INTERVAL_MS = 60_000;
const LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000;

export async function checkAndSendReminders() {
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_MS);

  const medications = await prisma.medication.findMany({
    include: {
      user: { select: { email: true, reminderMinutesBefore: true, timeZone: true } },
    },
  });

  const [doseLogs, reminderLogs] = await Promise.all([
    prisma.doseLog.findMany({
      where: { scheduledFor: { gte: since } },
      select: { medicationId: true, scheduledFor: true },
    }),
    prisma.reminderLog.findMany({
      where: { scheduledFor: { gte: since } },
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

  const due = Array.from(medicationsByUser.values()).flatMap((userMedications) => {
    const { reminderMinutesBefore, timeZone } = userMedications[0].user;
    return getDueReminders(
      userMedications,
      takenKeys,
      remindedKeys,
      now,
      POLL_INTERVAL_MS,
      timeZone,
      reminderMinutesBefore
    ).map((reminder) => ({ ...reminder, timeZone }));
  });

  for (const { medication, scheduledFor, timeZone } of due) {
    try {
      await sendEmail({
        to: medication.user.email,
        subject: `Reminder: take ${medication.name} soon`,
        text: `This is a reminder to take ${medication.amountPerDose} ${medication.unit} of ${medication.name} at ${formatTime(scheduledFor, timeZone)}.`,
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
    include: {
      user: { select: { email: true, expiryAlertDaysBefore: true, timeZone: true } },
    },
  });

  for (const medication of medications) {
    const { email, expiryAlertDaysBefore, timeZone } = medication.user;
    if (!isExpiryAlertDue(medication, now, timeZone, expiryAlertDaysBefore)) {
      continue;
    }

    try {
      const days = daysUntilExpiry(medication.expiryDate!, now, timeZone);
      const status =
        days > 0
          ? `expires in ${days} day${days === 1 ? "" : "s"}`
          : days === 0
            ? "expires today"
            : `expired ${-days} day${-days === 1 ? "" : "s"} ago`;

      await sendEmail({
        to: email,
        subject: `${days <= 0 ? "Expired" : "Expiring soon"}: ${medication.name}`,
        text: `${medication.name} ${status} (${formatDay(medication.expiryDate!, timeZone)}). Consider replacing it.`,
      });

      await prisma.medication.update({
        where: { id: medication.id },
        data: { lastExpiryAlertSentAt: now },
      });

      console.log(`Expiry alert sent: ${medication.name} -> ${email}`);
    } catch (error) {
      console.error(`Failed to send expiry alert for ${medication.name}:`, error);
    }
  }
}

export async function runChecks() {
  await checkAndSendReminders();
  await checkAndSendExpiryAlerts();
}
