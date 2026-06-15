import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextWeeklyReshuffleDate,
  getManualPicketSchedulePayloads,
  getManualPicketTaskPayload,
  getPicketScheduleGeneratePayload,
  mapPicketAssignment,
  mapPicketLeaveRequest,
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
  });
});

test("mapPicketLeaveRequest reads Indonesian aliases", () => {
  assert.equal(mapPicketLeaveRequest({ tanggal: "2026-05-24", alasan: "Sakit" }).reason, "Sakit");
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
