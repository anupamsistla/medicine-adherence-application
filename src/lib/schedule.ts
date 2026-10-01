export type MedicationSchedule = {
  id: string;
  times: string[];
  daysOfWeek: number[];
};

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function occurrenceKey(medicationId: string, occurrence: Date) {
  return `${medicationId}|${occurrence.toISOString()}`;
}

/** All scheduled occurrences for one medication on one calendar day (midnight-aligned `day`). */
function occurrencesForDay(medication: MedicationSchedule, day: Date): Date[] {
  const weekday = day.getDay();
  if (
    medication.daysOfWeek.length > 0 &&
    !medication.daysOfWeek.includes(weekday)
  ) {
    return [];
  }

  return [...medication.times].sort().map((time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const occurrence = new Date(day);
    occurrence.setHours(hours, minutes, 0, 0);
    return occurrence;
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
 * judged too — acceptable for a lightweight view, not an audit trail.
 */
export function getDosesInRange<T extends MedicationSchedule & { createdAt: Date }>(
  medications: T[],
  doseLogs: { medicationId: string; scheduledFor: Date; takenAt: Date }[],
  rangeStart: Date,
  rangeEnd: Date,
  now: Date
): TodaysDose<T>[] {
  const takenByKey = new Map(
    doseLogs.map((log) => [
      occurrenceKey(log.medicationId, log.scheduledFor),
      log.takenAt,
    ])
  );

  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  const doses: TodaysDose<T>[] = [];
  for (const medication of medications) {
    for (const day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
      for (const occurrence of occurrencesForDay(medication, day)) {
        if (occurrence < medication.createdAt) continue;

        const takenAt = takenByKey.get(occurrenceKey(medication.id, occurrence));
        const status: DoseStatus = takenAt
          ? "taken"
          : occurrence < now
            ? "missed"
            : "upcoming";
        doses.push({ medication, scheduledFor: occurrence, status, takenAt });
      }
    }
  }

  return doses.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

/** Every dose scheduled for today, each labeled taken/missed/upcoming, in chronological order. */
export function getTodaysDoses<T extends MedicationSchedule & { createdAt: Date }>(
  medications: T[],
  doseLogs: { medicationId: string; scheduledFor: Date; takenAt: Date }[],
  now: Date
): TodaysDose<T>[] {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getDosesInRange(medications, doseLogs, today, tomorrow, now);
}

export type DayAdherence = {
  date: Date;
  taken: number;
  missed: number;
  upcoming: number;
  total: number;
};

/** Buckets a flat dose list into per-calendar-day totals, sorted chronologically. */
export function groupDosesByDay<T>(doses: TodaysDose<T>[]): DayAdherence[] {
  const byDay = new Map<string, DayAdherence>();

  for (const dose of doses) {
    const day = startOfDay(dose.scheduledFor);
    const key = day.toISOString();
    const bucket = byDay.get(key) ?? {
      date: day,
      taken: 0,
      missed: 0,
      upcoming: 0,
      total: 0,
    };
    bucket[dose.status] += 1;
    bucket.total += 1;
    byDay.set(key, bucket);
  }

  return Array.from(byDay.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}
