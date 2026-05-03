import test from "node:test";
import assert from "node:assert/strict";
import {
  findHolidayForDate,
  getJakartaDateKey,
  normalizeHolidayDate,
  normalizeHolidays,
} from "../../src/app/lib/holidays";

test("normalizeHolidayDate returns empty string for empty or invalid empty values", () => {
  assert.equal(normalizeHolidayDate(""), "");
  assert.equal(normalizeHolidayDate(null), "");
});

test("normalizeHolidays accepts string dates and object aliases", () => {
  assert.deepEqual(normalizeHolidays([
    "2026-05-01",
    { tanggal: "2026-05-03", nama: "Libur Kampus", jenis: "campus" },
  ]), [
    { date: "2026-05-01", name: "Tanggal Merah", type: "custom", active: true },
    { date: "2026-05-03", name: "Libur Kampus", type: "campus", active: true },
  ]);
});

test("normalizeHolidays sorts dates and preserves inactive holidays", () => {
  assert.deepEqual(normalizeHolidays([
    { date: "2026-05-03", name: "Cuti Bersama", active: false },
    { date: "2026-05-01", name: "Hari Buruh" },
  ]), [
    { date: "2026-05-01", name: "Hari Buruh", type: "custom", active: true },
    { date: "2026-05-03", name: "Cuti Bersama", type: "custom", active: false },
  ]);
});

test("findHolidayForDate ignores inactive holidays", () => {
  const holidays = [
    { date: "2026-05-01", name: "Hari Buruh", active: false },
    { date: "2026-05-02", name: "Libur Kampus", active: true },
  ];

  assert.equal(findHolidayForDate(holidays, "2026-05-01"), null);
  assert.deepEqual(findHolidayForDate(holidays, "2026-05-02"), {
    date: "2026-05-02",
    name: "Libur Kampus",
    type: "custom",
    active: true,
  });
});

test("getJakartaDateKey formats Date in Asia/Jakarta calendar day", () => {
  assert.equal(getJakartaDateKey(new Date("2026-05-01T18:00:00.000Z")), "2026-05-02");
});

