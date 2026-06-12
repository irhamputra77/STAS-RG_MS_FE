import { resolveApiAssetUrl } from "./api";

export const PICKET_BLOCK_REASON = "PICKET_SUBMISSION_INVALID";
export const MAX_PICKET_PHOTO_BYTES = 5 * 1024 * 1024;

export type PicketTask = {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
};

export type PicketAssignment = {
  id: string;
  scheduleId: string;
  assignmentId: string;
  date: string;
  scheduleDate: string;
  dayId?: number | null;
  dayName?: string | null;
  studentId: string;
  studentName: string;
  studentInitials: string;
  nim?: string | null;
  taskId?: string | null;
  taskName: string;
  taskDescription?: string | null;
  status: string;
  notes?: string | null;
  submissionStatus?: string | null;
  leaveStatus?: string | null;
  submitted: boolean;
  submissionId?: string | null;
  photoUrl?: string | null;
  submittedAt?: string | null;
};

export type PicketSubmission = {
  id: string;
  scheduleId?: string | null;
  assignmentId?: string | null;
  date: string;
  studentId: string;
  studentName: string;
  studentInitials: string;
  nim?: string | null;
  taskName: string;
  photoUrl?: string | null;
  submittedAt?: string | null;
  status: string;
  reviewNote?: string | null;
};

export type PicketSubmissionResult = {
  id?: string | null;
  status?: string | null;
  photoUrl?: string | null;
  submittedAt?: string | null;
};

export type PicketLeaveRequest = {
  id: string;
  scheduleId?: string | null;
  assignmentId?: string | null;
  date: string;
  studentId: string;
  studentName: string;
  taskName?: string | null;
  reason: string;
  status: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
};

export function getJakartaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(date);
}

