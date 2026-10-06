import { dayKey, getZonedParts } from "./timezone";

export const EXPIRY_ALERT_DAYS_BEFORE = 7;

export type ExpiryTrackedMedication = {
  expiryDate: Date | null;
  lastExpiryAlertSentAt: Date | null;
};

export function daysUntilExpiry(expiryDate: Date, now: Date, timeZone: string): number {
  const e = getZonedParts(expiryDate, timeZone);
  const n = getZonedParts(now, timeZone);
  return Math.round(
    (Date.UTC(e.year, e.month - 1, e.day) - Date.UTC(n.year, n.month - 1, n.day)) / 86_400_000
  );
}

/**
 * True once a medication is within `daysBefore` days of its expiry date
 * (including after it has already expired), and hasn't already been
 * alerted about today in `timeZone`.
 */
export function isExpiryAlertDue(
  medication: ExpiryTrackedMedication,
  now: Date,
  timeZone: string,
  daysBefore: number = EXPIRY_ALERT_DAYS_BEFORE
): boolean {
  if (!medication.expiryDate) return false;

  if (daysUntilExpiry(medication.expiryDate, now, timeZone) > daysBefore) return false;

  if (!medication.lastExpiryAlertSentAt) return true;
  return dayKey(medication.lastExpiryAlertSentAt, timeZone) !== dayKey(now, timeZone);
}
