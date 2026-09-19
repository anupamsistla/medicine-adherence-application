import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";
import { getDueReminders } from "../lib/reminders";

const QUEUE_NAME = "medication-reminders";
const POLL_INTERVAL_MS = 60_000;

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const queue = new Queue(QUEUE_NAME, { connection });

async function checkAndSendReminders() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const medications = await prisma.medication.findMany({
    include: { user: { select: { email: true } } },
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

  const due = getDueReminders(
    medications,
    takenKeys,
    remindedKeys,
    now,
    POLL_INTERVAL_MS
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

async function main() {
  await queue.upsertJobScheduler("reminder-poll", { every: POLL_INTERVAL_MS });

  new Worker(QUEUE_NAME, () => checkAndSendReminders(), { connection });

  console.log(
    `Reminder worker started. Polling every ${POLL_INTERVAL_MS / 1000}s.`
  );

  // Run once immediately on startup rather than waiting for the first tick.
  await checkAndSendReminders();
}

main().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});
