export type MedicationSchedule = {
  id: string;
  times: string[];
  daysOfWeek: number[];
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextOccurrenceForMedication(
  medication: MedicationSchedule,
  takenKeys: Set<string>,
  now: Date,
  searchDays: number
): Date | null {
  const today = startOfDay(now);
  const sortedTimes = [...medication.times].sort();

  for (let dayOffset = 0; dayOffset < searchDays; dayOffset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + dayOffset);
    const weekday = day.getDay();

    if (
      medication.daysOfWeek.length > 0 &&
      !medication.daysOfWeek.includes(weekday)
    ) {
      continue;
    }

    for (const time of sortedTimes) {
      const [hours, minutes] = time.split(":").map(Number);
      const occurrence = new Date(day);
      occurrence.setHours(hours, minutes, 0, 0);

      const key = `${medication.id}|${occurrence.toISOString()}`;
      if (takenKeys.has(key)) continue;

      return occurrence;
    }
  }

  return null;
}

export function getNextDose<T extends MedicationSchedule>(
  medications: T[],
  doseLogs: { medicationId: string; scheduledFor: Date }[],
  now: Date,
  searchDays = 7
): { medication: T; scheduledFor: Date } | null {
  const takenKeys = new Set(
    doseLogs.map(
      (log) => `${log.medicationId}|${log.scheduledFor.toISOString()}`
    )
  );

  let best: { medication: T; scheduledFor: Date } | null = null;

  for (const medication of medications) {
    if (medication.times.length === 0) continue;
    const occurrence = nextOccurrenceForMedication(
      medication,
      takenKeys,
      now,
      searchDays
    );
    if (occurrence && (!best || occurrence < best.scheduledFor)) {
      best = { medication, scheduledFor: occurrence };
    }
  }

  return best;
}

export function formatScheduledFor(date: Date, now: Date = new Date()): string {
  const today = startOfDay(now);
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const overdueSuffix = date < now ? " (overdue)" : "";

  if (diffDays === 0) return `Today at ${timeStr}${overdueSuffix}`;
  if (diffDays === 1) return `Tomorrow at ${timeStr}`;
  return `${date.toLocaleDateString([], { weekday: "long" })} at ${timeStr}`;
}
