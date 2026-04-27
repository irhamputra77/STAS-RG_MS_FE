export function formatDateYmd(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toISOString().slice(0, 10);
}

export function formatDateReadable(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "-";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}
