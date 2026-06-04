import test from "node:test";
import assert from "node:assert/strict";
import {
  mapPicketAssignment,
  mapPicketLeaveRequest,
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

test("validatePicketPhoto rejects oversized images", () => {
  const file = { type: "image/png", size: 9 * 1024 * 1024 } as File;
  assert.match(validatePicketPhoto(file) || "", /maksimal 5 MB/);
});
