export const EXPIRY_ALERT_DAYS_BEFORE = 7;

export type ExpiryTrackedMedication = {
  expiryDate: Date | null;
  lastExpiryAlertSentAt: Date | null;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameCalendarDay(a: Date, b: Date) {
  const dayA = startOfDay(a);
  const dayB = startOfDay(b);
  return dayA.getTime() === dayB.getTime();
}

export function daysUntilExpiry(expiryDate: Date, now: Date): number {
  const today = startOfDay(now);
  const expiry = startOfDay(expiryDate);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

/**
 * True once a medication is within `daysBefore` days of its expiry date
 * (including after it has already expired), and hasn't already been
 * alerted about today.
 */
export function isExpiryAlertDue(
  medication: ExpiryTrackedMedication,
  now: Date,
  daysBefore: number = EXPIRY_ALERT_DAYS_BEFORE
): boolean {
  if (!medication.expiryDate) return false;

  if (daysUntilExpiry(medication.expiryDate, now) > daysBefore) return false;

  if (!medication.lastExpiryAlertSentAt) return true;
  return !isSameCalendarDay(medication.lastExpiryAlertSentAt, now);
}
