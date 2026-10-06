import type { MedicationSchedule } from "./schedule";
import { getZonedParts, zonedDateToInstant } from "./timezone";

export const REMINDER_MINUTES_BEFORE = 15;

function occurrencesForToday(medication: MedicationSchedule, now: Date, timeZone: string): Date[] {
  const { year, month, day, weekday } = getZonedParts(now, timeZone);

  if (medication.daysOfWeek.length > 0 && !medication.daysOfWeek.includes(weekday)) {
    return [];
  }

  return medication.times.map((time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return zonedDateToInstant(year, month, day, hours, minutes, timeZone);
  });
}

export type DueReminder<T> = {
  medication: T;
  scheduledFor: Date;
};

/**
 * Finds doses whose reminder time (scheduledFor - minutesBefore) falls within
 * [now, now + windowMs), that is, doses this poll tick is responsible for.
 */
export function getDueReminders<T extends MedicationSchedule>(
  medications: T[],
  takenKeys: Set<string>,
  remindedKeys: Set<string>,
  now: Date,
  windowMs: number,
  timeZone: string,
  minutesBefore: number = REMINDER_MINUTES_BEFORE
): DueReminder<T>[] {
  const windowStart = new Date(now.getTime() + minutesBefore * 60_000);
  const windowEnd = new Date(windowStart.getTime() + windowMs);

  const due: DueReminder<T>[] = [];

  for (const medication of medications) {
    for (const occurrence of occurrencesForToday(medication, now, timeZone)) {
      if (occurrence < windowStart || occurrence >= windowEnd) continue;

      const key = `${medication.id}|${occurrence.toISOString()}`;
      if (takenKeys.has(key) || remindedKeys.has(key)) continue;

      due.push({ medication, scheduledFor: occurrence });
    }
  }

  return due;
}
