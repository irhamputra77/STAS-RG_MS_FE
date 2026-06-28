import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextWeeklyReshuffleDate,
  getManualPicketSchedulePayloads,
  getManualPicketTaskPayload,
  getPicketScheduleGeneratePayload,
  getPicketHolidayFromTodayResponse,
  isPicketHolidayResponse,
  mapPicketAssignment,
  mapPicketHoliday,
  mapPicketLeaveRequest,
  mapPicketSubmission,
  mapPicketSubmissionResult,
  mapPicketTask,
  validatePicketPhoto,
} from "../../src/app/lib/picket";

test("mapPicketTask reads snake_case task fields", () => {
  assert.deepEqual(mapPicketTask({
    task_id: "T1",
    task_name: "Sapu ruang lab",
    description: "Area depan",
    is_active: true,
  }), {
    id: "T1",
    name: "Sapu ruang lab",
    description: "Area depan",
    active: true,
  });
});

test("mapPicketAssignment normalizes assignment and submission aliases", () => {
  assert.deepEqual(mapPicketAssignment({
    schedule_id: "SCH1",
    assignment_id: "A1",
    schedule_date: "2026-05-24",
    day_id: 0,
    day_name: "Minggu",
    student_id: "M1",
    student_name: "Ilham",
    task_name: "Bersihkan meja",
    has_submission: true,
    submission_id: "S1",
  }), {
    id: "SCH1",
    scheduleId: "SCH1",
    assignmentId: "A1",
    date: "2026-05-24",
    scheduleDate: "2026-05-24",
    dayId: 0,
    dayName: "Minggu",
    studentId: "M1",
    studentName: "Ilham",
    studentInitials: "IL",
    nim: null,
    taskId: null,
    taskName: "Bersihkan meja",
    taskDescription: null,
    status: "Dijadwalkan",
    notes: null,
    submissionStatus: null,
    leaveStatus: null,
    submitted: true,
    submissionId: "S1",
    photoUrl: null,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
    isHoliday: false,
    isExempt: false,
    holiday: null,
  });
});

test("mapPicketAssignment normalizes holiday and exemption aliases", () => {
  const item = mapPicketAssignment({
    schedule_id: "SCH-HOL-1",
    schedule_date: "2026-08-17",
    is_holiday: true,
    is_exempt: true,
    holiday: {
      holiday_id: "PKT-HOL-1",
      date: "2026-08-17",
      holiday_name: "Hari Kemerdekaan",
      notes: "Piket diliburkan",
    },
  });

  assert.equal(item.isHoliday, true);
  assert.equal(item.isExempt, true);
  assert.deepEqual(item.holiday, {
    id: "PKT-HOL-1",
    date: "2026-08-17",
    name: "Hari Kemerdekaan",
    notes: "Piket diliburkan",
  });
});

test("picket holiday helpers read top-level today response", () => {
  const response = {
    assignment: null,
    isHoliday: true,
    isExempt: true,
    holiday: {
      id: "PKT-HOL-2",
      date: "2026-08-17",
      name: "Hari Kemerdekaan",
    },
  };

  assert.equal(isPicketHolidayResponse(response), true);
  assert.deepEqual(getPicketHolidayFromTodayResponse(response), mapPicketHoliday(response.holiday));
});

test("mapPicketLeaveRequest reads Indonesian aliases", () => {
  assert.equal(mapPicketLeaveRequest({ tanggal: "2026-05-24", alasan: "Sakit" }).reason, "Sakit");
});

test("mapPicketAssignment reads submission review fields", () => {
  const item = mapPicketAssignment({
    schedule_id: "SCH2",
    student_id: "M2",
    task_name: "Rapikan lab",
    submission_id: "SUB2",
    submission_status: "Valid",
    reviewed_at: "2026-06-15T08:21:44.488Z",
    reviewed_by: "OP1",
    review_note: "Foto sudah sesuai",
  });

  assert.equal(item.reviewedAt, "2026-06-15T08:21:44.488Z");
  assert.equal(item.reviewedBy, "OP1");
  assert.equal(item.reviewNote, "Foto sudah sesuai");
});

test("mapPicketSubmission reads approval endpoint response", () => {
  assert.deepEqual(mapPicketSubmission({
    id: "SUB-1",
    scheduleId: "SCH-1",
    assignmentId: "ASN-1",
    studentId: "STD-1",
    studentName: "Alya",
    nim: "12345",
    taskName: "Bersihkan lab",
    date: "2026-08-17",
    photoUrl: "/uploads/piket/sub-1.jpg",
    submittedAt: "2026-08-17T01:00:00.000Z",
    status: "Terkirim",
    reviewNote: null,
  }), {
    id: "SUB-1",
    scheduleId: "SCH-1",
    assignmentId: "ASN-1",
    date: "2026-08-17",
    studentId: "STD-1",
    studentName: "Alya",
    studentInitials: "AL",
    nim: "12345",
    taskName: "Bersihkan lab",
    photoUrl: "https://ms-api.stas-rg.com/uploads/piket/sub-1.jpg",
    submittedAt: "2026-08-17T01:00:00.000Z",
    status: "Terkirim",
    reviewNote: null,
  });
});

