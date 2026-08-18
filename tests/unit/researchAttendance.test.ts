import test from "node:test";
import assert from "node:assert/strict";
import {
  meetsResearchWeeklyMinimum,
  shouldShowResearchHoursFulfilledStatus,
} from "../../src/app/lib/researchAttendance";

test("research student absent after cutoff gets fulfilled status after meeting minimum hours", () => {
  assert.equal(
    shouldShowResearchHoursFulfilledStatus({
      isResearchStudent: true,
      isHoliday: false,
      isPresent: false,
      isOnLeave: false,
      attendanceCutoffPassed: true,
      hasReportedAbsence: false,
      hasNoAttendanceInformation: true,
      currentHours: 4,
      minimumHours: 4,
    }),
    true,
  );
});

test("research student does not get fulfilled status before reaching minimum hours", () => {
  assert.equal(
    shouldShowResearchHoursFulfilledStatus({
      isResearchStudent: true,
      isHoliday: false,
      isPresent: false,
      isOnLeave: false,
      attendanceCutoffPassed: true,
      hasReportedAbsence: false,
      hasNoAttendanceInformation: true,
      currentHours: 3.5,
      minimumHours: 4,
    }),
    false,
  );
});

test("present, leave, and holiday statuses keep priority over fulfilled research hours", () => {
  for (const override of [
    { isPresent: true, isOnLeave: false, isHoliday: false },
    { isPresent: false, isOnLeave: true, isHoliday: false },
    { isPresent: false, isOnLeave: false, isHoliday: true },
  ]) {
    assert.equal(
      shouldShowResearchHoursFulfilledStatus({
        isResearchStudent: true,
        attendanceCutoffPassed: true,
        hasReportedAbsence: true,
        hasNoAttendanceInformation: false,
        explicitlyMeetsMinimum: true,
        ...override,
      }),
      false,
    );
  }
});

test("explicit backend minimum flag is accepted without a local hour total", () => {
  assert.equal(
    meetsResearchWeeklyMinimum({ explicitlyMeetsMinimum: true }),
    true,
  );
});
