import test from "node:test";
import assert from "node:assert/strict";
import {
  getAccessLockDate,
  getAccessLockReason,
  isDailyAttendanceAccessLock,
  shouldSuppressHolidayAttendanceLock,
} from "../../src/app/lib/accessLocks";

const holidays = [
  { date: "2026-05-24", name: "Libur Kampus", active: true },
  { date: "2026-05-25", name: "Libur Nonaktif", active: false },
];

test("getAccessLockReason reads snake_case and normalizes reason", () => {
  assert.equal(getAccessLockReason({ lock_reason: "attendance_absent" }), "ATTENDANCE_ABSENT");
});

test("getAccessLockDate reads reference date aliases", () => {
  assert.equal(getAccessLockDate({ reference_date: "2026-05-24T01:00:00.000Z" }), "2026-05-24");
});

test("isDailyAttendanceAccessLock matches daily absent locks only", () => {
  assert.equal(isDailyAttendanceAccessLock({ reason: "ATTENDANCE_ABSENT" }), true);
  assert.equal(isDailyAttendanceAccessLock({ reason: "RISET_WEEKLY_HOURS_UNDER_TARGET" }), false);
});

test("shouldSuppressHolidayAttendanceLock suppresses absent lock on active holiday", () => {
  assert.equal(
    shouldSuppressHolidayAttendanceLock({ reason: "ATTENDANCE_ABSENT", date: "2026-05-24" }, holidays),
    true
  );
});

test("shouldSuppressHolidayAttendanceLock keeps non-holiday and non-absent locks", () => {
  assert.equal(
    shouldSuppressHolidayAttendanceLock({ reason: "ATTENDANCE_ABSENT", date: "2026-05-23" }, holidays),
    false
  );
  assert.equal(
    shouldSuppressHolidayAttendanceLock({ reason: "RISET_WEEKLY_HOURS_UNDER_TARGET", date: "2026-05-24" }, holidays),
    false
  );
});

test("shouldSuppressHolidayAttendanceLock honors excludeHolidaysFromWorkdays false", () => {
  assert.equal(
    shouldSuppressHolidayAttendanceLock(
      { reason: "ATTENDANCE_ABSENT", date: "2026-05-24" },
      holidays,
      { excludeHolidaysFromWorkdays: false }
    ),
    false
  );
});
