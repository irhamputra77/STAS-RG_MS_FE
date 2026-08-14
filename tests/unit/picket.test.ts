import test from "node:test";
import assert from "node:assert/strict";
import {
  getManualPicketSchedulePayloads,
  getManualPicketTaskPayload,
  getPicketScheduleGeneratePayload,
  getPicketAssignmentStatus,
  getPicketHolidayFromTodayResponse,
  hasPicketPhotoSubmission,
  isPicketHolidayResponse,
  mapPicketAssignment,
  mapPicketHoliday,
  mapPicketLeaveRequest,
  mapPicketSubmission,
  mapPicketSubmissionResult,
  mapPicketStudentDay,
  mapPicketTask,
  mapPicketTodayAssignment,
  shouldRequirePicketPhoto,
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
    autoCompletedByWfh: false,
    autoLeaveType: null,
    autoLeaveRequestId: null,
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

test("WFH on a picket day maps auto-completion aliases without treating it as a photo submission", () => {
  const snake = mapPicketAssignment({
    schedule_id: "SCH-WFH-1",
    assignment_id: "ASN-WFH-1",
    schedule_date: "2026-08-14",
    task_name: "Bersihkan lab",
    submitted: true,
    status: "Selesai",
    auto_completed_by_wfh: true,
    auto_leave_type: "wfh",
    auto_leave_request_id: "LEAVE-WFH-1",
    submission_id: null,
    submission_status: null,
    photo_url: null,
  });
  const camel = mapPicketAssignment({
    scheduleId: "SCH-WFH-2",
    scheduleDate: "2026-08-21",
    taskName: "Rapikan meja",
    submitted: true,
    status: "Selesai",
    autoCompletedByWfh: true,
    autoLeaveType: "wfh",
    autoLeaveRequestId: "LEAVE-WFH-2",
  });

  assert.equal(snake.autoCompletedByWfh, true);
  assert.equal(snake.autoLeaveType, "wfh");
  assert.equal(snake.autoLeaveRequestId, "LEAVE-WFH-1");
  assert.equal(camel.autoCompletedByWfh, true);
  assert.equal(camel.autoLeaveType, "wfh");
  assert.equal(camel.autoLeaveRequestId, "LEAVE-WFH-2");
  assert.equal(getPicketAssignmentStatus(snake), "Selesai Otomatis — WFH");
  assert.equal(hasPicketPhotoSubmission(snake), false);
  assert.equal(shouldRequirePicketPhoto(snake), false);
});

test("WFH outside a picket day keeps today's assignment empty", () => {
  assert.equal(mapPicketTodayAssignment({
    assignment: null,
    approvedLeave: {
      type: "wfh",
      date: "2026-08-14",
    },
  }), null);
});

test("ordinary picket photo submission keeps the Terkirim behavior", () => {
  const item = mapPicketAssignment({
    schedule_id: "SCH-PHOTO-1",
    schedule_date: "2026-08-14",
    task_name: "Bersihkan lab",
    submitted: true,
    submission_status: "Terkirim",
    submission_id: "SUB-PHOTO-1",
    photo_url: "/uploads/piket/photo-1.jpg",
  });

  assert.equal(item.autoCompletedByWfh, false);
  assert.equal(hasPicketPhotoSubmission(item), true);
  assert.equal(shouldRequirePicketPhoto(item), false);
  assert.equal(getPicketAssignmentStatus(item), "Terkirim");
  assert.equal(getPicketAssignmentStatus(mapPicketAssignment({
    schedule_id: "SCH-PHOTO-2",
    task_name: "Rapikan lab",
    submitted: true,
  })), "Terkirim");
});

test("approved non-WFH picket leave does not require a photo", () => {
  const item = mapPicketAssignment({
    schedule_id: "SCH-LEAVE-1",
    schedule_date: "2026-08-14",
    task_name: "Bersihkan lab",
    leave_status: "Disetujui",
    submitted: false,
  });

  assert.equal(item.autoCompletedByWfh, false);
  assert.equal(hasPicketPhotoSubmission(item), false);
  assert.equal(shouldRequirePicketPhoto(item), false);
  assert.equal(getPicketAssignmentStatus(item), "Dijadwalkan");
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

test("mapPicketLeaveRequest reads replacement schedule aliases", () => {
  const camel = mapPicketLeaveRequest({
    id: "LV-1",
    tanggal: "2026-05-24",
    alasan: "Sakit",
    replacementScheduleId: "SCH-RPL-1",
    replacementDate: "2026-05-26",
  });
  const snake = mapPicketLeaveRequest({
    id: "LV-2",
    date: "2026-05-25",
    reason: "Kegiatan kampus",
    replacement_schedule_id: "SCH-RPL-2",
    replacement_date: "2026-05-27",
  });

  assert.equal(camel.reason, "Sakit");
  assert.equal(camel.replacementScheduleId, "SCH-RPL-1");
  assert.equal(camel.replacementDate, "2026-05-26");
  assert.equal(snake.replacementScheduleId, "SCH-RPL-2");
  assert.equal(snake.replacementDate, "2026-05-27");
});

test("mapPicketStudentDay normalizes fixed weekday response", () => {
  assert.deepEqual(mapPicketStudentDay({
    student_id: "STD-1",
    student_name: "Alya",
    nim: "12345",
    day_id: 4,
    day_name: "Kamis",
    effective_from: "2026-08-11",
  }), {
    studentId: "STD-1",
    studentName: "Alya",
    nim: "12345",
    dayId: 4,
    dayName: "Kamis",
    assignedBy: null,
    assignedAt: null,
    effectiveFrom: "2026-08-11",
  });
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
    assignmentStatus: null,
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

test("getPicketScheduleGeneratePayload delegates fixed-day selection to backend", () => {
  const payload = getPicketScheduleGeneratePayload("2026-06-08", {
    peoplePerDay: 2,
    randomizeEnabled: true,
    weeklySchedule: [{ dayOfWeek: 1, studentIds: ["S1", "S2"] }],
  });

  assert.deepEqual(payload, { date: "2026-06-08" });
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
