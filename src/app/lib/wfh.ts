export type WfhQuotaSource = "mentor" | "student" | "unknown";

export type WfhSummary = {
  wfhQuota: number;
  wfhUsed: number;
  wfhRemaining: number;
  manualWfhQuota: number;
  mentorWfhQuota: number;
  effectiveWfhQuota: number;
  wfhQuotaSource: WfhQuotaSource;
};

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeQuotaSource(value?: string | null): WfhQuotaSource {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "mentor") return "mentor";
  if (normalized === "student") return "student";
  return "unknown";
}

export function getWfhSummary(...sources: any[]): WfhSummary {
  const allSources = sources.filter(Boolean);

  const wfhQuota = readNumber(...allSources.flatMap((source) => [
    source?.wfhQuota,
    source?.wfh_quota,
  ]));
  const wfhUsed = readNumber(...allSources.flatMap((source) => [
    source?.wfhUsed,
    source?.wfh_used,
  ]));
  const wfhRemaining = readNumber(...allSources.flatMap((source) => [
    source?.wfhRemaining,
    source?.wfh_remaining,
    source?.sisaWfh,
    source?.sisa_wfh,
  ]));
  const manualWfhQuota = readNumber(...allSources.flatMap((source) => [
    source?.manualWfhQuota,
    source?.manual_wfh_quota,
    source?.manualQuota,
  ]));
  const mentorWfhQuota = readNumber(...allSources.flatMap((source) => [
    source?.mentorWfhQuota,
    source?.mentor_wfh_quota,
  ]));
  const effectiveWfhQuota = readNumber(...allSources.flatMap((source) => [
    source?.effectiveWfhQuota,
    source?.effective_wfh_quota,
    source?.wfhQuota,
    source?.wfh_quota,
  ]));
  const wfhQuotaSource = normalizeQuotaSource(readString(...allSources.flatMap((source) => [
    source?.wfhQuotaSource,
    source?.wfh_quota_source,
  ])));

  return {
    wfhQuota,
    wfhUsed,
    wfhRemaining,
    manualWfhQuota,
    mentorWfhQuota,
    effectiveWfhQuota,
    wfhQuotaSource,
  };
}

export function getWfhSourceMeta(source: WfhQuotaSource) {
  if (source === "mentor") {
    return {
      label: "Mengikuti mentor",
      helperText: "Jatah WFH mengikuti pengaturan mentor/pembimbing.",
    };
  }

  if (source === "student") {
    return {
      label: "Fallback mahasiswa",
      helperText: "Jatah WFH masih memakai fallback mahasiswa.",
    };
  }

  return {
    label: "Belum diketahui",
    helperText: "",
  };
}
