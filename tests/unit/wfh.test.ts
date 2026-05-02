import test from "node:test";
import assert from "node:assert/strict";
import { getWfhSourceMeta, getWfhSummary } from "../../src/app/lib/wfh";

test("getWfhSummary reads camelCase quota fields first", () => {
  assert.deepEqual(getWfhSummary({
    wfhQuota: "4",
    wfhUsed: "1",
    wfhRemaining: "3",
    manualWfhQuota: "2",
    mentorWfhQuota: "4",
    effectiveWfhQuota: "4",
    wfhQuotaSource: "mentor",
  }), {
    wfhQuota: 4,
    wfhUsed: 1,
    wfhRemaining: 3,
    manualWfhQuota: 2,
    mentorWfhQuota: 4,
    effectiveWfhQuota: 4,
    wfhQuotaSource: "mentor",
  });
});

test("getWfhSummary reads snake_case fallback fields", () => {
  assert.deepEqual(getWfhSummary({
    wfh_quota: 5,
    wfh_used: 2,
    sisa_wfh: 3,
    manual_wfh_quota: 1,
    mentor_wfh_quota: 5,
    effective_wfh_quota: 5,
    wfh_quota_source: "student",
  }), {
    wfhQuota: 5,
    wfhUsed: 2,
    wfhRemaining: 3,
    manualWfhQuota: 1,
    mentorWfhQuota: 5,
    effectiveWfhQuota: 5,
    wfhQuotaSource: "student",
  });
});

test("getWfhSummary combines multiple source objects by first available value", () => {
  assert.equal(getWfhSummary(null, { wfhUsed: 2 }, { wfhQuota: 6 }).wfhQuota, 6);
  assert.equal(getWfhSummary(null, { wfhUsed: 2 }, { wfhQuota: 6 }).wfhUsed, 2);
});

test("getWfhSourceMeta returns labels for known and unknown sources", () => {
  assert.equal(getWfhSourceMeta("mentor").label, "Mengikuti mentor");
  assert.equal(getWfhSourceMeta("student").label, "Fallback mahasiswa");
  assert.equal(getWfhSourceMeta("unknown").label, "Belum diketahui");
});

