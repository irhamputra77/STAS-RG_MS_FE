import { apiDelete, apiGet, apiPost } from "./api";

export const DEFAULT_DRAFT_REPORT_TYPES = [
  "Laporan TA",
  "Jurnal",
  "Laporan Kemajuan",
];

const STORAGE_KEY = "stas_draft_report_types_cache";

export type DraftReportTypeOption = {
  id: string;
  label: string;
  isActive?: boolean;
  sortOrder?: number;
};

function normalizeRows(rows: Array<any>) {
  const mapped = (rows || [])
    .map((item, index) => ({
      id: String(item?.id || `draft-type-${index}`),
      label: String(item?.label || "").trim(),
      isActive: item?.is_active !== false,
      sortOrder: Number(item?.sort_order ?? index),
    }))
    .filter((item) => item.label && item.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return mapped.length > 0
    ? mapped
    : DEFAULT_DRAFT_REPORT_TYPES.map((label, index) => ({
        id: `default-${index}`,
        label,
        isActive: true,
        sortOrder: index,
      }));
}

function cacheTypes(rows: DraftReportTypeOption[]) {
  if (typeof window === "undefined") return rows;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("draft-report-types:updated", { detail: rows }));
  return rows;
}

export function getCachedDraftReportTypes() {
  if (typeof window === "undefined") {
    return normalizeRows([]);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeRows([]);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return normalizeRows([]);
    return normalizeRows(parsed);
  } catch {
    return normalizeRows([]);
  }
}

export async function fetchDraftReportTypes() {
  try {
    const rows = await apiGet<Array<any>>("/draft-report-types");
    return cacheTypes(normalizeRows(rows));
  } catch {
    return getCachedDraftReportTypes();
  }
}

export async function createDraftReportType(label: string) {
  const payload = { label: String(label || "").trim() };
  await apiPost("/draft-report-types", payload);
  return fetchDraftReportTypes();
}

export async function deleteDraftReportType(id: string) {
  await apiDelete(`/draft-report-types/${id}`);
  return fetchDraftReportTypes();
}
