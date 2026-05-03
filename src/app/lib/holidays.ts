import { formatDateYmd } from "./date";

export type HolidayItem = {
  date: string;
  name: string;
  type?: string;
  active?: boolean;
};

export function getJakartaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(date);
}

export function normalizeHolidayDate(value?: string | null) {
  const formatted = formatDateYmd(value);
  return formatted === "-" ? "" : formatted;
}

export function normalizeHolidays(value: unknown): HolidayItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        const date = normalizeHolidayDate(item);
        return date ? { date, name: "Tanggal Merah", type: "custom", active: true } : null;
      }

      const record = item as Record<string, unknown>;
      const date = normalizeHolidayDate(
        String(record.date || record.tanggal || record.holidayDate || record.holiday_date || "")
      );
      if (!date) return null;

      return {
        date,
        name: String(record.name || record.nama || record.title || record.keterangan || "Tanggal Merah"),
        type: String(record.type || record.jenis || "custom"),
        active: record.active === undefined ? true : Boolean(record.active),
      };
    })
    .filter((item): item is HolidayItem => Boolean(item))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findHolidayForDate(holidays: unknown, date = getJakartaDateKey()) {
  return normalizeHolidays(holidays).find((holiday) => holiday.active !== false && holiday.date === date) || null;
}

