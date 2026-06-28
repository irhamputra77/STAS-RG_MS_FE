import { ProfileAvatar } from "../../molecules/ProfileAvatar";
import React from "react";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useConfirmDialog } from "../../molecules/ConfirmDialog";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "../../../lib/api";
import { HolidayItem, findHolidayForDate, normalizeHolidays } from "../../../lib/holidays";

type StudentRow = {
  id: string;
  nim: string;
  name: string;
  initials: string;
  prodi: string;
  status: string;
  tipe?: string | null;
  color: string;
  photoUrl?: string | null;
  photo_url?: string | null;
};

type LeaveRequestType = "cuti" | "izin" | "sakit" | "wfh";

type AttendanceMonitorToday = {
  date?: string;
  timezone?: string;
  currentTime?: string;
  lockVisibleAfter?: string;
  lockWindowOpen?: boolean;
  risetWeeklyHoursLockAfter?: string;
  risetWeeklyHoursLockWindowOpen?: boolean;
  risetWeeklyUnderHoursIds?: string[];
  risetWeeklyUnderHoursLockIds?: string[];
  weeklyHadirByStudentId?: Record<string, number>;
  holidayToday?: string | HolidayItem | null;
  isHoliday?: boolean;
  holidays?: HolidayItem[];
  excludeHolidaysFromWorkdays?: boolean;
  presentIds?: string[];
  attendanceStatusByStudentId?: Record<string, AttendanceStatus>;
  attendanceModeByStudentId?: Record<string, string>;
  leaveIds?: string[];
  leaveTypesByStudentId?: Record<string, LeaveRequestType>;
  absentIds?: string[];
  reportedAbsentIds?: string[];
  noInformationIds?: string[];
};

type AttendanceDetail = {
  month?: string;
  chartData?: Array<{ name: string; value: number; color: string }>;
  today?: {
    checkIn?: string;
    checkOut?: string;
    status?: string;
    autoCheckout?: boolean;
    checkoutSource?: string | null;
    autoCheckoutReason?: string | null;
  };
  history?: Array<{
    id?: string;
    date: string;
    in: string;
    out: string;
    duration: string;
    status: string;
    statusColor: string;
    autoCheckout?: boolean;
    checkoutSource?: string | null;
    autoCheckoutReason?: string | null;
    note?: string | null;
  }>;
};

type AttendanceStatus =
  | "Hadir"
  | "Cuti"
  | "Izin"
  | "Sakit"
  | "WFH"
  | "Libur"
  | "Tidak Hadir"
  | "Belum Ada Info";

type EditableAttendanceStatus = "" | AttendanceStatus;
type AttendanceEditorMode = "add" | "edit";

type AttendanceRecordDetail = {
  id: string;
  studentId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  in?: string | null;
  out?: string | null;
  duration?: string | null;
  status?: string | null;
  statusColor?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInAccuracy?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAccuracy?: number | null;
  autoCheckout?: boolean;
  checkoutSource?: string | null;
  autoCheckoutReason?: string | null;
  note?: string | null;
};

type AttendanceEditorState = {
  mode: AttendanceEditorMode;
  recordId?: string;
  studentId: string;
  studentName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: EditableAttendanceStatus;
  note: string;
  checkoutSource?: string | null;
  autoCheckout?: boolean;
  autoCheckoutReason?: string | null;
};

const AVATAR_COLORS = [
  "bg-[#8B6FFF] text-white",
  "bg-emerald-500 text-white",
  "bg-blue-500 text-white",
  "bg-amber-500 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
];

const INDONESIAN_MONTHS: Record<string, string> = {
  jan: "01",
  januari: "01",
  feb: "02",
  februari: "02",
  mar: "03",
  maret: "03",
  apr: "04",
  april: "04",
  mei: "05",
  jun: "06",
  juni: "06",
  jul: "07",
  juli: "07",
  agu: "08",
  agustus: "08",
  aug: "08",
  sep: "09",
  september: "09",
  okt: "10",
  oktober: "10",
  oct: "10",
  nov: "11",
  november: "11",
  des: "12",
  desember: "12",
  dec: "12",
};

function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function getDefaultDateForMonth(selectedMonth: string) {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);

  if (selectedMonth === currentMonth) {
    return today.toISOString().slice(0, 10);
  }

  return `${selectedMonth}-01`;
}

