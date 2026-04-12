import { apiGet, apiGetBlob, downloadBlob } from "./api";

export type ExportFormat = "xlsx" | "csv" | "pdf";

export type ExportTemplate = {
  id: string;
  title: string;
  desc: string;
  period: string;
  formats: ExportFormat[];
  filters: {
    student: boolean;
    project: boolean;
    dateRange: boolean;
  };
  endpoint?: string;
};

export type ExportCustomParams = {
  type: string;
  format: ExportFormat;
  studentId?: string;
  projectId?: string;
  angkatan?: string;
  startDate?: string;
  endDate?: string;
};

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createExportFallbackFileName(template: ExportTemplate | null, format: ExportFormat) {
  const baseName = template?.title ? sanitizeFileNamePart(template.title) : "export-custom";
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${baseName || "export-custom"}-${dateStamp}.${format}`;
}

export function buildExportCustomQuery(params: ExportCustomParams) {
  const query = new URLSearchParams();
  query.set("type", params.type);
  query.set("format", params.format);

  if (params.studentId) query.set("studentId", params.studentId);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.angkatan) query.set("angkatan", params.angkatan);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);

  return query.toString();
}

export function fetchExportTemplates() {
  return apiGet<ExportTemplate[]>("/exports/templates");
}

export async function downloadCustomExport(params: ExportCustomParams, template: ExportTemplate | null) {
  const query = buildExportCustomQuery(params);
  const { blob, fileName } = await apiGetBlob(`/exports/custom?${query}`);
  const resolvedFileName = fileName || createExportFallbackFileName(template, params.format);
  downloadBlob(blob, resolvedFileName);
  return resolvedFileName;
}
