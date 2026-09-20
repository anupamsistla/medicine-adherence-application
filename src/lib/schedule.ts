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
};

/** Every dose scheduled for today, each labeled taken/missed/upcoming, in chronological order. */
export function getTodaysDoses<T extends MedicationSchedule>(
  medications: T[],
  doseLogs: { medicationId: string; scheduledFor: Date }[],
  now: Date
): TodaysDose<T>[] {
  const takenKeys = new Set(
    doseLogs.map((log) => occurrenceKey(log.medicationId, log.scheduledFor))
  );
  const today = startOfDay(now);

  const doses: TodaysDose<T>[] = [];
  for (const medication of medications) {
    for (const occurrence of occurrencesForDay(medication, today)) {
      const status: DoseStatus = takenKeys.has(
        occurrenceKey(medication.id, occurrence)
      )
        ? "taken"
        : occurrence < now
          ? "missed"
          : "upcoming";
      doses.push({ medication, scheduledFor: occurrence, status });
    }
  }

  return doses.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}
