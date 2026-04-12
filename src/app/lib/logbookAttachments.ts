import { resolveApiAssetUrl } from "./api";

export const MAX_LOGBOOK_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png", "zip"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip"
]);

export type LogbookAttachmentView = {
  name: string;
  size: number | null;
  sizeLabel: string;
  url: string | null;
};

export function formatAttachmentSize(size?: number | null) {
  if (!Number.isFinite(size) || Number(size) <= 0) return "-";

  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateLogbookAttachment(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const isAllowedExtension = ALLOWED_EXTENSIONS.has(extension);
  const isAllowedMime = !file.type || ALLOWED_MIME_TYPES.has(file.type);

  if (!isAllowedExtension && !isAllowedMime) {
    return "Format file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, JPEG, PNG, atau ZIP.";
  }

  if (file.size > MAX_LOGBOOK_ATTACHMENT_BYTES) {
    return "Ukuran lampiran maksimal 10 MB.";
  }

  return null;
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file lampiran."));
    reader.readAsDataURL(file);
  });
}

export function mapLogbookAttachment(entry: any): LogbookAttachmentView | null {
  const resolvedUrl = resolveApiAssetUrl(entry?.file_url || null);
  const fileName = entry?.file_name || entry?.attachment_name || null;
  const fileSize = Number(entry?.file_size);
  const normalizedSize = Number.isFinite(fileSize) ? fileSize : null;

  if (!resolvedUrl && !fileName) {
    return null;
  }

  return {
    name: fileName || "Lampiran logbook",
    size: normalizedSize,
    sizeLabel: formatAttachmentSize(normalizedSize),
    url: resolvedUrl
  };
}
