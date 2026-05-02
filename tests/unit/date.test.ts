import test from "node:test";
import assert from "node:assert/strict";
import { formatDateReadable, formatDateYmd } from "../../src/app/lib/date";

test("formatDateYmd returns dash for empty values", () => {
  assert.equal(formatDateYmd(), "-");
  assert.equal(formatDateYmd(""), "-");
  assert.equal(formatDateYmd(null), "-");
});

test("formatDateYmd preserves YYYY-MM-DD input", () => {
  assert.equal(formatDateYmd("2026-05-01"), "2026-05-01");
});

test("formatDateYmd normalizes ISO date strings", () => {
  assert.equal(formatDateYmd("2026-05-01T08:30:00.000Z"), "2026-05-01");
});

test("formatDateYmd returns invalid raw input unchanged", () => {
  assert.equal(formatDateYmd("bukan tanggal"), "bukan tanggal");
});

test("formatDateReadable returns Indonesian readable date", () => {
  assert.equal(formatDateReadable("2026-05-01T00:00:00.000Z"), "1 Mei 2026");
});

