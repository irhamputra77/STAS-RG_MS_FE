import { resolveApiAssetUrl } from "./api";

export const PICKET_BLOCK_REASON = "PICKET_SUBMISSION_INVALID";
export const PICKET_AUTO_WFH_STATUS = "Selesai Otomatis — WFH";
export const MAX_PICKET_PHOTO_BYTES = 5 * 1024 * 1024;
const PICKET_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PICKET_PHOTO_EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

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
  autoCompletedByWfh: boolean;
  autoLeaveType?: string | null;
  autoLeaveRequestId?: string | null;
  submissionId?: string | null;
  photoUrl?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  isHoliday: boolean;
  isExempt: boolean;
  holiday?: PicketHoliday | null;
};

export type PicketHoliday = {
  id: string;
  date: string;
  name: string;
  notes?: string | null;
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
  assignmentStatus?: string | null;
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
  replacementScheduleId?: string | null;
  replacementDate?: string | null;
};

export type PicketStudentDay = {
  studentId: string;
  studentName: string;
  nim?: string | null;
  dayId: number;
  dayName?: string | null;
  assignedBy?: string | null;
  assignedAt?: string | null;
  effectiveFrom?: string | null;
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
  const extension = String(file.name || "").split(".").pop()?.toLowerCase() || "";
  const inferredType = PICKET_PHOTO_EXTENSION_TYPES[extension] || "";
  if (file.type && !PICKET_PHOTO_TYPES.includes(file.type)) {
    return "Foto piket harus berformat JPG, PNG, atau WEBP.";
  }
  if (!file.type && !inferredType) return "Foto piket harus berformat JPG, PNG, atau WEBP.";
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

export function getPicketScheduleGeneratePayload(date: string, _settings?: PicketScheduleSettings) {
  return { date };
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
    const fallbackToArrayBuffer = async () => {
      try {
        resolve(await fileToDataUrlFromArrayBuffer(file));
      } catch {
        reject(new Error("Gagal membaca foto piket. Coba pilih ulang foto dengan format JPG, PNG, atau WEBP."));
      }
    };
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (result.startsWith("data:")) resolve(result);
      else void fallbackToArrayBuffer();
    };
    reader.onerror = () => void fallbackToArrayBuffer();
    reader.readAsDataURL(file);
  });
}

async function fileToDataUrlFromArrayBuffer(file: File) {
  if (typeof file.arrayBuffer !== "function" || typeof btoa !== "function") {
    throw new Error("File reader unavailable");
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const extension = String(file.name || "").split(".").pop()?.toLowerCase() || "";
  const mime = file.type || PICKET_PHOTO_EXTENSION_TYPES[extension] || "image/jpeg";
  return `data:${mime};base64,${btoa(binary)}`;
}

export function ensurePicketPhotoPreviewable(file: File) {
  return new Promise<void>((resolve, reject) => {
    if (typeof URL === "undefined" || typeof Image === "undefined") {
      resolve();
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(previewUrl);
      resolve();
    };
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("Foto tidak dapat dibuka. Pastikan file benar-benar JPG, PNG, atau WEBP."));
    };
    image.src = previewUrl;
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
  const submission = row?.submission || null;
  const submissionId = row?.submission_id || row?.submissionId || submission?.id || submission?.submission_id || submission?.submissionId || null;
  const submissionStatus = row?.submission_status || row?.submissionStatus || submission?.status || submission?.review_status || submission?.reviewStatus || null;
  const photoUrl = resolveApiAssetUrl(
    row?.photo_url ||
    row?.photoUrl ||
    row?.submission_photo_url ||
    row?.submissionPhotoUrl ||
    row?.file_url ||
    row?.fileUrl ||
    submission?.photo_url ||
    submission?.photoUrl ||
    submission?.file_url ||
    submission?.fileUrl ||
    null
  );
  const submittedAt = row?.submitted_at || row?.submittedAt || submission?.submitted_at || submission?.submittedAt || submission?.created_at || submission?.createdAt || null;
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
    submissionStatus,
    leaveStatus: row?.leave_status || row?.leaveStatus || row?.picket_leave_status || row?.picketLeaveStatus || null,
    submitted: bool(row?.submitted ?? row?.has_submission ?? row?.hasSubmission, Boolean(submissionId || submission)),
    autoCompletedByWfh: bool(row?.auto_completed_by_wfh ?? row?.autoCompletedByWfh, false),
    autoLeaveType: row?.auto_leave_type ?? row?.autoLeaveType ?? null,
    autoLeaveRequestId: row?.auto_leave_request_id ?? row?.autoLeaveRequestId ?? null,
    submissionId,
    photoUrl,
    submittedAt,
    reviewedAt: row?.reviewed_at || row?.reviewedAt || row?.submission?.reviewed_at || row?.submission?.reviewedAt || null,
    reviewedBy: row?.reviewed_by || row?.reviewedBy || row?.submission?.reviewed_by || row?.submission?.reviewedBy || null,
    reviewNote: row?.review_note || row?.reviewNote || row?.submission?.review_note || row?.submission?.reviewNote || null,
    isHoliday: bool(row?.is_holiday ?? row?.isHoliday, false),
    isExempt: bool(row?.is_exempt ?? row?.isExempt, false),
    holiday: row?.holiday ? mapPicketHoliday(row.holiday) : null,
  };
}

