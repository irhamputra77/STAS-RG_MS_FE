import React from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ClipboardCheck,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { Layout } from "../../templates/Layout";
import { apiDelete, apiGet, apiPatch, apiPost, getStoredUser } from "../../../lib/api";
import {
  PicketAssignment,
  PicketLeaveRequest,
  PicketSubmission,
  PicketTask,
  getJakartaDateKey,
  mapPicketAssignment,
  mapPicketLeaveRequest,
  mapPicketSubmission,
  mapPicketTask,
} from "../../../lib/picket";

type StudentOption = {
  id: string;
  name: string;
  nim?: string | null;
  initials: string;
  tipe?: string | null;
};

type PicketSettings = {
  peoplePerDay: number;
  randomizeEnabled: boolean;
  weeklySchedule: WeeklyPicketDay[];
};

type WeeklyPicketDay = {
  dayOfWeek: number;
  label: string;
  enabled: boolean;
  peoplePerDay: number;
  studentIds: string[];
};

const WEEKDAY_OPTIONS: WeeklyPicketDay[] = [
  { dayOfWeek: 1, label: "Senin", enabled: true, peoplePerDay: 2, studentIds: [] },
  { dayOfWeek: 2, label: "Selasa", enabled: true, peoplePerDay: 2, studentIds: [] },
  { dayOfWeek: 3, label: "Rabu", enabled: true, peoplePerDay: 2, studentIds: [] },
  { dayOfWeek: 4, label: "Kamis", enabled: true, peoplePerDay: 2, studentIds: [] },
  { dayOfWeek: 5, label: "Jumat", enabled: true, peoplePerDay: 2, studentIds: [] },
];

function normalizeStudentIds(value: any): string[] {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item) => String(item?.studentId || item?.student_id || item?.id || item || ""))
    .filter(Boolean);
}

function normalizeWeeklySchedule(value: any, fallbackPeoplePerDay = 2): WeeklyPicketDay[] {
  const rows = Array.isArray(value) ? value : [];
  return WEEKDAY_OPTIONS.map((day) => {
    const match = rows.find((item: any) => Number(item?.dayOfWeek ?? item?.day_of_week ?? item?.weekday) === day.dayOfWeek);
    return {
      ...day,
      enabled: true,
      peoplePerDay: Number(match?.peoplePerDay ?? match?.people_per_day ?? match?.quota ?? fallbackPeoplePerDay) || fallbackPeoplePerDay,
      studentIds: normalizeStudentIds(match?.studentIds ?? match?.student_ids ?? match?.memberIds ?? match?.member_ids ?? match?.students ?? match?.members),
    };
  });
}

const statusStyle: Record<string, string> = {
  Menunggu: "border-amber-200 bg-amber-50 text-amber-700",
  Disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Ditolak: "border-red-200 bg-red-50 text-red-600",
  Terkirim: "border-blue-200 bg-blue-50 text-blue-700",
  Valid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Bermasalah: "border-red-200 bg-red-50 text-red-600",
};

function normalizeStudent(row: any): StudentOption {
  const name = row?.name || row?.student_name || row?.studentName || "Mahasiswa";
  return {
    id: String(row?.id || row?.student_id || row?.studentId || ""),
    name,
    nim: row?.nim || row?.student_nim || row?.studentNim || null,
    initials: row?.initials || name.slice(0, 2).toUpperCase(),
    tipe: row?.tipe || row?.student_type || row?.studentType || null,
  };
}

function Badge({ status }: { status?: string | null }) {
  const label = status || "-";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyle[label] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {label}
    </span>
  );
}

function getPicketScheduleErrorMessage(err: any, fallback: string) {
  const message = String(err?.body?.message || err?.message || "").trim();
  if (/belum ada tugas piket aktif/i.test(message)) {
    return "Tambahkan atau aktifkan tugas piket terlebih dahulu sebelum resync.";
  }
  return message || fallback;
}

