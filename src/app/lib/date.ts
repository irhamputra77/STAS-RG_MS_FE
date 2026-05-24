export function formatDateYmd(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  // Ensure date is represented in Asia/Jakarta timezone when normalizing.
  // Using Intl.DateTimeFormat with 'sv-SE' yields ISO-like YYYY-MM-DD in the target timezone.
  try {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(parsed);
  } catch {
    // Fallback to UTC-based ISO date if Intl fails for any reason.
    return parsed.toISOString().slice(0, 10);
  }
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