export function mapPicketHoliday(row: any): PicketHoliday {
  const date = text(row?.date || row?.holiday_date || row?.holidayDate);
  return {
    id: text(row?.id || row?.holiday_id || row?.holidayId || `picket-holiday-${date || Date.now()}`),
    date,
    name: text(row?.name || row?.title || row?.holiday_name || row?.holidayName, "Hari Libur Piket"),
    notes: row?.notes || row?.note || row?.description || null,
  };
}

export function mapPicketStudentDay(row: any): PicketStudentDay {
  return {
    studentId: text(row?.student_id || row?.studentId || row?.id),
    studentName: text(row?.student_name || row?.studentName || row?.name, "Mahasiswa"),
    nim: row?.nim || row?.student_nim || row?.studentNim || null,
    dayId: Number(row?.day_id ?? row?.dayId ?? row?.day_of_week ?? row?.dayOfWeek),
    dayName: row?.day_name || row?.dayName || row?.label || null,
    assignedBy: row?.assigned_by || row?.assignedBy || null,
    assignedAt: row?.assigned_at || row?.assignedAt || null,
    effectiveFrom: row?.effective_from || row?.effectiveFrom || null,
  };
}

export function getPicketStudentDayFromTodayResponse(value: any): PicketStudentDay | null {
  const fixedDay = value?.fixedDay || value?.fixed_day;
  return fixedDay ? mapPicketStudentDay(fixedDay) : null;
}

export function getPicketHolidayFromTodayResponse(value: any): PicketHoliday | null {
  const holiday = value?.holiday || value?.assignment?.holiday || value?.todayAssignment?.holiday;
  return holiday ? mapPicketHoliday(holiday) : null;
}

export function isPicketHolidayResponse(value: any) {
  const assignment = value?.assignment || value?.todayAssignment || value;
  return bool(
    value?.isHoliday ?? value?.is_holiday ?? assignment?.isHoliday ?? assignment?.is_holiday,
    Boolean(getPicketHolidayFromTodayResponse(value))
  );
}

