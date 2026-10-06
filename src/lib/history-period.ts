import {
  addCalendarDays,
  dayKey,
  formatDay,
  getZonedParts,
  zonedDateToInstant,
} from "./timezone";

export type Period = "day" | "week" | "month";

export const PERIODS: Period[] = ["day", "week", "month"];

/** [start, end) for the calendar period containing `date` in `timeZone`. Weeks run Monday to Sunday. */
export function getPeriodRange(
  period: Period,
  date: Date,
  timeZone: string
): { start: Date; end: Date } {
  const { year, month, day, weekday } = getZonedParts(date, timeZone);

  switch (period) {
    case "day": {
      const next = addCalendarDays(year, month, day, 1);
      return {
        start: zonedDateToInstant(year, month, day, 0, 0, timeZone),
        end: zonedDateToInstant(next.year, next.month, next.day, 0, 0, timeZone),
      };
    }
    case "week": {
      const daysSinceMonday = (weekday + 6) % 7;
      const monday = addCalendarDays(year, month, day, -daysSinceMonday);
      const nextMonday = addCalendarDays(monday.year, monday.month, monday.day, 7);
      return {
        start: zonedDateToInstant(monday.year, monday.month, monday.day, 0, 0, timeZone),
        end: zonedDateToInstant(nextMonday.year, nextMonday.month, nextMonday.day, 0, 0, timeZone),
      };
    }
    case "month": {
      const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
      return {
        start: zonedDateToInstant(year, month, 1, 0, 0, timeZone),
        end: zonedDateToInstant(nextMonth.year, nextMonth.month, 1, 0, 0, timeZone),
      };
    }
  }
}

/** A date guaranteed to fall in the period immediately before this one. */
export function getPreviousPeriodDate(period: Period, date: Date, timeZone: string): Date {
  const { start } = getPeriodRange(period, date, timeZone);
  const { year, month, day } = getZonedParts(start, timeZone);
  const prev = addCalendarDays(year, month, day, -1);
  return zonedDateToInstant(prev.year, prev.month, prev.day, 0, 0, timeZone);
}

/** A date guaranteed to fall in the period immediately after this one. */
export function getNextPeriodDate(period: Period, date: Date, timeZone: string): Date {
  return getPeriodRange(period, date, timeZone).end;
}

export function formatPeriodLabel(period: Period, date: Date, timeZone: string): string {
  const { start, end } = getPeriodRange(period, date, timeZone);
  const lastDay = new Date(end.getTime() - 1);

  switch (period) {
    case "day":
      return formatDay(start, timeZone, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "week":
      return `${formatDay(start, timeZone, { month: "short", day: "numeric" })} – ${formatDay(
        lastDay,
        timeZone,
        { month: "short", day: "numeric", year: "numeric" }
      )}`;
    case "month":
      return formatDay(start, timeZone, { month: "long", year: "numeric" });
  }
}

/** YYYY-MM-DD in `timeZone`, safe to round-trip through a URL search param. */
export function toDateParam(date: Date, timeZone: string): string {
  return dayKey(date, timeZone);
}

export function parseDateParam(value: string | undefined, fallback: Date, timeZone: string): Date {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return zonedDateToInstant(year, month, day, 0, 0, timeZone);
}

/** Same month/day, different year. Clamped so that e.g. Feb 29 lands on a non-leap year. */
export function withYear(date: Date, year: number, timeZone: string): Date {
  const { month, day } = getZonedParts(date, timeZone);
  const daysInTargetMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return zonedDateToInstant(year, month, Math.min(day, daysInTargetMonth), 0, 0, timeZone);
}
