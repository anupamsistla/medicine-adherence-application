import {
  addCalendarDays,
  dayKey,
  getZonedParts,
  startOfDayInZone,
  zonedDateToInstant,
} from "./timezone";

export type MedicationSchedule = {
  id: string;
  times: string[];
  daysOfWeek: number[];
};

function occurrenceKey(medicationId: string, occurrence: Date) {
  return `${medicationId}|${occurrence.toISOString()}`;
}

/** All scheduled occurrences for one medication on one calendar day in `timeZone`. */
function occurrencesForDay(
  medication: MedicationSchedule,
  dayStart: Date,
  timeZone: string
): Date[] {
  const { year, month, day, weekday } = getZonedParts(dayStart, timeZone);
  if (medication.daysOfWeek.length > 0 && !medication.daysOfWeek.includes(weekday)) {
    return [];
  }

  return [...medication.times].sort().map((time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return zonedDateToInstant(year, month, day, hours, minutes, timeZone);
  });
}

export type DoseStatus = "taken" | "missed" | "upcoming";

export type TodaysDose<T> = {
  medication: T;
  scheduledFor: Date;
  status: DoseStatus;
  /** Only set when status === "taken". */
  takenAt?: Date;
};

/** How far from `scheduledFor` a dose can be marked taken before it counts as early/late. */
export const DOSE_TIMING_WINDOW_MINUTES = 30;

export type DoseTiming = "early" | "late" | "on-time";

/** Classifies an already-taken dose as early/late/on-time relative to when it was scheduled. */
export function getDoseTiming(
  scheduledFor: Date,
  takenAt: Date,
  windowMinutes: number = DOSE_TIMING_WINDOW_MINUTES
): DoseTiming {
  const diffMinutes = (takenAt.getTime() - scheduledFor.getTime()) / 60_000;
  if (diffMinutes < -windowMinutes) return "early";
  if (diffMinutes > windowMinutes) return "late";
  return "on-time";
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** e.g. "45m early", "1h 15m late", or "On-time". */
export function formatDoseTiming(
  scheduledFor: Date,
  takenAt: Date,
  windowMinutes: number = DOSE_TIMING_WINDOW_MINUTES
): string {
  const timing = getDoseTiming(scheduledFor, takenAt, windowMinutes);
  if (timing === "on-time") return "On-time";

  const diffMinutes = Math.round(
    Math.abs(takenAt.getTime() - scheduledFor.getTime()) / 60_000
  );
  return `${formatDuration(diffMinutes)} ${timing}`;
}

/**
 * Every dose scheduled within [rangeStart, rangeEnd), each labeled
 * taken/missed/upcoming, in chronological order. Reconstructed from each
 * medication's *current* schedule (bounded below by its createdAt), so
 * editing a medication's times/days shifts how past days in range are
 * judged too. That is acceptable for a lightweight view, not an audit trail.
 */
export function getDosesInRange<T extends MedicationSchedule & { createdAt: Date }>(
  medications: T[],
  doseLogs: { medicationId: string; scheduledFor: Date; takenAt: Date }[],
  rangeStart: Date,
  rangeEnd: Date,
  now: Date,
  timeZone: string
): TodaysDose<T>[] {
  const takenByKey = new Map(
    doseLogs.map((log) => [occurrenceKey(log.medicationId, log.scheduledFor), log.takenAt])
  );

  const startParts = getZonedParts(rangeStart, timeZone);
  const endParts = getZonedParts(rangeEnd, timeZone);
  const endDay = zonedDateToInstant(endParts.year, endParts.month, endParts.day, 0, 0, timeZone);

  const doses: TodaysDose<T>[] = [];
  for (const medication of medications) {
    for (let offset = 0; ; offset++) {
      const next = addCalendarDays(startParts.year, startParts.month, startParts.day, offset);
      const dayStart = zonedDateToInstant(next.year, next.month, next.day, 0, 0, timeZone);
      if (dayStart >= endDay) break;

      for (const occurrence of occurrencesForDay(medication, dayStart, timeZone)) {
        if (occurrence < medication.createdAt) continue;
        if (occurrence < rangeStart || occurrence >= rangeEnd) continue;

        const takenAt = takenByKey.get(occurrenceKey(medication.id, occurrence));
        const status: DoseStatus = takenAt ? "taken" : occurrence < now ? "missed" : "upcoming";
        doses.push({ medication, scheduledFor: occurrence, status, takenAt });
      }
    }
  }

  return doses.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

/** Every dose scheduled for today in `timeZone`, each labeled taken/missed/upcoming. */
export function getTodaysDoses<T extends MedicationSchedule & { createdAt: Date }>(
  medications: T[],
  doseLogs: { medicationId: string; scheduledFor: Date; takenAt: Date }[],
  now: Date,
  timeZone: string
): TodaysDose<T>[] {
  const today = startOfDayInZone(now, timeZone);
  const { year, month, day } = getZonedParts(today, timeZone);
  const tomorrow = addCalendarDays(year, month, day, 1);
  const tomorrowStart = zonedDateToInstant(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, timeZone);
  return getDosesInRange(medications, doseLogs, today, tomorrowStart, now, timeZone);
}

export type DayAdherence = {
  date: Date;
  taken: number;
  missed: number;
  upcoming: number;
  total: number;
};

/** Buckets a flat dose list into per-calendar-day totals in `timeZone`, sorted chronologically. */
export function groupDosesByDay<T>(doses: TodaysDose<T>[], timeZone: string): DayAdherence[] {
  const byDay = new Map<string, DayAdherence>();

  for (const dose of doses) {
    const key = dayKey(dose.scheduledFor, timeZone);
    const bucket = byDay.get(key) ?? {
      date: startOfDayInZone(dose.scheduledFor, timeZone),
      taken: 0,
      missed: 0,
      upcoming: 0,
      total: 0,
    };
    bucket[dose.status] += 1;
    bucket.total += 1;
    byDay.set(key, bucket);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}
