import type { MedicationSchedule } from "./schedule";

export const REMINDER_MINUTES_BEFORE = 15;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function occurrencesForToday(medication: MedicationSchedule, now: Date): Date[] {
  const today = startOfDay(now);
  const weekday = today.getDay();

  if (
    medication.daysOfWeek.length > 0 &&
    !medication.daysOfWeek.includes(weekday)
  ) {
    return [];
  }

  return medication.times.map((time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const occurrence = new Date(today);
    occurrence.setHours(hours, minutes, 0, 0);
    return occurrence;
  });
}

export type DueReminder<T> = {
  medication: T;
  scheduledFor: Date;
};

/**
 * Finds doses whose reminder time (scheduledFor - minutesBefore) falls within
 * [now, now + windowMs) — i.e. doses this poll tick is responsible for.
 */
export function getDueReminders<T extends MedicationSchedule>(
  medications: T[],
  takenKeys: Set<string>,
  remindedKeys: Set<string>,
  now: Date,
  windowMs: number,
  minutesBefore: number = REMINDER_MINUTES_BEFORE
): DueReminder<T>[] {
  const windowStart = new Date(now.getTime() + minutesBefore * 60_000);
  const windowEnd = new Date(windowStart.getTime() + windowMs);

  const due: DueReminder<T>[] = [];

  for (const medication of medications) {
    for (const occurrence of occurrencesForToday(medication, now)) {
      if (occurrence < windowStart || occurrence >= windowEnd) continue;

      const key = `${medication.id}|${occurrence.toISOString()}`;
      if (takenKeys.has(key) || remindedKeys.has(key)) continue;

      due.push({ medication, scheduledFor: occurrence });
    }
  }

  return due;
}