test("mapPicketSubmissionResult reads nested submission response", () => {
  assert.deepEqual(mapPicketSubmissionResult({
    submission: {
      submission_id: "SUB1",
      review_status: "Terkirim",
      photo_url: "/uploads/piket.jpg",
      submitted_at: "2026-06-11T03:00:00.000Z",
    },
  }), {
    id: "SUB1",
    status: "Terkirim",
    photoUrl: "https://ms-api.stas-rg.com/uploads/piket.jpg",
    submittedAt: "2026-06-11T03:00:00.000Z",
  });
});

test("validatePicketPhoto rejects oversized images", () => {
  const file = { type: "image/png", size: 9 * 1024 * 1024 } as File;
  assert.match(validatePicketPhoto(file) || "", /maksimal 5 MB/);
});

test("validatePicketPhoto accepts extension fallback when mime type is empty", () => {
  const file = { name: "bukti-piket.JPG", type: "", size: 128 } as File;
  assert.equal(validatePicketPhoto(file), null);
});

test("validatePicketPhoto rejects unsupported image formats", () => {
  const file = { name: "bukti-piket.heic", type: "image/heic", size: 128 } as File;
  assert.match(validatePicketPhoto(file) || "", /JPG, PNG, atau WEBP/);
});

test("getNextWeeklyReshuffleDate returns next Monday when date is Sunday", () => {
  assert.equal(getNextWeeklyReshuffleDate("2026-06-07"), "2026-06-08");
  assert.equal(getNextWeeklyReshuffleDate("2026-06-08"), "2026-06-08");
});

test("getPicketScheduleGeneratePayload uses weekday studentIds and replaces existing schedule", () => {
  const payload = getPicketScheduleGeneratePayload("2026-06-08", {
    peoplePerDay: 2,
    randomizeEnabled: true,
    weeklySchedule: [{ dayOfWeek: 1, studentIds: ["S1", "S2"] }],
  });

  assert.deepEqual(payload, {
    date: "2026-06-08",
    studentIds: ["S1", "S2"],
    replaceExisting: true,
    randomize: false,
  });
});

test("getPicketScheduleGeneratePayload uses randomize fallback when no weekday rule exists", () => {
  const payload = getPicketScheduleGeneratePayload("2026-06-07", {
    peoplePerDay: 3,
    randomizeEnabled: false,
    weeklySchedule: [{ dayOfWeek: 1, studentIds: ["S1"] }],
  });

  assert.deepEqual(payload, {
    date: "2026-06-07",
    peoplePerDay: 3,
    randomize: false,
  });
});

test("getManualPicketSchedulePayloads creates one manual schedule payload per unique student", () => {
  const payloads = getManualPicketSchedulePayloads({
    scheduleDate: "2026-06-10",
    studentIds: ["S1", "S2", "S1", "", " S3 "],
    taskId: "T1",
    status: "Ditugaskan",
    notes: "  Piket pengganti  ",
  });

  assert.deepEqual(payloads, [
    { scheduleDate: "2026-06-10", studentId: "S1", taskId: "T1", status: "Ditugaskan", notes: "Piket pengganti" },
    { scheduleDate: "2026-06-10", studentId: "S2", taskId: "T1", status: "Ditugaskan", notes: "Piket pengganti" },
    { scheduleDate: "2026-06-10", studentId: "S3", taskId: "T1", status: "Ditugaskan", notes: "Piket pengganti" },
  ]);
});

test("getManualPicketSchedulePayloads defaults status and keeps notes nullable", () => {
  assert.deepEqual(getManualPicketSchedulePayloads({
    scheduleDate: "2026-06-10",
    studentIds: ["S1"],
    taskId: "T1",
  }), [
    { scheduleDate: "2026-06-10", studentId: "S1", taskId: "T1", status: "Ditugaskan", notes: null },
  ]);
});

test("getManualPicketTaskPayload trims manual task input", () => {
  assert.deepEqual(getManualPicketTaskPayload({
    name: "  Rapihkan barang ruang depan  ",
    description: "  Setelah jam piket selesai  ",
  }), {
    name: "Rapihkan barang ruang depan",
    description: "Setelah jam piket selesai",
    active: true,
  });
});
