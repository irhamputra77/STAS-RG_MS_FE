import { findHolidayForDate, normalizeHolidayDate } from "./holidays";

export type AccessLockLike = {
  reason?: string | null;
  lock_reason?: string | null;
  lockReason?: string | null;
  date?: string | null;
  reference_date?: string | null;
  referenceDate?: string | null;
};

export function getAccessLockReason(lock?: AccessLockLike | null) {
  return String(lock?.reason || lock?.lock_reason || lock?.lockReason || "").trim().toUpperCase();
}

export function getAccessLockDate(lock?: AccessLockLike | null) {
  return normalizeHolidayDate(lock?.date || lock?.reference_date || lock?.referenceDate || null);
}

export function isDailyAttendanceAccessLock(lock?: AccessLockLike | null) {
  return getAccessLockReason(lock) === "ATTENDANCE_ABSENT";
}

export function shouldSuppressHolidayAttendanceLock(
  lock: AccessLockLike | null | undefined,
  holidays: unknown,
  options?: { excludeHolidaysFromWorkdays?: boolean }
) {
  if (options?.excludeHolidaysFromWorkdays === false) return false;
  if (!isDailyAttendanceAccessLock(lock)) return false;

  const lockDate = getAccessLockDate(lock);
  if (!lockDate) return false;

  return Boolean(findHolidayForDate(holidays, lockDate));
}