export function mapPicketTodayAssignment(value: any): PicketAssignment | null {
  const raw = value?.assignment || value?.todayAssignment || value;
  const hasAssignmentIdentity = Boolean(
    raw?.id ||
    raw?.assignment_id ||
    raw?.assignmentId ||
    raw?.schedule_id ||
    raw?.scheduleId ||
    raw?.task_name ||
    raw?.taskName ||
    raw?.auto_completed_by_wfh ||
    raw?.autoCompletedByWfh
  );
  if (!hasAssignmentIdentity) return null;
  return mapPicketAssignment({
    ...raw,
    isHoliday: raw?.isHoliday ?? raw?.is_holiday ?? value?.isHoliday ?? value?.is_holiday,
    isExempt: raw?.isExempt ?? raw?.is_exempt ?? value?.isExempt ?? value?.is_exempt,
    holiday: raw?.holiday || value?.holiday || null,
  });
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

export function isPicketAssignmentSubmitted(item: Pick<PicketAssignment, "submitted" | "submissionId" | "photoUrl" | "submittedAt"> | null | undefined) {
  return Boolean(item?.submitted || item?.submissionId || item?.photoUrl || item?.submittedAt);
}

export function hasPicketPhotoSubmission(
  item: Pick<PicketAssignment, "autoCompletedByWfh" | "submitted" | "submissionId" | "photoUrl" | "submittedAt"> | null | undefined
) {
  if (item?.autoCompletedByWfh) return false;
  return isPicketAssignmentSubmitted(item);
}

export function shouldRequirePicketPhoto(
  item: Pick<PicketAssignment, "autoCompletedByWfh" | "submitted" | "submissionId" | "photoUrl" | "submittedAt" | "isHoliday" | "isExempt" | "leaveStatus"> | null | undefined
) {
  if (!item || item.autoCompletedByWfh || item.isHoliday || item.isExempt) return false;
  if (String(item.leaveStatus || "").toLowerCase() === "disetujui") return false;
  return !hasPicketPhotoSubmission(item);
}

export function getPicketAssignmentStatus(item: PicketAssignment, fallback = "Ditugaskan") {
  if (item.autoCompletedByWfh) return PICKET_AUTO_WFH_STATUS;
  if (item.isHoliday || item.isExempt) return "Libur";
  if (isPicketAssignmentSubmitted(item)) return item.submissionStatus || "Terkirim";
  return item.status || fallback;
}

function submissionMatchesAssignment(submission: PicketSubmission, assignment: PicketAssignment) {
  const submissionKeys = [submission.scheduleId, submission.assignmentId].filter(Boolean).map(String);
  const assignmentKeys = [assignment.scheduleId, assignment.assignmentId, assignment.id].filter(Boolean).map(String);
  return submissionKeys.some((key) => assignmentKeys.includes(key));
}

export function mergePicketAssignmentsWithSubmissions(assignments: PicketAssignment[], submissions: PicketSubmission[]) {
  return assignments.map((assignment) => {
    if (isPicketAssignmentSubmitted(assignment)) return assignment;
    const submission = submissions.find((item) => submissionMatchesAssignment(item, assignment));
    if (!submission) return assignment;
    return {
      ...assignment,
      submitted: true,
      submissionId: submission.id || assignment.submissionId,
      submissionStatus: submission.status || assignment.submissionStatus || "Terkirim",
      photoUrl: submission.photoUrl || assignment.photoUrl,
      submittedAt: submission.submittedAt || assignment.submittedAt,
    };
  });
}

export function mapPicketSubmissionResult(value: any): PicketSubmissionResult {
  const row = value?.submission || value?.item || value?.data || value || {};
  const assignment = value?.assignment || row?.assignment || {};
  return {
    id: value?.submissionId || value?.submission_id || row?.id || row?.submission_id || row?.submissionId || null,
    status: value?.submissionStatus || value?.submission_status || row?.status || row?.review_status || row?.reviewStatus || null,
    assignmentStatus: assignment?.status || value?.assignmentStatus || value?.assignment_status || null,
    photoUrl: resolveApiAssetUrl(value?.photoUrl || value?.photo_url || row?.photo_url || row?.photoUrl || row?.file_url || row?.fileUrl || null),
    submittedAt: value?.submittedAt || value?.submitted_at || row?.submitted_at || row?.submittedAt || row?.created_at || row?.createdAt || null,
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
    replacementScheduleId: row?.replacement_schedule_id || row?.replacementScheduleId || null,
    replacementDate: row?.replacement_date || row?.replacementDate || null,
  };
}
