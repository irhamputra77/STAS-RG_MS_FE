export const RESEARCH_HOURS_FULFILLED_STATUS = "Jam Riset Sudah Terpenuhi" as const;

type ResearchHoursFulfilledInput = {
  isResearchStudent: boolean;
  isHoliday: boolean;
  isPresent: boolean;
  isOnLeave: boolean;
  attendanceCutoffPassed: boolean;
  hasReportedAbsence: boolean;
  hasNoAttendanceInformation: boolean;
  hasAbsentLock?: boolean;
  explicitlyMeetsMinimum?: boolean;
  currentHours?: number | null;
  minimumHours?: number | null;
};

function finiteNonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function meetsResearchWeeklyMinimum({
  explicitlyMeetsMinimum = false,
  currentHours,
  minimumHours,
}: Pick<ResearchHoursFulfilledInput, "explicitlyMeetsMinimum" | "currentHours" | "minimumHours">) {
  if (explicitlyMeetsMinimum) return true;

  const current = finiteNonNegativeNumber(currentHours);
  const minimum = finiteNonNegativeNumber(minimumHours);
  return current !== null && minimum !== null && minimum > 0 && current >= minimum;
}

export function shouldShowResearchHoursFulfilledStatus(input: ResearchHoursFulfilledInput) {
  if (
    !input.isResearchStudent ||
    input.isHoliday ||
    input.isPresent ||
    input.isOnLeave
  ) {
    return false;
  }

  const isAbsentToday =
    input.hasReportedAbsence ||
    Boolean(input.hasAbsentLock) ||
    (input.attendanceCutoffPassed && input.hasNoAttendanceInformation);

  return isAbsentToday && meetsResearchWeeklyMinimum(input);
}
