import { apiDelete, apiGet, apiPost } from "./api";

export const DEFAULT_DRAFT_REPORT_TYPES = [
  "Laporan TA",
  "Jurnal",
  "Laporan Kemajuan",
];

let draftReportTypesCache: DraftReportTypeOption[] | null = null;

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
  draftReportTypesCache = rows;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("draft-report-types:updated", { detail: rows }));
  }
  return rows;
}

export function getCachedDraftReportTypes() {
  return draftReportTypesCache ? normalizeRows(draftReportTypesCache) : normalizeRows([]);
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