function text(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function bool(value: unknown, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

export function validatePicketPhoto(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (file.type && !allowed.includes(file.type)) {
    return "Foto piket harus berformat JPG, PNG, atau WEBP.";
  }
  if (file.size > MAX_PICKET_PHOTO_BYTES) {
    return "Ukuran foto piket maksimal 5 MB.";
  }
  return null;
}

export type PicketScheduleSettings = {
  peoplePerDay: number;
  randomizeEnabled: boolean;
  weeklySchedule: Array<{ dayOfWeek: number; studentIds: string[] }>;
};

export type ManualPicketScheduleInput = {
  scheduleDate: string;
  studentIds: string[];
  taskId: string;
  status?: string;
  notes?: string | null;
};

export type ManualPicketTaskInput = {
  name: string;
  description?: string | null;
};

export function getNextWeeklyReshuffleDate(date: string) {
  const current = new Date(`${date}T00:00:00`);
  if (current.getDay() !== 0) return date;
  current.setDate(current.getDate() + 1);
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPicketScheduleGeneratePayload(date: string, settings: PicketScheduleSettings) {
  const dateDay = new Date(`${date}T00:00:00`).getDay();
  const dayRule = settings.weeklySchedule.find((day) => Number(day.dayOfWeek) === dateDay);
  const weekdayStudentIds = Array.isArray(dayRule?.studentIds) ? dayRule.studentIds.filter(Boolean).map(String) : [];

  if (weekdayStudentIds.length > 0) {
    return {
      date,
      studentIds: weekdayStudentIds,
      replaceExisting: true,
      randomize: false,
    };
  }

  return {
    date,
    peoplePerDay: settings.peoplePerDay,
    randomize: settings.randomizeEnabled,
  };
}

export function getManualPicketSchedulePayloads(input: ManualPicketScheduleInput) {
  const studentIds = Array.from(new Set(input.studentIds.map((id) => String(id || "").trim()).filter(Boolean)));
  const notes = String(input.notes || "").trim();

  return studentIds.map((studentId) => ({
    scheduleDate: input.scheduleDate,
    studentId,
    taskId: input.taskId,
    status: input.status || "Ditugaskan",
    notes: notes || null,
  }));
}

export function getManualPicketTaskPayload(input: ManualPicketTaskInput) {
  return {
    name: String(input.name || "").trim(),
    description: String(input.description || "").trim() || null,
    active: true,
  };
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca foto piket."));
    reader.readAsDataURL(file);
  });
}

export function mapPicketTask(row: any): PicketTask {
  return {
    id: text(row?.id || row?.task_id || row?.taskId || `task-${row?.name || Date.now()}`),
    name: text(row?.name || row?.task_name || row?.taskName, "Tugas Piket"),
    description: row?.description || row?.deskripsi || null,
    active: bool(row?.active ?? row?.is_active ?? row?.isActive, true),
  };
}

export function mapPicketAssignment(row: any): PicketAssignment {
  const studentName = text(row?.student_name || row?.studentName || row?.name, "Mahasiswa");
  const scheduleId = text(row?.schedule_id || row?.scheduleId || row?.id || row?.assignment_id || row?.assignmentId || `schedule-${row?.date || Date.now()}`);
  const assignmentId = text(row?.assignment_id || row?.assignmentId || scheduleId);
  const date = text(row?.schedule_date || row?.scheduleDate || row?.date || row?.tanggal || row?.assignment_date || row?.assignmentDate, getJakartaDateKey());
  return {
    id: scheduleId,
    scheduleId,
    assignmentId,
    date,
    scheduleDate: date,
    dayId: row?.day_id ?? row?.dayId ?? null,
    dayName: row?.day_name || row?.dayName || null,
    studentId: text(row?.student_id || row?.studentId || row?.user_id || row?.userId),
    studentName,
    studentInitials: text(row?.student_initials || row?.studentInitials, studentName.slice(0, 2).toUpperCase()),
    nim: row?.nim || row?.student_nim || row?.studentNim || null,
    taskId: row?.task_id || row?.taskId || null,
    taskName: text(row?.task_name || row?.taskName || row?.task?.name, "Tugas Piket"),
    taskDescription: row?.task_description || row?.taskDescription || row?.task?.description || null,
    status: text(row?.status, "Dijadwalkan"),
    notes: row?.notes || null,
    submissionStatus: row?.submission_status || row?.submissionStatus || null,
    leaveStatus: row?.leave_status || row?.leaveStatus || row?.picket_leave_status || row?.picketLeaveStatus || null,
    submitted: bool(row?.submitted ?? row?.has_submission ?? row?.hasSubmission, Boolean(row?.submission_id || row?.submissionId)),
    submissionId: row?.submission_id || row?.submissionId || null,
    photoUrl: resolveApiAssetUrl(row?.photo_url || row?.photoUrl || row?.submission_photo_url || row?.submissionPhotoUrl || null),
    submittedAt: row?.submitted_at || row?.submittedAt || null,
  };
}

export function mapPicketSubmission(row: any): PicketSubmission {
  const studentName = text(row?.student_name || row?.studentName || row?.name, "Mahasiswa");
  const scheduleId = row?.schedule_id || row?.scheduleId || row?.assignment_id || row?.assignmentId || null;
  return {
    id: text(row?.id || row?.submission_id || row?.submissionId || `submission-${Date.now()}`),
    scheduleId,
    assignmentId: row?.assignment_id || row?.assignmentId || scheduleId,
    date: text(row?.date || row?.tanggal || row?.assignment_date || row?.assignmentDate, getJakartaDateKey()),
    studentId: text(row?.student_id || row?.studentId || row?.user_id || row?.userId),
    studentName,
    studentInitials: text(row?.student_initials || row?.studentInitials, studentName.slice(0, 2).toUpperCase()),
    nim: row?.nim || row?.student_nim || row?.studentNim || null,
    taskName: text(row?.task_name || row?.taskName || row?.task?.name, "Tugas Piket"),
    photoUrl: resolveApiAssetUrl(row?.photo_url || row?.photoUrl || row?.file_url || row?.fileUrl || null),
    submittedAt: row?.submitted_at || row?.submittedAt || null,
    status: text(row?.status || row?.review_status || row?.reviewStatus, "Terkirim"),
    reviewNote: row?.review_note || row?.reviewNote || null,
  };
}

export function mapPicketSubmissionResult(value: any): PicketSubmissionResult {
  const row = value?.submission || value?.item || value?.data || value || {};
  return {
    id: row?.id || row?.submission_id || row?.submissionId || null,
    status: row?.status || row?.review_status || row?.reviewStatus || null,
    photoUrl: resolveApiAssetUrl(row?.photo_url || row?.photoUrl || row?.file_url || row?.fileUrl || null),
    submittedAt: row?.submitted_at || row?.submittedAt || row?.created_at || row?.createdAt || null,
  };
}

export function mapPicketLeaveRequest(row: any): PicketLeaveRequest {
  const scheduleId = row?.schedule_id || row?.scheduleId || row?.assignment_id || row?.assignmentId || null;
  return {
    id: text(row?.id || row?.request_id || row?.requestId || `picket-leave-${Date.now()}`),
    scheduleId,
    assignmentId: row?.assignment_id || row?.assignmentId || scheduleId,
    date: text(row?.date || row?.tanggal || row?.assignment_date || row?.assignmentDate, getJakartaDateKey()),
    studentId: text(row?.student_id || row?.studentId || row?.user_id || row?.userId),
    studentName: text(row?.student_name || row?.studentName || row?.name, "Mahasiswa"),
    taskName: row?.task_name || row?.taskName || null,
    reason: text(row?.reason || row?.alasan, "-"),
    status: text(row?.status, "Menunggu"),
    reviewedBy: row?.reviewed_by || row?.reviewedBy || null,
    reviewedAt: row?.reviewed_at || row?.reviewedAt || null,
    reviewNote: row?.review_note || row?.reviewNote || null,
  };
}
