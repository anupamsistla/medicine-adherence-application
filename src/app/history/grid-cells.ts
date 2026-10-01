import type { DayAdherence } from "@/lib/schedule";

export type GridCell = {
  key: string;
  label: string;
  href: string;
  taken: number;
  missed: number;
  total: number;
} | null;

/**
 * Day cells for a month grid, Monday-first, padded with blanks so the 1st
 * lands in the correct weekday column. `buildDayHref` receives the day's
 * 1-indexed day-of-month.
 */
export function buildMonthCells(
  dayBuckets: DayAdherence[],
  year: number,
  month: number,
  buildDayHref: (dayOfMonth: number) => string
): GridCell[] {
  const byDay = new Map(dayBuckets.map((b) => [b.date.getDate(), b]));

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday-first

  const cells: GridCell[] = Array.from({ length: leadingBlanks }, () => null);

  for (let day = 1; day <= daysInMonth; day++) {
    const bucket = byDay.get(day);
    cells.push({
      key: `day-${day}`,
      label: String(day),
      href: buildDayHref(day),
      taken: bucket?.taken ?? 0,
      missed: bucket?.missed ?? 0,
      total: bucket?.total ?? 0,
    });
  }

  return cells;
}