export default function PiketOperator() {
  const user = getStoredUser();
  const isStudentPicShell = user?.role === "mahasiswa";
  const [date, setDate] = React.useState(getJakartaDateKey());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");
  const [settings, setSettings] = React.useState<PicketSettings>({
    peoplePerDay: 2,
    randomizeEnabled: true,
    weeklySchedule: normalizeWeeklySchedule([], 2),
  });
  const [tasks, setTasks] = React.useState<PicketTask[]>([]);
  const [taskName, setTaskName] = React.useState("");
  const [taskDescription, setTaskDescription] = React.useState("");
  const [students, setStudents] = React.useState<StudentOption[]>([]);
  const [managerIds, setManagerIds] = React.useState<string[]>([]);
  const [assignments, setAssignments] = React.useState<PicketAssignment[]>([]);
  const [submissions, setSubmissions] = React.useState<PicketSubmission[]>([]);
  const [leaveRequests, setLeaveRequests] = React.useState<PicketLeaveRequest[]>([]);
  const [query, setQuery] = React.useState("");
  const [studentQuery, setStudentQuery] = React.useState("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = React.useState(1);
  const [isEditingWeekdayMembers, setIsEditingWeekdayMembers] = React.useState(false);
  const [allowed, setAllowed] = React.useState(user?.role === "operator");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    let loadedSettings: PicketSettings | null = null;
    try {
      if (user?.role === "mahasiswa") {
        const managerCheck = await apiGet<any>("/picket/managers/me");
        const isManager = Boolean(managerCheck?.isManager);
        setAllowed(isManager);
        if (!isManager) {
          setError("Anda bukan penanggung jawab piket.");
          setLoading(false);
          return null;
        }
      } else {
        setAllowed(true);
      }

      const [settingsRes, taskRes, studentRes, managerRes, overviewRes, leaveRes] = await Promise.allSettled([
        apiGet<any>("/picket/settings"),
        apiGet<any>("/picket/tasks"),
        apiGet<any[]>("/students"),
        apiGet<any>("/picket/managers"),
        apiGet<any>(`/picket/operator/overview?date=${encodeURIComponent(date)}&_=${Date.now()}`),
        apiGet<any>(`/picket/leave-requests?date=${encodeURIComponent(date)}&_=${Date.now()}`),
      ]);

      if (settingsRes.status === "fulfilled") {
        const raw = settingsRes.value?.settings || settingsRes.value || {};
        const peoplePerDay = Number(raw.peoplePerDay ?? raw.people_per_day ?? raw.dailyQuota ?? raw.daily_quota) || 2;
        loadedSettings = {
          peoplePerDay,
          randomizeEnabled: Boolean(raw.randomizeEnabled ?? raw.randomize_enabled ?? true),
          weeklySchedule: normalizeWeeklySchedule(raw.weeklySchedule ?? raw.weekly_schedule ?? raw.recurringSchedule ?? raw.recurring_schedule, peoplePerDay),
        };
        setSettings(loadedSettings);
      }

      if (taskRes.status === "fulfilled") {
        const rows = Array.isArray(taskRes.value) ? taskRes.value : taskRes.value?.tasks || [];
        setTasks(rows.map(mapPicketTask));
      }

      if (studentRes.status === "fulfilled") {
        setStudents((studentRes.value || []).map(normalizeStudent).filter((item) => item.id));
      }

      if (managerRes.status === "fulfilled") {
        const rows = Array.isArray(managerRes.value) ? managerRes.value : managerRes.value?.managers || managerRes.value?.studentIds || [];
        setManagerIds(rows.map((item: any) => String(item?.student_id || item?.studentId || item?.id || item)).filter(Boolean));
      }

      if (overviewRes.status === "fulfilled") {
        const raw = overviewRes.value || {};
        const nextAssignments = (raw.assignments || raw.schedules || []).map(mapPicketAssignment);
        setAssignments(nextAssignments);
        setSubmissions((raw.submissions || []).map(mapPicketSubmission));
      } else {
        setAssignments([]);
        setSubmissions([]);
      }

      if (leaveRes.status === "fulfilled") {
        const rows = Array.isArray(leaveRes.value) ? leaveRes.value : leaveRes.value?.requests || [];
        setLeaveRequests(rows.map(mapPicketLeaveRequest));
      }
      return loadedSettings;
    } catch (err: any) {
      setError(err?.message || "Gagal memuat data piket.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [date, user?.role]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    const dateDay = new Date(`${date}T00:00:00`).getDay();
    if (dateDay >= 1 && dateDay <= 5) {
      setSelectedDayOfWeek(dateDay);
      setIsEditingWeekdayMembers(false);
    }
  }, [date]);

  const buildSettingsPayload = (nextSettings: PicketSettings = settings) => {
    const weeklySchedule = nextSettings.weeklySchedule.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      enabled: true,
      peoplePerDay: day.peoplePerDay,
      studentIds: day.studentIds,
    }));

    return {
      peoplePerDay: nextSettings.peoplePerDay,
      randomizeEnabled: nextSettings.randomizeEnabled,
      weeklySchedule,
      weekly_schedule: weeklySchedule,
      recurringSchedule: weeklySchedule,
      recurring_schedule: weeklySchedule,
    };
  };

  const responseKeepsWeekdayMembers = (value: any, dayOfWeek: number, expectedStudentIds: string[]) => {
    const raw = value?.settings || value || {};
    const schedule = raw.weeklySchedule ?? raw.weekly_schedule ?? raw.recurringSchedule ?? raw.recurring_schedule;
    if (!Array.isArray(schedule)) return null;

    const match = schedule.find((day: any) => Number(day?.dayOfWeek ?? day?.day_of_week ?? day?.weekday) === dayOfWeek);
    const savedStudentIds = normalizeStudentIds(match?.studentIds ?? match?.student_ids ?? match?.memberIds ?? match?.member_ids ?? match?.students ?? match?.members);
    return expectedStudentIds.every((id) => savedStudentIds.includes(id));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError("");
      await apiPatch("/picket/settings", buildSettingsPayload());
      setInfo("Pengaturan piket berhasil disimpan.");
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan pengaturan piket.");
    } finally {
      setSaving(false);
    }
  };

  const updateWeeklyDay = (dayOfWeek: number, patch: Partial<WeeklyPicketDay>) => {
    setSettings((prev) => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day
      ),
    }));
  };

  const addTask = async () => {
    if (!taskName.trim()) {
      setError("Nama tugas piket wajib diisi.");
      return;
    }
    try {
      setSaving(true);
      await apiPost("/picket/tasks", { name: taskName.trim(), description: taskDescription.trim() || null, active: true });
      setTaskName("");
      setTaskDescription("");
      setInfo("Jenis tugas piket ditambahkan.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Gagal menambah tugas piket.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: PicketTask) => {
    try {
      await apiPatch(`/picket/tasks/${encodeURIComponent(task.id)}`, { active: !task.active });
      setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, active: !item.active } : item));
    } catch (err: any) {
      setError(err?.message || "Gagal mengubah status tugas.");
    }
  };

  const deleteTask = async (task: PicketTask) => {
    try {
      await apiDelete(`/picket/tasks/${encodeURIComponent(task.id)}`);
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus tugas piket.");
    }
  };

  const generateSchedule = async () => {
    try {
      setSaving(true);
      setError("");
      const dateDay = new Date(`${date}T00:00:00`).getDay();
      const dayRule = settings.weeklySchedule.find((day) => day.dayOfWeek === dateDay);
      const weekdayStudentIds = dayRule?.studentIds || [];
      const payload = weekdayStudentIds.length > 0
        ? {
          date,
          studentIds: weekdayStudentIds,
          replaceExisting: true,
          randomize: false,
        }
        : {
          date,
          peoplePerDay: settings.peoplePerDay,
          randomize: settings.randomizeEnabled,
        };
      await apiPost("/picket/schedules/generate", payload);
      setInfo(weekdayStudentIds.length > 0 ? `Jadwal piket dibuat dari anggota hari ${dayRule?.label}.` : "Jadwal piket berhasil dibuat oleh random picker.");
      await loadData();
    } catch (err: any) {
      setError(getPicketScheduleErrorMessage(err, "Gagal generate jadwal piket."));
    } finally {
      setSaving(false);
    }
  };

  const resyncSchedule = async () => {
    try {
      setSaving(true);
      setError("");
      await apiPost("/picket/schedules/resync", { date });
      await loadData();
      setInfo("Jadwal piket berhasil disinkronkan.");
    } catch (err: any) {
      setError(getPicketScheduleErrorMessage(err, "Gagal resync jadwal piket."));
    } finally {
      setSaving(false);
    }
  };

  const saveWeekdayMembers = async () => {
    const selectedDay = settings.weeklySchedule.find((day) => day.dayOfWeek === selectedDayOfWeek);
    if (!selectedDay || selectedDay.studentIds.length === 0) {
      setError("Pilih minimal satu mahasiswa untuk jadwal piket hari yang dipilih.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const nextSettings: PicketSettings = {
        ...settings,
        weeklySchedule: settings.weeklySchedule.map((day) =>
          day.dayOfWeek === selectedDayOfWeek
            ? { ...day, enabled: true, peoplePerDay: selectedDay.studentIds.length }
            : { ...day, enabled: true }
        ),
      };
      const response = await apiPatch<any>("/picket/settings", buildSettingsPayload(nextSettings));
      const keepsMembers = responseKeepsWeekdayMembers(response, selectedDayOfWeek, selectedDay.studentIds);
      const selectedDateDay = new Date(`${date}T00:00:00`).getDay();
      const shouldSyncSelectedDate = selectedDateDay === selectedDayOfWeek;
      if (shouldSyncSelectedDate) {
        await apiPost("/picket/schedules/generate", {
          date,
          studentIds: selectedDay.studentIds,
          replaceExisting: true,
          randomize: false,
        });
      }
      setSettings(nextSettings);
      setIsEditingWeekdayMembers(false);
      const loadedSettings = await loadData();
      const loadedKeepsMembers = responseKeepsWeekdayMembers(loadedSettings, selectedDayOfWeek, selectedDay.studentIds);
      if (keepsMembers === false || loadedKeepsMembers === false) {
        setError("Backend belum menyimpan daftar anggota piket per hari. Field studentIds tidak muncul lagi saat GET /picket/settings.");
      } else {
        setInfo(
          shouldSyncSelectedDate
            ? `Anggota piket hari ${selectedDay.label} berhasil disimpan dan jadwal tanggal ${date} disinkronkan.`
            : `Anggota piket hari ${selectedDay.label} berhasil disimpan.`
        );
      }
    } catch (err: any) {
      setError(getPicketScheduleErrorMessage(err, "Gagal menyimpan anggota piket hari yang dipilih."));
    } finally {
      setSaving(false);
    }
  };

  const saveManagers = async () => {
    try {
      setSaving(true);
      await apiPatch("/picket/managers", { studentIds: managerIds });
      setInfo("Penanggung jawab piket diperbarui.");
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan penanggung jawab piket.");
    } finally {
      setSaving(false);
    }
  };

  const reviewSubmission = async (submission: PicketSubmission, status: "Valid" | "Bermasalah") => {
    try {
      await apiPatch(`/picket/submissions/${encodeURIComponent(submission.id)}/review`, {
        status,
        reviewedBy: user?.id,
      });
      setSubmissions((prev) => prev.map((item) => item.id === submission.id ? { ...item, status } : item));
      setInfo(status === "Valid" ? "Foto piket ditandai valid." : "Foto piket ditandai bermasalah.");
    } catch (err: any) {
      setError(err?.message || "Gagal review foto piket.");
    }
  };

  const markProblemAndBlock = async (submission: PicketSubmission) => {
    await reviewSubmission(submission, "Bermasalah");
    setInfo(`Submission ${submission.studentName} ditandai bermasalah. Backend akan membuat access lock otomatis.`);
  };

  const reviewLeave = async (request: PicketLeaveRequest, status: "Disetujui" | "Ditolak") => {
    try {
      await apiPatch(`/picket/leave-requests/${encodeURIComponent(request.id)}/status`, {
        status,
        reviewedBy: user?.id,
      });
      setLeaveRequests((prev) => prev.map((item) => item.id === request.id ? { ...item, status } : item));
    } catch (err: any) {
      setError(err?.message || "Gagal memproses izin tidak piket.");
    }
  };

  const submittedAssignmentIds = new Set(submissions.map((item) => String(item.assignmentId || "")));
  const missingAssignments = assignments.filter((item) => !item.submitted && !submittedAssignmentIds.has(item.id));
  const filteredSubmissions = submissions.filter((item) => {
    const haystack = `${item.studentName} ${item.nim || ""} ${item.taskName} ${item.status}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const filteredStudents = students.filter((student) => {
    const haystack = `${student.name} ${student.nim || ""} ${student.tipe || ""}`.toLowerCase();
    return haystack.includes(studentQuery.trim().toLowerCase());
  });
  const selectedWeekday = settings.weeklySchedule.find((day) => day.dayOfWeek === selectedDayOfWeek) || settings.weeklySchedule[0];
  const selectedWeekdayStudentIds = selectedWeekday?.studentIds || [];
  const selectedWeekdayStudents = students.filter((student) => selectedWeekdayStudentIds.includes(student.id));
  const toggleWeekdayStudent = (studentId: string, checked: boolean) => {
    if (!isEditingWeekdayMembers) return;
    const nextStudentIds = checked
      ? selectedWeekdayStudentIds.includes(studentId) ? selectedWeekdayStudentIds : [...selectedWeekdayStudentIds, studentId]
      : selectedWeekdayStudentIds.filter((id) => id !== studentId);
    updateWeeklyDay(selectedDayOfWeek, {
      studentIds: nextStudentIds,
      peoplePerDay: Math.max(1, nextStudentIds.length || selectedWeekday?.peoplePerDay || 1),
    });
  };

  const Shell = isStudentPicShell ? Layout : OperatorLayout;

  return (
    <Shell title="Manajemen Piket">
      <div className="flex flex-col gap-5 pb-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
        {info && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{info}</div>}
        {!allowed && !loading ? (
          <div className="rounded-[16px] border border-border bg-white p-8 text-center shadow-sm">
            <p className="text-base font-black text-foreground">Akses modul piket ditolak</p>
            <p className="mt-1 text-sm text-muted-foreground">Hanya operator dan mahasiswa PIC Piket yang dapat mengelola modul ini.</p>
          </div>
        ) : (
        <>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Piket Harian</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Atur random picker, tugas, penanggung jawab, dan review bukti foto piket.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm font-bold outline-none" />
            <button onClick={() => void loadData()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Muat Ulang
            </button>
            <button onClick={resyncSchedule} disabled={saving || loading} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Resync Jadwal Piket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: "Piket Hari Ini", value: assignments.length, icon: <CalendarDays size={18} />, tone: "blue" },
            { label: "Sudah Submit", value: submissions.length, icon: <ClipboardCheck size={18} />, tone: "emerald" },
            { label: "Belum Piket", value: missingAssignments.length, icon: <AlertTriangle size={18} />, tone: "red" },
            { label: "PIC Piket", value: managerIds.length, icon: <UserCog size={18} />, tone: "amber" },
          ].map((item) => (
            <div key={item.label} className="rounded-[16px] border border-border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-muted-foreground">{item.icon}<span className="text-xs font-black uppercase tracking-wide">{item.label}</span></div>
              <p className="text-2xl font-black text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <section className="rounded-[16px] border border-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-foreground">Aturan Random Picker</h2>
              <div className="mt-4 flex flex-col gap-3">
                <label className="text-xs font-black text-muted-foreground">Jumlah orang piket per hari</label>
                <input type="number" min={1} value={settings.peoplePerDay} onChange={(event) => setSettings((prev) => ({ ...prev, peoplePerDay: Number(event.target.value) || 1 }))} className="h-10 rounded-[10px] border border-border px-3 text-sm font-bold outline-none" />
                <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <input type="checkbox" checked={settings.randomizeEnabled} onChange={(event) => setSettings((prev) => ({ ...prev, randomizeEnabled: event.target.checked }))} className="accent-[#0AB600]" />
                  Aktifkan random picker sistem
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={saveSettings} disabled={saving} className="h-10 rounded-[10px] bg-[#0AB600] text-sm font-black text-white hover:bg-[#099800] disabled:opacity-60">Simpan</button>
                  <button onClick={generateSchedule} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-slate-900 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"><Shuffle size={15} /> Generate</button>
                </div>
                <div className="mt-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3">
                  <div className="mb-3">
                    <p className="text-xs font-black text-emerald-800">Jadwal Mingguan Berulang</p>
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700/80">
                      Klik card hari untuk mengatur siapa saja anggota piket di hari tersebut.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {settings.weeklySchedule.map((day) => (
                      <div
                        key={day.dayOfWeek}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedDayOfWeek(day.dayOfWeek);
                          setIsEditingWeekdayMembers(false);
                          if (isEditingWeekdayMembers) void loadData();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            setSelectedDayOfWeek(day.dayOfWeek);
                            setIsEditingWeekdayMembers(false);
                            if (isEditingWeekdayMembers) void loadData();
                          }
                        }}
                        className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_92px] items-center gap-2 rounded-[10px] border px-3 py-2 transition ${
                          selectedDayOfWeek === day.dayOfWeek
                            ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-200"
                            : "border-emerald-200 bg-white hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">{day.dayOfWeek}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-foreground">{day.label}</span>
                            <span className="block text-[10px] font-bold text-emerald-700">{day.studentIds.length} anggota</span>
                          </span>
                        </div>
                        <div>
                          <label className="mb-1 block text-[9px] font-black uppercase tracking-wide text-muted-foreground">Orang</label>
                          <input
                            type="number"
                            min={1}
                            value={day.peoplePerDay}
                            onChange={(event) => updateWeeklyDay(day.dayOfWeek, { peoplePerDay: Number(event.target.value) || 1 })}
                            className="h-8 w-full rounded-[8px] border border-border px-2 text-xs font-bold outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={saveSettings} disabled={saving} className="mt-3 h-9 w-full rounded-[9px] bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60">
                    Simpan Jadwal Mingguan
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[16px] border border-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-foreground">Jenis Tugas</h2>
              <div className="mt-4 flex flex-col gap-2">
                <input value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Nama tugas, contoh: Bersihkan meja lab" className="h-10 rounded-[10px] border border-border px-3 text-sm font-bold outline-none" />
                <textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} rows={2} placeholder="Catatan tugas opsional" className="rounded-[10px] border border-border px-3 py-2 text-sm outline-none" />
                <button onClick={addTask} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0AB600] text-sm font-black text-white hover:bg-[#099800]"><Plus size={15} /> Tambah Tugas</button>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {tasks.length === 0 ? <p className="text-xs font-semibold text-muted-foreground">Belum ada jenis tugas.</p> : tasks.map((task) => (
                  <div key={task.id} className="rounded-[10px] border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-foreground">{task.name}</p>
                        {task.description && <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>}
                      </div>
                      <Badge status={task.active ? "Aktif" : "Nonaktif"} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => toggleTask(task)} className="h-7 rounded-[7px] border border-border px-2 text-[10px] font-black text-slate-600">{task.active ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => deleteTask(task)} className="inline-flex h-7 items-center gap-1 rounded-[7px] bg-red-50 px-2 text-[10px] font-black text-red-600"><Trash2 size={12} /> Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[16px] border border-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-foreground">Penanggung Jawab Piket</h2>
              <p className="mt-1 text-xs text-muted-foreground">Mahasiswa terpilih dapat membantu mengelola fitur piket seperti admin.</p>
              <div className="mt-4 max-h-[260px] overflow-y-auto rounded-[10px] border border-border">
                {students.map((student) => (
                  <label key={student.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={managerIds.includes(student.id)}
                      onChange={(event) => setManagerIds((prev) => event.target.checked ? [...prev, student.id] : prev.filter((id) => id !== student.id))}
                      className="accent-[#0AB600]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-foreground">{student.name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{student.nim || "-"} {student.tipe ? `- ${student.tipe}` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
              <button onClick={saveManagers} disabled={saving} className="mt-3 h-10 w-full rounded-[10px] bg-slate-900 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">Simpan PIC</button>
            </section>
          </div>

          <div className="flex flex-col gap-5">
            <section className="rounded-[16px] border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-sm font-black text-foreground">Anggota Piket Hari {selectedWeekday?.label}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isEditingWeekdayMembers
                      ? `Pilih mahasiswa untuk pola piket setiap hari ${selectedWeekday?.label}.`
                      : "Mode baca aktif. Tekan Edit untuk mengganti anggota piket hari ini."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                    {selectedWeekdayStudentIds.length} terpilih
                  </span>
                  {isEditingWeekdayMembers ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingWeekdayMembers(false);
                        void loadData();
                      }}
                      className="h-8 rounded-[8px] border border-border bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingWeekdayMembers(true)}
                      className="h-8 rounded-[8px] bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800"
                    >
                      Edit Anggota
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  {isEditingWeekdayMembers ? (
                    <>
                      <div className="mb-3 flex h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-3">
                        <Search size={15} className="text-muted-foreground" />
                        <input
                          value={studentQuery}
                          onChange={(event) => setStudentQuery(event.target.value)}
                          placeholder="Cari nama atau NIM mahasiswa..."
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                      <div className="max-h-[320px] overflow-y-auto rounded-[12px] border border-border">
                        {filteredStudents.length === 0 ? (
                          <div className="p-5 text-center text-sm font-semibold text-muted-foreground">Mahasiswa tidak ditemukan.</div>
                        ) : (
                          filteredStudents.map((student) => (
                            <label key={student.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 hover:bg-slate-50 last:border-b-0">
                              <input
                                type="checkbox"
                                checked={selectedWeekdayStudentIds.includes(student.id)}
                                onChange={(event) => toggleWeekdayStudent(student.id, event.target.checked)}
                                className="accent-[#0AB600]"
                              />
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-700">
                                {student.initials}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-black text-foreground">{student.name}</span>
                                <span className="block truncate text-[10px] text-muted-foreground">
                                  {student.nim || "-"} {student.tipe ? `- ${student.tipe}` : ""}
                                </span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[140px] items-center justify-center rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                      <div>
                        <p className="text-sm font-black text-foreground">Anggota belum bisa diubah</p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          Tekan tombol Edit Anggota untuk menambah atau menghapus mahasiswa piket hari {selectedWeekday?.label}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-foreground">Daftar Terpilih</p>
                    {isEditingWeekdayMembers && selectedWeekdayStudentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => updateWeeklyDay(selectedDayOfWeek, { studentIds: [] })}
                        className="text-[10px] font-black text-red-600 hover:underline"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  {selectedWeekdayStudents.length === 0 ? (
                    <p className="rounded-[10px] border border-dashed border-slate-300 bg-white p-4 text-center text-xs font-semibold text-muted-foreground">
                      Belum ada anggota dipilih.
                    </p>
                  ) : (
                    <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto">
                      {selectedWeekdayStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between gap-2 rounded-[10px] border border-border bg-white px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-foreground">{student.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{student.nim || "-"}</p>
                          </div>
                          {isEditingWeekdayMembers && (
                            <button
                              type="button"
                              onClick={() => toggleWeekdayStudent(student.id, false)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                              aria-label={`Hapus ${student.name} dari jadwal piket`}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {isEditingWeekdayMembers && (
                    <button
                      onClick={saveWeekdayMembers}
                      disabled={saving || selectedWeekdayStudentIds.length === 0}
                      className="mt-3 h-10 w-full rounded-[10px] bg-[#0AB600] text-sm font-black text-white hover:bg-[#099800] disabled:opacity-60"
                    >
                      Simpan Anggota Hari {selectedWeekday?.label}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[16px] border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-black text-foreground">Jadwal dan Status Hari Ini</h2>
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Memuat jadwal...</div>
              ) : assignments.length === 0 ? (
                <div className="p-8 text-center text-sm font-semibold text-muted-foreground">Belum ada jadwal piket untuk tanggal ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-border bg-slate-50 text-xs uppercase text-muted-foreground">
                      <tr><th className="px-5 py-3">Mahasiswa</th><th className="px-5 py-3">Tugas</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Bukti</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {assignments.map((item) => (
                        <tr key={item.id}>
                          <td className="px-5 py-3"><p className="font-black text-foreground">{item.studentName}</p><p className="text-xs text-muted-foreground">{item.nim || "-"}</p></td>
                          <td className="px-5 py-3"><p className="font-bold text-foreground">{item.taskName}</p>{item.taskDescription && <p className="text-xs text-muted-foreground">{item.taskDescription}</p>}</td>
                          <td className="px-5 py-3"><Badge status={item.submitted ? "Terkirim" : "Menunggu"} /></td>
                          <td className="px-5 py-3">{item.photoUrl ? <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-xs font-black text-blue-600 hover:underline">Lihat Foto</a> : <span className="text-xs text-muted-foreground">Belum submit</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-[16px] border border-border bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-black text-foreground">Review Foto Piket</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Validasi bukti foto dan blokir jika tidak sesuai.</p>
                </div>
                <div className="flex h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-3">
                  <Search size={15} className="text-muted-foreground" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari submission..." className="bg-transparent text-sm outline-none" />
                </div>
              </div>
              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-sm font-semibold text-muted-foreground">Belum ada foto piket yang dikirim.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
                  {filteredSubmissions.map((item) => (
                    <div key={item.id} className="rounded-[14px] border border-border p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-foreground">{item.studentName}</p>
                          <p className="text-xs text-muted-foreground">{item.taskName} - {item.date}</p>
                        </div>
                        <Badge status={item.status} />
                      </div>
                      {item.photoUrl ? (
                        <a href={item.photoUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[12px] border border-border bg-slate-50">
                          <img src={item.photoUrl} alt={`Foto piket ${item.studentName}`} className="h-48 w-full object-cover" />
                        </a>
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded-[12px] border border-dashed border-border bg-slate-50 text-sm font-semibold text-muted-foreground">Foto tidak tersedia</div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => reviewSubmission(item, "Valid")} className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-emerald-500 px-3 text-xs font-black text-white"><Check size={14} /> Valid</button>
                        <button onClick={() => reviewSubmission(item, "Bermasalah")} className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-amber-500 px-3 text-xs font-black text-white"><AlertTriangle size={14} /> Tidak Sesuai</button>
                        <button onClick={() => markProblemAndBlock(item)} className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-red-600 px-3 text-xs font-black text-white"><X size={14} /> Bermasalah & Block</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[16px] border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-black text-foreground">Izin Tidak Piket</h2>
              </div>
              {leaveRequests.length === 0 ? (
                <div className="p-8 text-center text-sm font-semibold text-muted-foreground">Belum ada pengajuan izin tidak piket.</div>
              ) : (
                <div className="divide-y divide-border">
                  {leaveRequests.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-black text-foreground">{item.studentName}</p>
                        <p className="text-xs text-muted-foreground">{item.date} - {item.reason}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge status={item.status} />
                        {item.status === "Menunggu" && (
                          <>
                            <button onClick={() => reviewLeave(item, "Disetujui")} className="h-8 rounded-[8px] bg-emerald-500 px-3 text-xs font-black text-white">Setujui</button>
                            <button onClick={() => reviewLeave(item, "Ditolak")} className="h-8 rounded-[8px] bg-red-500 px-3 text-xs font-black text-white">Tolak</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
        </>
        )}
      </div>
    </Shell>
  );
}