function parseHistoryDateLabel(dateLabel: string, selectedMonth: string) {
  const directMatch = dateLabel.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (directMatch) return dateLabel;

  const cleaned = dateLabel.includes(",")
    ? dateLabel.split(",").slice(1).join(",").trim()
    : dateLabel.trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length >= 3) {
    const day = parts[0].padStart(2, "0");
    const monthKey = parts[1].toLowerCase();
    const year = parts[2];
    const month = INDONESIAN_MONTHS[monthKey];

    if (month && /^\d{4}$/.test(year)) {
      return `${year}-${month}-${day}`;
    }
  }

  return getDefaultDateForMonth(selectedMonth);
}

function getCheckoutSourceLabel(source?: string | null) {
  switch (source) {
    case "OPERATOR_MANUAL":
      return "Input Admin";
    case "OPERATOR_EDIT":
      return "Diedit Admin";
    case "SYSTEM_AUTO":
      return "Auto Checkout Sistem";
    case "USER_GPS":
      return "GPS Mahasiswa";
    default:
      return "";
  }
}

function getCheckoutSourceClasses(source?: string | null) {
  switch (source) {
    case "OPERATOR_MANUAL":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "OPERATOR_EDIT":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "SYSTEM_AUTO":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "USER_GPS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getLeaveAttendanceStatus(type?: string | null): AttendanceStatus {
  switch (String(type || "").toLowerCase()) {
    case "izin":
      return "Izin";
    case "sakit":
      return "Sakit";
    case "wfh":
      return "WFH";
    case "cuti":
    default:
      return "Cuti";
  }
}

function getStatusBadgeClasses(status: AttendanceStatus | string | undefined) {
  switch (status) {
    case "Hadir":
    case "Selesai":
    case "Berlangsung":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Cuti":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Izin":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Sakit":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "WFH":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "Libur":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "Tidak Hadir":
    case "Belum Check-in":
      return "bg-red-100 text-red-600 border-red-200";
    case "Belum Ada Info":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getHistoryBadgeClasses(statusColor?: string) {
  switch (statusColor) {
    case "green":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "amber":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "blue":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "rose":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "sky":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "red":
      return "bg-red-100 text-red-600 border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function isSystemAutoCheckout(item?: { autoCheckout?: boolean; checkoutSource?: string | null }) {
  return Boolean(item?.autoCheckout || item?.checkoutSource === "SYSTEM_AUTO");
}

export default function KehadiranMahasiswa() {
  const { confirm, confirmDialog } = useConfirmDialog();

  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [monitor, setMonitor] = React.useState<AttendanceMonitorToday | null>(null);
  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthValue());
  const [detail, setDetail] = React.useState<AttendanceDetail | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"Semua" | AttendanceStatus>("Semua");
  const [overviewLoading, setOverviewLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editorLoading, setEditorLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editorError, setEditorError] = React.useState("");
  const [editorExistingRecordId, setEditorExistingRecordId] = React.useState<string | null>(null);
  const [editor, setEditor] = React.useState<AttendanceEditorState | null>(null);
  const [holidayToday, setHolidayToday] = React.useState<HolidayItem | null>(null);
  const [isHolidayToday, setIsHolidayToday] = React.useState(false);

  const loadOverview = React.useCallback(async () => {
    setOverviewLoading(true);
    setError("");

    try {
      const cacheKey = Date.now();

      const [studentRows, monitorRows, settings] = await Promise.all([
        apiGet<Array<any>>(`/students?_=${cacheKey}`),
        apiGet<AttendanceMonitorToday>(`/attendance/monitor/today?_=${cacheKey}`),
        apiGet<any>("/system-settings").catch(() => null),
      ]);
      const excludeHolidaysFromWorkdays = Boolean(
        monitorRows?.excludeHolidaysFromWorkdays ?? settings?.attendanceRules?.excludeHolidaysFromWorkdays ?? true
      );
      const settingHolidays = normalizeHolidays(
        monitorRows?.holidays || settings?.attendanceRules?.holidays || settings?.holidays
      );
      const normalizedMonitorHoliday = normalizeHolidays(monitorRows?.holidayToday ? [monitorRows.holidayToday] : [])
        .find((holiday) => holiday.active !== false) || null;
      const monitorHoliday =
        typeof monitorRows?.holidayToday === "string"
          ? { date: monitorRows.date || "", name: monitorRows.holidayToday, type: "system", active: true }
          : normalizedMonitorHoliday;
      const nextHoliday =
        monitorHoliday ||
        (monitorRows?.isHoliday ? findHolidayForDate(settingHolidays, monitorRows.date) : null) ||
        findHolidayForDate(settingHolidays, monitorRows?.date);
      const nextIsHoliday = Boolean(excludeHolidaysFromWorkdays && (monitorRows?.isHoliday || nextHoliday));

      const mappedStudents = (studentRows || []).map((item: any, index: number) => ({
        id: String(item?.id || ""),
        nim: item?.nim || "-",
        name: item?.name || "Mahasiswa",
        initials:
          item?.initials ||
          String(item?.name || "M")
            .split(" ")
            .map((chunk: string) => chunk[0] || "")
            .join("")
            .slice(0, 2)
            .toUpperCase() ||
          "M",
        prodi: item?.prodi || "-",
        status: item?.status || "Aktif",
        tipe: item?.tipe || item?.type || null,
        color: AVATAR_COLORS[index % AVATAR_COLORS.length],
        photoUrl: item?.photoUrl || item?.photo_url || null,
        photo_url: item?.photoUrl || item?.photo_url || null,
      }));

      setStudents(mappedStudents);
      setMonitor(monitorRows || null);
      setHolidayToday(nextHoliday || null);
      setIsHolidayToday(nextIsHoliday);
      setSelectedStudentId((current) => {
        if (current && mappedStudents.some((student) => student.id === current)) {
          return current;
        }

        return mappedStudents[0]?.id || "";
      });
    } catch (err: any) {
      setError(err?.message || "Gagal memuat monitor kehadiran mahasiswa.");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  React.useEffect(() => {
    const reloadOnHolidaySettingsChange = () => {
      void loadOverview();
    };

    window.addEventListener("stas:settings-updated", reloadOnHolidaySettingsChange);
    window.addEventListener("stas:attendance-monitor-updated", reloadOnHolidaySettingsChange);

    return () => {
      window.removeEventListener("stas:settings-updated", reloadOnHolidaySettingsChange);
      window.removeEventListener("stas:attendance-monitor-updated", reloadOnHolidaySettingsChange);
    };
  }, [loadOverview]);

  const loadDetail = React.useCallback(async () => {
    if (!selectedStudentId) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);

    try {
      const cacheKey = Date.now();

      const response = await apiGet<AttendanceDetail>(
        `/attendance?studentId=${encodeURIComponent(selectedStudentId)}&month=${encodeURIComponent(
          selectedMonth
        )}&_=${cacheKey}`
      );

      setDetail(response);
    } catch (err: any) {
      setDetail(null);
      setError(err?.message || "Gagal memuat detail kehadiran mahasiswa.");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedMonth, selectedStudentId]);

  React.useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const presentSet = React.useMemo(() => new Set(monitor?.presentIds || []), [monitor?.presentIds]);
  const leaveSet = React.useMemo(() => new Set(monitor?.leaveIds || []), [monitor?.leaveIds]);
  const lockedAbsentSet = React.useMemo(() => new Set(monitor?.absentIds || []), [monitor?.absentIds]);
  const reportedAbsentSet = React.useMemo(() => new Set(monitor?.reportedAbsentIds || []), [monitor?.reportedAbsentIds]);
  const noInformationSet = React.useMemo(() => new Set(monitor?.noInformationIds || []), [monitor?.noInformationIds]);
  const risetWeeklyUnderHoursSet = React.useMemo(() => new Set(monitor?.risetWeeklyUnderHoursIds || []), [monitor?.risetWeeklyUnderHoursIds]);
  const risetWeeklyUnderHoursLockSet = React.useMemo(() => new Set(monitor?.risetWeeklyUnderHoursLockIds || []), [monitor?.risetWeeklyUnderHoursLockIds]);
  const isRisetStudent = React.useCallback((student: StudentRow) => {
    return String(student.tipe || "").trim().toLowerCase() === "riset";
  }, []);

  const studentsWithStatus = React.useMemo(() => {
    return students.map((student) => {
      let todayStatus: AttendanceStatus = "Belum Ada Info";

      if (presentSet.has(student.id)) {
        todayStatus = monitor?.attendanceStatusByStudentId?.[student.id] === "WFH" ? "WFH" : "Hadir";
      } else if (leaveSet.has(student.id)) {
        todayStatus = getLeaveAttendanceStatus(monitor?.leaveTypesByStudentId?.[student.id]);
      } else if (isHolidayToday) {
        todayStatus = "Libur";
      } else if (!isRisetStudent(student) && (lockedAbsentSet.has(student.id) || reportedAbsentSet.has(student.id))) {
        todayStatus = "Tidak Hadir";
      } else if (!isRisetStudent(student) && !noInformationSet.has(student.id) && monitor?.lockWindowOpen) {
        todayStatus = "Tidak Hadir";
      }

      return {
        ...student,
        todayStatus,
      };
    });
  }, [
    leaveSet,
    lockedAbsentSet,
    monitor?.attendanceStatusByStudentId,
    monitor?.leaveTypesByStudentId,
    monitor?.lockWindowOpen,
    noInformationSet,
    presentSet,
    reportedAbsentSet,
    students,
    isHolidayToday,
    isRisetStudent,
  ]);

  const filteredStudents = React.useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return studentsWithStatus.filter((student) => {
      const matchesStatus = statusFilter === "Semua" || student.todayStatus === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.nim.toLowerCase().includes(normalizedQuery) ||
        student.prodi.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [search, statusFilter, studentsWithStatus]);

  const selectedStudent =
    studentsWithStatus.find((student) => student.id === selectedStudentId) || filteredStudents[0] || null;

  React.useEffect(() => {
    if (isHolidayToday && (statusFilter === "Tidak Hadir" || statusFilter === "Belum Ada Info")) {
      setStatusFilter("Semua");
    }
  }, [isHolidayToday, statusFilter]);

  React.useEffect(() => {
    if (!selectedStudent && filteredStudents.length > 0) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudent]);

  const summary = React.useMemo(() => {
    const presentCount = studentsWithStatus.filter((student) => ["Hadir", "WFH"].includes(student.todayStatus)).length;
    const leaveCount = studentsWithStatus.filter((student) => ["Cuti", "Izin", "Sakit"].includes(student.todayStatus)).length;
    const absentCount = studentsWithStatus.filter((student) => student.todayStatus === "Tidak Hadir").length;
    const noInformationCount = studentsWithStatus.filter((student) => student.todayStatus === "Belum Ada Info").length;
    const holidayCount = studentsWithStatus.filter((student) => student.todayStatus === "Libur").length;
    const risetWeeklyUnderHoursCount = students.filter((student) => isRisetStudent(student) && risetWeeklyUnderHoursSet.has(student.id)).length;
    const risetWeeklyLockedCount = students.filter((student) => isRisetStudent(student) && risetWeeklyUnderHoursLockSet.has(student.id)).length;
    const totalCount = students.length;

    return {
      presentCount,
      leaveCount,
      absentCount,
      noInformationCount,
      holidayCount,
      risetWeeklyUnderHoursCount,
      risetWeeklyLockedCount,
      totalCount,
    };
  }, [isRisetStudent, risetWeeklyUnderHoursLockSet, risetWeeklyUnderHoursSet, students, studentsWithStatus]);

  const reloadAttendanceData = React.useCallback(async () => {
    await Promise.all([loadOverview(), loadDetail()]);
  }, [loadOverview, loadDetail]);

  const openCreateModal = React.useCallback(
    (date?: string) => {
      const student = students.find((item) => item.id === selectedStudentId);
      if (!student) return;

      setEditorError("");
      setEditorExistingRecordId(null);
      setEditor({
        mode: "add",
        studentId: student.id,
        studentName: student.name,
        date: date || getDefaultDateForMonth(selectedMonth),
        checkIn: "",
        checkOut: "",
        status: "",
        note: "",
        checkoutSource: "OPERATOR_MANUAL",
        autoCheckout: false,
        autoCheckoutReason: null,
      });
    },
    [selectedMonth, selectedStudentId, students]
  );

  const openEditModal = React.useCallback(
    async (recordId: string) => {
      setEditorLoading(true);
      setEditorError("");
      setEditorExistingRecordId(null);

      try {
        const record = await apiGet<AttendanceRecordDetail>(`/attendance/records/${encodeURIComponent(recordId)}`);
        const student = students.find((item) => item.id === record.studentId) || selectedStudent;

        setEditor({
          mode: "edit",
          recordId: record.id,
          studentId: record.studentId,
          studentName: student?.name || "Mahasiswa",
          date: record.date,
          checkIn: String(record.checkIn || record.in || ""),
          checkOut: String(record.checkOut || record.out || ""),
          status: (record.status as EditableAttendanceStatus) || "",
          note: String(record.note || ""),
          checkoutSource: record.checkoutSource || null,
          autoCheckout: Boolean(record.autoCheckout),
          autoCheckoutReason: record.autoCheckoutReason || null,
        });
      } catch (err: any) {
        setError(err?.message || "Gagal memuat detail absensi.");
      } finally {
        setEditorLoading(false);
      }
    },
    [selectedStudent, students]
  );

  const closeEditor = React.useCallback(() => {
    setEditor(null);
    setEditorError("");
    setEditorExistingRecordId(null);
  }, []);

  const handleDeleteRecord = React.useCallback(
    async (recordId: string) => {
      const confirmed = await confirm({
        title: "Hapus data absensi?",
        description: "Data absensi yang dihapus tidak akan tampil lagi di riwayat mahasiswa ini.",
        confirmLabel: "Hapus",
        cancelLabel: "Batal",
        variant: "danger",
      });

      if (!confirmed) return;

      setError("");

      try {
        await apiDelete(`/attendance/records/${encodeURIComponent(recordId)}`);
        await reloadAttendanceData();
      } catch (err: any) {
        setError(err?.message || "Gagal menghapus data absensi.");
      }
    },
    [confirm, reloadAttendanceData]
  );

  const handleSaveRecord = React.useCallback(async () => {
    if (!editor) return;

    const hasTimes = Boolean(editor.checkIn || editor.checkOut);
    const hasStatus = Boolean(editor.status);

    if (!editor.date) {
      setEditorError("Tanggal absensi wajib diisi.");
      return;
    }

    if (!hasTimes && !hasStatus) {
      setEditorError("Minimal isi status atau check-in/check-out.");
      return;
    }

    if (editor.checkIn && !/^\d{2}:\d{2}$/.test(editor.checkIn)) {
      setEditorError("Format check-in harus HH:mm.");
      return;
    }

    if (editor.checkOut && !/^\d{2}:\d{2}$/.test(editor.checkOut)) {
      setEditorError("Format check-out harus HH:mm.");
      return;
    }

    if (editor.checkIn && editor.checkOut && editor.checkOut < editor.checkIn) {
      setEditorError("Check-out tidak boleh lebih kecil dari check-in.");
      return;
    }

    setSaving(true);
    setEditorError("");
    setEditorExistingRecordId(null);

    const payload = {
      studentId: editor.studentId,
      date: editor.date,
      checkIn: editor.checkIn || null,
      checkOut: editor.checkOut || null,
      status: editor.status || null,
      note: editor.note.trim() || null,
    };

    try {
      if (editor.mode === "add") {
        await apiPost("/attendance/records", payload);
      } else if (editor.recordId) {
        await apiPatch(`/attendance/records/${encodeURIComponent(editor.recordId)}`, payload);
      }

      await reloadAttendanceData();
      closeEditor();
    } catch (err: any) {
      const apiError = err instanceof ApiError ? err : null;

      if (apiError?.status === 409 && apiError.body?.existingRecordId) {
        setEditorExistingRecordId(String(apiError.body.existingRecordId));
      }

      setEditorError(err?.message || "Gagal menyimpan data absensi.");
    } finally {
      setSaving(false);
    }
  }, [closeEditor, editor, reloadAttendanceData]);

  return (
    <OperatorLayout title="Kehadiran Mahasiswa">
      <div className="flex flex-col gap-6 pb-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {isHolidayToday && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            Hari Libur{holidayToday?.name ? `: ${holidayToday.name}` : ""}. Mahasiswa yang tidak check-in tidak dihitung tidak hadir.
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Monitor Kehadiran Mahasiswa</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Pantau status hadir hari ini lalu lihat detail bulanan setiap mahasiswa.
            </p>
          </div>

          <button
            onClick={() => void loadOverview()}
            disabled={overviewLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {overviewLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Muat Ulang
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <div className="rounded-[16px] border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-blue-600">
              <Users size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Total Mahasiswa</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.totalCount}</p>
          </div>

          <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-emerald-600">
              <UserCheck size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Hadir Hari Ini</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.presentCount}</p>
          </div>

          <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-amber-600">
              <CalendarCheck size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Izin / Cuti / Sakit</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.leaveCount}</p>
          </div>

          <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-red-600">
              <UserMinus size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Tidak Hadir</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.absentCount}</p>
          </div>

          <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-rose-600">
              <CalendarDays size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Libur</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.holidayCount}</p>
          </div>

          <div className="rounded-[16px] border border-orange-200 bg-orange-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-orange-600">
              <Clock3 size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Jam Riset Kurang</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.risetWeeklyUnderHoursCount}</p>
            <p className="mt-1 text-[10px] font-bold text-orange-700">
              {summary.risetWeeklyLockedCount} terkunci mingguan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIM, atau prodi..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(isHolidayToday
                  ? (["Semua", "Hadir", "Cuti", "Izin", "Sakit", "WFH", "Libur"] as const)
                  : (["Semua", "Hadir", "Cuti", "Izin", "Sakit", "WFH", "Libur", "Tidak Hadir", "Belum Ada Info"] as const)
                ).map(
                  (item) => (
                    <button
                      key={item}
                      onClick={() => setStatusFilter(item)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
                        statusFilter === item
                          ? "border-[#0AB600] bg-[#0AB600] text-white"
                          : "border-border bg-slate-50 text-muted-foreground hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="max-h-[720px] overflow-y-auto">
              {overviewLoading ? (
                <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /> Memuat daftar mahasiswa...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Tidak ada mahasiswa yang cocok dengan filter saat ini.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isActive = student.id === selectedStudent?.id;

                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`flex w-full items-center gap-3 border-b border-border/70 px-5 py-3.5 text-left transition-colors last:border-b-0 ${
                        isActive ? "bg-[#F0FFF0]" : "hover:bg-slate-50"
                      }`}
                    >
                      <ProfileAvatar
                        name={student.name}
                        photoUrl={student.photoUrl || student.photo_url}
                        className="size-10"
                        fallbackClassName={`${student.color} text-xs font-black`}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{student.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {student.nim} · {student.prodi}{student.tipe ? ` · ${student.tipe}` : ""}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          {monitor?.weeklyHadirByStudentId?.[student.id] ?? 0}× minggu ini
                        </p>
                        {isRisetStudent(student) && risetWeeklyUnderHoursSet.has(student.id) && (
                          <p className="mt-0.5 text-[10px] font-black text-orange-600">
                            Jam Riset mingguan kurang{risetWeeklyUnderHoursLockSet.has(student.id) ? " - akses terkunci" : ""}
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusBadgeClasses(
                          student.todayStatus
                        )}`}
                      >
                        {student.todayStatus}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    {monitor?.date ? `Status hari ini · ${monitor.date}` : "Status hari ini"}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-foreground">
                    {selectedStudent?.name || "Pilih mahasiswa"}
                  </h2>
                  {selectedStudent && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedStudent.nim} · {selectedStudent.prodi}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openCreateModal()}
                    disabled={!selectedStudent}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0AB600] px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-[#089c00] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Plus size={16} />
                    Tambah Absensi Manual
                  </button>

                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-muted-foreground" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value)}
                      className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    />
                  </div>
                </div>
              </div>

              {!selectedStudent ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Pilih salah satu mahasiswa di panel kiri untuk melihat detail kehadiran.
                </div>
              ) : detailLoading ? (
                <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /> Memuat detail kehadiran...
                </div>
              ) : !detail ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Detail kehadiran belum tersedia untuk mahasiswa ini.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-3">
                    <div className="rounded-[16px] border border-border bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Clock3 size={15} />
                        <span className="text-xs font-black uppercase tracking-wide">Check-In Hari Ini</span>
                      </div>
                      <p className="text-2xl font-black text-foreground">{detail.today?.checkIn || "--:--"}</p>
                      {detail.today?.checkoutSource && (
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${getCheckoutSourceClasses(
                            detail.today.checkoutSource
                          )}`}
                        >
                          {getCheckoutSourceLabel(detail.today.checkoutSource)}
                        </span>
                      )}
                    </div>

                    <div className="rounded-[16px] border border-border bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Clock3 size={15} />
                        <span className="text-xs font-black uppercase tracking-wide">Check-Out Hari Ini</span>
                      </div>
                      <p className="text-2xl font-black text-foreground">{detail.today?.checkOut || "--:--"}</p>
                      {isSystemAutoCheckout(detail.today) && (
                        <span
                          title="Checkout dilakukan otomatis oleh sistem karena belum checkout manual sampai batas waktu."
                          className="mt-2 inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700"
                        >
                          Auto checkout sistem
                        </span>
                      )}
                    </div>

                    <div className="rounded-[16px] border border-border bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <MapPin size={15} />
                        <span className="text-xs font-black uppercase tracking-wide">Status Hari Ini</span>
                      </div>
                      <div className="flex flex-col items-start gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${getStatusBadgeClasses(
                            detail.today?.status
                          )}`}
                        >
                          {detail.today?.status || "Belum Check-in"}
                        </span>
                        {detail.today?.checkoutSource && (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${getCheckoutSourceClasses(
                              detail.today.checkoutSource
                            )}`}
                          >
                            {getCheckoutSourceLabel(detail.today.checkoutSource)}
                          </span>
                        )}
                        {isSystemAutoCheckout(detail.today) && (
                          <span
                            title="Checkout dilakukan otomatis oleh sistem karena belum checkout manual sampai batas waktu."
                            className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700"
                          >
                            Auto checkout sistem
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 px-5 pb-5 lg:grid-cols-4">
                    {(detail.chartData || []).map((item) => (
                      <div key={item.name} className="rounded-[16px] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                            {item.name}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-foreground">{item.value}</p>
                        <p className="text-[11px] text-muted-foreground">hari pada bulan ini</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border px-5 py-4">
                    <h3 className="text-sm font-black text-foreground">Riwayat Kehadiran</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-y border-border bg-slate-50">
                          <th className="px-5 py-3 font-black text-muted-foreground">Tanggal</th>
                          <th className="px-5 py-3 font-black text-muted-foreground">Check-In</th>
                          <th className="px-5 py-3 font-black text-muted-foreground">Check-Out</th>
                          <th className="px-5 py-3 font-black text-muted-foreground">Durasi</th>
                          <th className="px-5 py-3 font-black text-muted-foreground">Status</th>
                          <th className="px-5 py-3 text-right font-black text-muted-foreground">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(detail.history || []).map((row, index) => (
                          <tr key={`${row.date}-${index}`} className="hover:bg-slate-50">
                            <td className="px-5 py-3.5 font-medium text-foreground">{row.date}</td>
                            <td className="px-5 py-3.5 text-muted-foreground">{row.in}</td>
                            <td className="px-5 py-3.5 text-muted-foreground">
                              <div className="flex flex-col items-start gap-1">
                                <span>{row.out}</span>
                                {isSystemAutoCheckout(row) && row.out !== "-" && (
                                  <span
                                    title="Checkout dilakukan otomatis oleh sistem karena belum checkout manual sampai batas waktu."
                                    className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700"
                                  >
                                    Auto checkout sistem
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-muted-foreground">{row.duration}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${getHistoryBadgeClasses(
                                    row.statusColor
                                  )}`}
                                >
                                  {row.status}
                                </span>
                                {row.checkoutSource && (
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getCheckoutSourceClasses(
                                      row.checkoutSource
                                    )}`}
                                  >
                                    {getCheckoutSourceLabel(row.checkoutSource)}
                                  </span>
                                )}
                                {isSystemAutoCheckout(row) && (
                                  <span
                                    title="Checkout dilakukan otomatis oleh sistem karena belum checkout manual sampai batas waktu."
                                    className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700"
                                  >
                                    Checkout otomatis 22:00
                                  </span>
                                )}
                                {row.note && (
                                  <p className="max-w-[280px] text-[11px] font-medium leading-5 text-muted-foreground">
                                    Catatan: {row.note}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {row.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => void openEditModal(row.id!)}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
                                  >
                                    <Pencil size={13} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteRecord(row.id!)}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 transition-colors hover:bg-red-100"
                                  >
                                    <Trash2 size={13} />
                                    Hapus
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openCreateModal(parseHistoryDateLabel(row.date, selectedMonth))}
                                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100"
                                >
                                  <Plus size={13} />
                                  Tambah
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {(detail.history || []).length === 0 && (
                      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                        Belum ada riwayat kehadiran untuk bulan yang dipilih.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {(editor || editorLoading) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="relative w-full max-w-2xl rounded-[22px] border border-border bg-white shadow-2xl">
            <button
              onClick={closeEditor}
              disabled={saving}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              <X size={16} />
            </button>

            <div className="border-b border-border px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Absensi Mahasiswa</p>
              <h3 className="mt-1 text-xl font-black text-foreground">
                {editor?.mode === "edit" ? "Ubah Absensi Mahasiswa" : "Tambah Absensi Manual"}
              </h3>
              {editor?.studentName && <p className="mt-1 text-sm text-muted-foreground">{editor.studentName}</p>}
            </div>

            {editorLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Memuat detail absensi...
              </div>
            ) : editor ? (
              <div className="px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-black text-foreground">Tanggal</span>
                    <input
                      type="date"
                      value={editor.date}
                      onChange={(event) => {
                        setEditor((current) => (current ? { ...current, date: event.target.value } : current));
                      }}
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-black text-foreground">Status</span>
                    <select
                      value={editor.status}
                      onChange={(event) => {
                        setEditor((current) =>
                          current ? { ...current, status: event.target.value as EditableAttendanceStatus } : current
                        );
                      }}
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    >
                      <option value="">Pilih status otomatis</option>
                      <option value="Hadir">Hadir</option>
                      <option value="Cuti">Cuti</option>
                      <option value="Izin">Izin</option>
                      <option value="Sakit">Sakit</option>
                      <option value="WFH">WFH</option>
                      <option value="Libur">Libur</option>
                      <option value="Tidak Hadir">Tidak Hadir</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-black text-foreground">Check-In</span>
                    <input
                      type="time"
                      value={editor.checkIn}
                      onChange={(event) => {
                        setEditor((current) => (current ? { ...current, checkIn: event.target.value } : current));
                      }}
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-black text-foreground">Check-Out</span>
                    <input
                      type="time"
                      value={editor.checkOut}
                      onChange={(event) => {
                        setEditor((current) => (current ? { ...current, checkOut: event.target.value } : current));
                      }}
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    />
                  </label>
                </div>

                <label className="mt-4 flex flex-col gap-2">
                  <span className="text-sm font-black text-foreground">Catatan</span>
                  <textarea
                    value={editor.note}
                    onChange={(event) => {
                      setEditor((current) => (current ? { ...current, note: event.target.value } : current));
                    }}
                    rows={4}
                    placeholder="Tambahkan catatan jika diperlukan..."
                    className="resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  {editor.checkoutSource && (
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${getCheckoutSourceClasses(
                        editor.checkoutSource
                      )}`}
                    >
                      {getCheckoutSourceLabel(editor.checkoutSource)}
                    </span>
                  )}
                  {editor.autoCheckout && (
                    <span
                      title="Checkout dilakukan otomatis oleh sistem karena belum checkout manual sampai batas waktu."
                      className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700"
                    >
                      Auto checkout sistem
                    </span>
                  )}
                </div>

                {editorError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    <p>{editorError}</p>
                    {editorExistingRecordId && (
                      <button
                        onClick={() => void openEditModal(editorExistingRecordId)}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Pencil size={13} />
                        Edit data yang sudah ada
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    onClick={closeEditor}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => void handleSaveRecord()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0AB600] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#089c00] disabled:cursor-wait disabled:bg-[#7bd276]"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                    {editor.mode === "edit" ? "Simpan Perubahan" : "Tambah Absensi"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {confirmDialog}
    </OperatorLayout>
  );
}
