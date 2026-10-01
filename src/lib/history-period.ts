import { startOfDay } from "./schedule";

export type Period = "day" | "week" | "month";

export const PERIODS: Period[] = ["day", "week", "month"];

/** [start, end) for the calendar period containing `date`. Weeks run Monday–Sunday. */
export function getPeriodRange(period: Period, date: Date): { start: Date; end: Date } {
  const day = startOfDay(date);

  switch (period) {
    case "day": {
      const end = new Date(day);
      end.setDate(end.getDate() + 1);
      return { start: day, end };
    }
    case "week": {
      const daysSinceMonday = (day.getDay() + 6) % 7;
      const start = new Date(day);
      start.setDate(start.getDate() - daysSinceMonday);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case "month": {
      const start = new Date(day.getFullYear(), day.getMonth(), 1);
      const end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
      return { start, end };
    }
  }
}

/** A date guaranteed to fall in the period immediately before this one. */
export function getPreviousPeriodDate(period: Period, date: Date): Date {
  const { start } = getPeriodRange(period, date);
  const prev = new Date(start);
  prev.setDate(prev.getDate() - 1);
  return prev;
}

/** A date guaranteed to fall in the period immediately after this one. */
export function getNextPeriodDate(period: Period, date: Date): Date {
  return getPeriodRange(period, date).end;
}

export function formatPeriodLabel(period: Period, date: Date): string {
  const { start, end } = getPeriodRange(period, date);
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);

  switch (period) {
    case "day":
      return start.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "week":
      return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${lastDay.toLocaleDateString(
        [],
        { month: "short", day: "numeric", year: "numeric" }
      )}`;
    case "month":
      return start.toLocaleDateString([], { month: "long", year: "numeric" });
  }
}

/** YYYY-MM-DD, safe to round-trip through a URL search param. */
export function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return new Date(year, month - 1, day);
}

/** Same month/day, different year — clamped for e.g. Feb 29 landing on a non-leap year. */
export function withYear(date: Date, year: number): Date {
  const month = date.getMonth();
  const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(date.getDate(), daysInTargetMonth);
  return new Date(year, month, day);
}
