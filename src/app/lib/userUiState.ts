import { apiGet, apiPatch } from "./api";

export type ReadAttendanceWarningGroup = {
  date: string;
  ids: string[];
};

export type UserUiState = {
  readNotificationIds: string[];
  dismissedWarningIds: string[];
  readAttendanceWarningIds: ReadAttendanceWarningGroup[];
  preferences: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UserUiStatePatch = Partial<
  Pick<UserUiState, "readNotificationIds" | "dismissedWarningIds" | "readAttendanceWarningIds" | "preferences">
>;

const emptyUiState: UserUiState = {
  readNotificationIds: [],
  dismissedWarningIds: [],
  readAttendanceWarningIds: [],
  preferences: {},
  createdAt: null,
  updatedAt: null,
};

let cachedUiState: UserUiState | null = null;
let uiStateRequest: Promise<UserUiState> | null = null;

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => String(value)).filter(Boolean)));
}

function normalizeUiState(raw: any): UserUiState {
  return {
    readNotificationIds: uniqueStrings(raw?.readNotificationIds),
    dismissedWarningIds: uniqueStrings(raw?.dismissedWarningIds),
    readAttendanceWarningIds: Array.isArray(raw?.readAttendanceWarningIds)
      ? raw.readAttendanceWarningIds
          .map((item: any) => ({
            date: String(item?.date || ""),
            ids: uniqueStrings(item?.ids),
          }))
          .filter((item: ReadAttendanceWarningGroup) => item.date)
      : [],
    preferences: raw?.preferences && typeof raw.preferences === "object" && !Array.isArray(raw.preferences)
      ? raw.preferences
      : {},
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null,
  };
}

function dispatchUiStateUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("stas:ui-state-updated"));
  }
}

export function getCachedUserUiState() {
  return cachedUiState || emptyUiState;
}

export async function getUserUiState({ force = false }: { force?: boolean } = {}) {
  if (cachedUiState && !force) return cachedUiState;
  if (uiStateRequest && !force) return uiStateRequest;

  uiStateRequest = apiGet<UserUiState>("/user-ui-state")
    .then((response) => {
      cachedUiState = normalizeUiState(response);
      dispatchUiStateUpdated();
      return cachedUiState;
    })
    .catch(() => {
      cachedUiState = cachedUiState || emptyUiState;
      return cachedUiState;
    })
    .finally(() => {
      uiStateRequest = null;
    });

  return uiStateRequest;
}

export async function patchUserUiState(patch: UserUiStatePatch) {
  cachedUiState = normalizeUiState({
    ...getCachedUserUiState(),
    ...patch,
    preferences: {
      ...getCachedUserUiState().preferences,
      ...(patch.preferences || {}),
    },
  });
  dispatchUiStateUpdated();

  try {
    const response = await apiPatch<UserUiState>("/user-ui-state", patch);
    cachedUiState = normalizeUiState(response);
  } catch {
    // Keep optimistic state in memory if the persist request fails.
  }

  dispatchUiStateUpdated();
  return getCachedUserUiState();
}

export function mergeIds(existing: string[], additions: string[]) {
  return Array.from(new Set([...(existing || []), ...(additions || [])].map(String).filter(Boolean)));
}

export function getReadAttendanceWarningIdsForDate(state: UserUiState, date: string) {
  return state.readAttendanceWarningIds.find((item) => item.date === date)?.ids || [];
}

export function setReadAttendanceWarningIdsForDate(
  groups: ReadAttendanceWarningGroup[],
  date: string,
  ids: string[]
) {
  const nextGroups = (groups || []).filter((item) => item.date !== date);
  nextGroups.push({ date, ids: mergeIds([], ids) });
  return nextGroups;
}
