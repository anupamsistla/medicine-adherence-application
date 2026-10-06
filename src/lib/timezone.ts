export const DEFAULT_TIME_ZONE = "UTC";

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 (Sunday) - 6 (Saturday)
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS.indexOf(get("weekday")),
  };
}

function wallClockAsUtc(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** The instant at which the wall clock in `timeZone` reads year-month-day hour:minute. */
export function zonedDateToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = target - (wallClockAsUtc(getZonedParts(new Date(target), timeZone)) - target);
  // Re-check once in case the offset changed between the guess and the answer (DST boundaries).
  const offset = wallClockAsUtc(getZonedParts(new Date(instant), timeZone)) - instant;
  instant = target - offset;
  return new Date(instant);
}

export function startOfDayInZone(date: Date, timeZone: string): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return zonedDateToInstant(year, month, day, 0, 0, timeZone);
}

/** Calendar arithmetic on a year/month/day triple, independent of any zone. */
export function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function dayKey(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatTime(date: Date, timeZone: string): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

export function formatDay(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions = {}): string {
  return date.toLocaleDateString([], { timeZone, ...options });
}

/** Parses a YYYY-MM-DD string as midnight of that calendar day in `timeZone`. */
export function parseDateInput(value: string, timeZone: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return zonedDateToInstant(year, month, day, 0, 0, timeZone);
}
