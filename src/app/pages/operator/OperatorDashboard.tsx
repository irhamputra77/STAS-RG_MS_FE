import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { OperatorLayout } from "../../components/OperatorLayout";
import {
  Users, FlaskConical, CalendarCheck, FileText, BookOpen, Kanban,
  AlertTriangle, Check, X, ChevronRight, Clock,
  TrendingDown, UserX, AlertCircle, ArrowRight, Bell,
} from "lucide-react";
import { apiGet, apiPatch, apiPost, getStoredUser } from "../../lib/api";

type MahasiswaRecord = any;
type LeaveRequestAll = any;
type LetterRequestAll = any;
type AuditLogEntry = any;
type ResearchFull = any;
type WarningData = {
  missingLogbook: string[];
  absentToday: string[];
  lowHours: string[];
};

type DashboardSummary = {
  totalMahasiswa: number;
  totalRisetAktif: number;
  cutiMenunggu: number;
  suratMenunggu: number;
  logbookTerbaru: Array<any>;
};

type AttendanceMonitorToday = {
  presentIds?: string[];
  leaveIds?: string[];
  absentIds?: string[];
};

// ─── Send Warning Helper ──────────────────────────────────────────────────────
function MiniStatCard({ icon, label, value, color, href, urgent }: { icon: React.ReactNode; label: string; value: number | string; color: string; href: string; urgent?: boolean }) {
  return (
    <Link to={href} className="bg-white border border-border rounded-[14px] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex items-center gap-4">
      <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xl font-black text-foreground">{value}</p>
          {urgent && Number(value) > 0 && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
        </div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <ChevronRight size={15} className="text-muted-foreground group-hover:text-[#0AB600] transition-colors" />
    </Link>
  );
}

function WarningSent({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-6 right-6 z-[400] flex items-center gap-3 px-5 py-3.5 rounded-[14px] shadow-xl border bg-emerald-50 border-emerald-200 text-emerald-700 text-sm font-bold">
      <Check size={16} strokeWidth={3} /> Peringatan berhasil dikirim ke mahasiswa
    </div>
  );
}

export default function OperatorDashboard() {
  const user = getStoredUser();
  const [students, setStudents] = useState<MahasiswaRecord[]>([]);
  const [pendingCuti, setPendingCuti] = useState<LeaveRequestAll[]>([]);
  const [pendingSurat, setPendingSurat] = useState<LetterRequestAll[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [researches, setResearches] = useState<ResearchFull[]>([]);
  const [resignationRequests, setResignationRequests] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<WarningData>({
    missingLogbook: [],
    absentToday: [],
    lowHours: []
  });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [warningSent, setWarningSent] = useState(false);
  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  useEffect(() => {
    const colorByIndex = [
      "bg-[#8B6FFF] text-white",
      "bg-emerald-500 text-white",
      "bg-pink-500 text-white",
      "bg-teal-500 text-white",
      "bg-violet-500 text-white",
      "bg-blue-500 text-white"
    ];

    const loadDashboard = async () => {
      setError("");
      try {
        const requests = [
          {
            key: "summary",
            label: "ringkasan dashboard",
            request: apiGet<DashboardSummary>("/dashboard/summary"),
          },
          {
            key: "students",
            label: "data mahasiswa",
            request: apiGet<Array<any>>("/students"),
          },
          {
            key: "leave",
            label: "pengajuan cuti",
            request: apiGet<Array<any>>("/leave-requests?status=Menunggu"),
          },
          {
            key: "letters",
            label: "pengajuan surat",
            request: apiGet<Array<any>>("/letter-requests?status=Menunggu"),
          },
          {
            key: "audit",
            label: "audit log",
            request: apiGet<Array<any>>("/audit-logs?limit=5"),
          },
          {
            key: "research",
            label: "data riset",
            request: apiGet<Array<any>>("/research"),
          },
          {
            key: "warnings",
            label: "logbook",
            request: apiGet<Array<any>>("/logbooks"),
          },
          {
            key: "attendance",
            label: "monitor kehadiran hari ini",
            request: apiGet<AttendanceMonitorToday>("/attendance/monitor/today"),
          },
        ] as const;

        const settled = await Promise.allSettled(requests.map((item) => item.request));
        const failures = settled.flatMap((result, index) =>
          result.status === "rejected"
            ? `${requests[index].label}: ${result.reason?.message || "gagal dimuat"}`
            : []
        );

        const summaryRes =
          settled[0].status === "fulfilled"
            ? settled[0].value
            : null;
        const studentsRes =
          settled[1].status === "fulfilled"
            ? settled[1].value
            : [];
        const leaveRes =
          settled[2].status === "fulfilled"
            ? settled[2].value
            : [];
        const lettersRes =
          settled[3].status === "fulfilled"
            ? settled[3].value
            : [];
        const auditRes =
          settled[4].status === "fulfilled"
            ? settled[4].value
            : [];
        const researchRes =
          settled[5].status === "fulfilled"
            ? settled[5].value
            : [];
        const warningsRes =
          settled[6].status === "fulfilled"
            ? settled[6].value
            : [];
        const attendanceRes =
          settled[7].status === "fulfilled"
            ? settled[7].value
            : {};

        if (failures.length === requests.length) {
          setError("Semua data dashboard gagal dimuat. Periksa koneksi API atau endpoint backend.");
        } else if (failures.length > 0) {
          setError(`Sebagian data dashboard belum tersedia: ${failures.join(" | ")}`);
        }

        const mappedStudents: MahasiswaRecord[] = studentsRes.map((item: any, index: number) => ({
          id: item.id,
          nim: item.nim,
          name: item.name,
          initials: item.initials || item.name?.slice(0, 2)?.toUpperCase() || "M",
          color: colorByIndex[index % colorByIndex.length],
          prodi: item.prodi || "-",
          angkatan: String(item.angkatan || "-"),
          email: item.email || "-",
          phone: item.phone || "-",
          status: item.status,
          tipe: item.tipe,
          riset: [],
          bergabung: item.bergabung || "-",
          pembimbing: item.pembimbing || "-",
          kehadiran: Number(item.kehadiran) || 0,
          totalHari: Number(item.total_hari) || 0,
          logbookCount: Number(item.logbook_count) || 0,
          jamMingguIni: Number(item.jam_minggu_ini) || 0,
          jamMingguTarget: Number(item.jam_minggu_target) || 0
        }));

        const mappedLeave: LeaveRequestAll[] = leaveRes.map((item: any) => ({
          id: item.id,
          mahasiswaId: item.student_id,
          mahasiswaNama: item.student_name,
          mahasiswaInitials: item.student_initials || item.student_name?.slice(0, 2)?.toUpperCase() || "M",
          mahasiswaColor: "bg-[#8B6FFF] text-white",
          nim: item.nim,
          riset: item.project_name || "-",
          periodeStart: item.periode_start,
          periodeEnd: item.periode_end,
          durasi: item.durasi,
          alasan: item.alasan,
          catatan: item.catatan || "",
          tanggalPengajuan: item.tanggal_pengajuan,
          status: item.status
        }));

        const mappedLetters: LetterRequestAll[] = lettersRes.map((item: any) => ({
          id: item.id,
          mahasiswaId: item.student_id,
          mahasiswaNama: item.student_name,
          mahasiswaInitials: item.student_initials || item.student_name?.slice(0, 2)?.toUpperCase() || "M",
          mahasiswaColor: "bg-[#8B6FFF] text-white",
          nim: item.nim,
          jenis: item.jenis,
          tanggal: item.tanggal,
          tujuan: item.tujuan,
          status: item.status,
          estimasi: item.estimasi || undefined,
          nomorSurat: item.nomor_surat || undefined
        }));

        const mappedAudit: AuditLogEntry[] = auditRes.map((item: any) => ({
          id: item.id,
          timestamp: new Date(item.logged_at).toLocaleString("id-ID"),
          userName: item.user_name || "System",
          userInitials: item.user_initials || "SY",
          userColor: "bg-amber-500 text-white",
          userRole: item.user_role === "operator" ? "Operator" : item.user_role === "dosen" ? "Dosen" : "Mahasiswa",
          action: item.action,
          target: item.target,
          ip: item.ip,
          detail: item.detail || "{}"
        }));

        const mappedResearch: ResearchFull[] = researchRes.map((item: any) => ({
          id: item.id,
          title: item.title,
          shortTitle: item.short_title || item.title,
          supervisor: item.supervisor_name || "-",
          supervisorInitials: item.supervisor_initials || "-",
          period: item.period_text || "-",
          mitra: item.mitra || "-",
          status: item.status,
          progress: Number(item.progress) || 0,
          mahasiswaCount: 0,
          dosenCount: 0,
          category: item.category || "-",
          description: item.description || "-",
          funding: item.funding || "-",
          milestones: []
        }));

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().slice(0, 10);
        const yesterdayLogbookStudentIds = new Set(
          (warningsRes || [])
            .filter((item: any) => {
              const dateValue = String(item?.date || item?.tanggal || "").slice(0, 10);
              return dateValue === yesterdayKey;
            })
            .map((item: any) => String(item?.student_id || item?.studentId || ""))
            .filter(Boolean)
        );

        const derivedWarnings: WarningData = {
          missingLogbook: mappedStudents
            .filter((student) => student.status === "Aktif" && !yesterdayLogbookStudentIds.has(String(student.id)))
            .map((student) => String(student.id)),
          absentToday: Array.isArray(attendanceRes?.absentIds)
            ? attendanceRes.absentIds.map((item) => String(item))
            : [],
          lowHours: mappedStudents
            .filter((student) => student.jamMingguTarget > 0 && student.jamMingguIni < student.jamMingguTarget)
            .map((student) => String(student.id))
        };

        setSummary(summaryRes);
        setStudents(mappedStudents);
        setPendingCuti(mappedLeave);
        setPendingSurat(mappedLetters.slice(0, 2));
        setAuditLogs(mappedAudit);
        setResearches(mappedResearch);
        setWarnings(derivedWarnings);
        setResignationRequests([]);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat dashboard operator.");
      }
    };

    loadDashboard();
  }, []);

  const showWarningSent = () => {
    setWarningSent(true);
    setTimeout(() => setWarningSent(false), 3000);
  };

  const handleSendWarning = async (mahasiswaId: string, name: string, type: "logbook" | "absensi" | "jam") => {
    const messages = {
      logbook: { title: `Peringatan: Logbook Belum Diisi`, body: `${name}, Anda belum mengisi logbook untuk kemarin. Segera isi sebelum deadline hari ini.` },
      absensi: { title: `Peringatan: Ketidakhadiran`, body: `${name}, Anda tercatat tidak hadir hari ini. Hubungi operator jika ada keperluan.` },
      jam: { title: `Peringatan: Jam Kehadiran Kurang`, body: `${name}, jam kehadiran Anda minggu ini belum memenuhi target yang ditetapkan. Segera penuhi jam minimal.` },
    };
    const msg = messages[type];
    try {
      await apiPost<{ message: string; id: string }>("/notifications", {
        recipientUserId: mahasiswaId,
        type: "pengumuman",
        title: msg.title,
        body: msg.body
      });
      
      // Hapus dari daftar peringatan setelah berhasil dikirim
      setWarnings(prev => {
        const keyMap: Record<string, keyof WarningData> = {
          logbook: 'missingLogbook',
          absensi: 'absentToday',
          jam: 'lowHours'
        };
        const key = keyMap[type];
        return {
          ...prev,
          [key]: prev[key].filter(id => id !== mahasiswaId)
        };
      });
      
      showWarningSent();
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim peringatan ke mahasiswa.");
    }
  };

  const aktifCount = summary?.totalMahasiswa ?? students.filter(m => m.status === "Aktif").length;
  const risetAktif = summary?.totalRisetAktif ?? researches.filter(r => r.status === "Aktif").length;
  const cutiMenunggu = pendingCuti.length;
  const suratMenunggu = summary?.suratMenunggu ?? pendingSurat.length;
  const logbookHariIni = summary?.logbookTerbaru?.length ?? 0;
  const resignCount = resignationRequests.filter(r => r.statusOperator !== "Ditolak" && r.statusDosen !== "Dikonfirmasi").length;

  const notLogbookMhs = students.filter(m => warnings.missingLogbook.includes(m.id));
  const tidakHadirMhs = students.filter(m => warnings.absentToday.includes(m.id));
  const lowHoursMhs = students.filter(m => warnings.lowHours.includes(m.id));
  const risetLowHours = lowHoursMhs.filter(m => m.tipe === "Riset");
  const magangLowHours = lowHoursMhs.filter(m => m.tipe === "Magang");

  const handleLeave = async (id: string, status: "Disetujui" | "Ditolak") => {
    try {
      await apiPatch<{ message: string }>(`/leave-requests/${id}/status`, { status });
      setPendingCuti(p => p.filter(l => l.id !== id));
    } catch (err: any) {
      setError(err?.message || "Gagal memproses pengajuan cuti.");
    }
  };

  return (
    <OperatorLayout title="Dashboard Operator">
      <WarningSent visible={warningSent} />
      <div className="flex flex-col gap-6 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Selamat datang, {user?.name || "Operator"}! 👋</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">{todayLabel} ·
              {cutiMenunggu > 0 && <span className="text-amber-600 font-black ml-1">{cutiMenunggu} cuti menunggu</span>}
              {resignCount > 0 && <span className="text-red-500 font-black ml-1">· {resignCount} pengunduran diri aktif</span>}
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <MiniStatCard icon={<Users size={22} className="text-blue-600" />} label="Mahasiswa Aktif" value={aktifCount} color="bg-blue-100" href="/operator/mahasiswa" />
          <MiniStatCard icon={<FlaskConical size={22} className="text-[#0AB600]" />} label="Riset Berjalan" value={risetAktif} color="bg-green-100" href="/operator/riset" />
          <MiniStatCard icon={<CalendarCheck size={22} className="text-amber-600" />} label="Cuti Menunggu" value={cutiMenunggu} color="bg-amber-100" href="/operator/cuti" urgent />
          <MiniStatCard icon={<FileText size={22} className="text-blue-500" />} label="Surat Menunggu" value={suratMenunggu} color="bg-blue-100" href="/operator/surat" urgent />
          <MiniStatCard icon={<BookOpen size={22} className="text-emerald-600" />} label="Logbook Hari Ini" value={logbookHariIni} color="bg-emerald-100" href="/operator/logbook" />
          <MiniStatCard icon={<Kanban size={22} className="text-indigo-600" />} label="Board Aktif" value={risetAktif} color="bg-indigo-100" href="/operator/progress-board" />
        </div>

        {/* Alert Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Belum Isi Logbook */}
          <div className="bg-white border border-amber-200 rounded-[14px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between">
              <h3 className="text-xs font-black text-foreground flex items-center gap-2"><BookOpen size={13} className="text-amber-500" /> Belum Isi Logbook (Kemarin)<span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{notLogbookMhs.length}</span></h3>
            </div>
            {notLogbookMhs.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${m.color}`}>{m.initials}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-black text-foreground">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.nim}</p></div>
                <button onClick={() => handleSendWarning(m.id, m.name, "logbook")} className="flex items-center gap-1 h-6 px-2 bg-amber-100 hover:bg-amber-500 text-amber-700 hover:text-white text-[9px] font-black rounded-[6px] transition-all shrink-0"><Bell size={9} /> Kirim</button>
              </div>
            ))}
          </div>

          {/* Tidak Hadir */}
          <div className="bg-white border border-red-200 rounded-[14px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-red-100 bg-red-50/50 flex items-center justify-between">
              <h3 className="text-xs font-black text-foreground flex items-center gap-2"><UserX size={13} className="text-red-500" /> Tidak Hadir Hari Ini<span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{tidakHadirMhs.length}</span></h3>
            </div>
            {tidakHadirMhs.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${m.color}`}>{m.initials}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-black text-foreground">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.status === "Cuti" ? "Sedang Cuti" : "Tidak Hadir"}</p></div>
                {m.status !== "Cuti" && <button onClick={() => handleSendWarning(m.id, m.name, "absensi")} className="flex items-center gap-1 h-6 px-2 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white text-[9px] font-black rounded-[6px] transition-all shrink-0"><Bell size={9} /> Kirim</button>}
              </div>
            ))}
          </div>

          {/* Jam Kurang */}
          <div className="bg-white border border-orange-200 rounded-[14px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/50 flex items-center justify-between">
              <h3 className="text-xs font-black text-foreground flex items-center gap-2"><TrendingDown size={13} className="text-orange-500" /> Jam Tidak Terpenuhi<span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{risetLowHours.length + magangLowHours.length}</span></h3>
            </div>
            {[...risetLowHours.slice(0, 2), ...magangLowHours.slice(0, 1)].map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${m.color}`}>{m.initials}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-black text-foreground">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.tipe}</p></div>
                <div className="text-right shrink-0"><p className="text-xs font-black text-orange-600">{m.jamMingguIni}j/{m.jamMingguTarget}j</p></div>
                <button onClick={() => handleSendWarning(m.id, m.name, "jam")} className="flex items-center gap-1 h-6 px-2 bg-orange-100 hover:bg-orange-500 text-orange-600 hover:text-white text-[9px] font-black rounded-[6px] transition-all shrink-0"><Bell size={9} /> Kirim</button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-8 flex flex-col gap-5">

            {/* Pengunduran Diri */}
            {resignationRequests.length > 0 && (
              <div className="bg-white border border-red-200 rounded-[14px] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 bg-red-50/30 flex items-center justify-between">
                  <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-500" /> Pengunduran Diri
                    <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{resignationRequests.length}</span>
                  </h2>
                </div>
                {resignationRequests.map(r => (
                  <div key={r.id} className="px-5 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${r.mahasiswaColor}`}>{r.mahasiswaInitials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-foreground text-sm">{r.mahasiswaNama} <span className="text-xs font-medium text-muted-foreground">({r.nim})</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.alasan}</p>
                    </div>
                    {/* 3-step flow */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[{ label: "Pengajuan", done: true }, { label: "Operator", done: r.statusOperator === "Diteruskan" }, { label: "Dosen Ketua", done: r.statusDosen === "Dikonfirmasi" }].map((step, i, arr) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-[6px] text-[9px] font-black ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {step.done ? <Check size={8} strokeWidth={3} /> : <Clock size={8} />} {step.label}
                          </div>
                          {i < arr.length - 1 && <ArrowRight size={10} className="text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aktivitas Terkini */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2"><Clock size={15} className="text-[#0AB600]" /> Aktivitas Terkini</h2>
                <Link to="/operator/audit" className="text-xs font-bold text-[#0AB600] flex items-center gap-0.5 hover:gap-1 transition-all">Audit Log <ChevronRight size={12} strokeWidth={3} /></Link>
              </div>
              <table className="w-full text-xs text-left">
                <thead><tr className="bg-slate-50 border-b border-border">
                  <th className="px-5 py-2.5 font-black text-muted-foreground uppercase tracking-wide">User</th>
                  <th className="px-5 py-2.5 font-black text-muted-foreground uppercase tracking-wide">Aksi</th>
                  <th className="px-5 py-2.5 font-black text-muted-foreground uppercase tracking-wide">Target</th>
                  <th className="px-5 py-2.5 font-black text-muted-foreground uppercase tracking-wide">Waktu</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.slice(0, 5).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${log.userColor}`}>{log.userInitials}</div>
                          <span className="font-black text-foreground truncate max-w-[90px]">{log.userName.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5"><span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${log.action === "Login" ? "bg-blue-100 text-blue-700" : log.action === "Create" ? "bg-emerald-100 text-emerald-700" : log.action === "Update" ? "bg-amber-100 text-amber-700" : log.action === "Delete" ? "bg-red-100 text-red-600" : log.action === "Approve" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"}`}>{log.action}</span></td>
                      <td className="px-5 py-2.5 text-muted-foreground truncate max-w-[160px]">{log.target}</td>
                      <td className="px-5 py-2.5 font-mono text-[10px] text-muted-foreground">{log.timestamp.split(" ")[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ringkasan Riset */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2"><FlaskConical size={15} className="text-[#0AB600]" /> Ringkasan Riset</h2>
                <Link to="/operator/riset-dosen" className="text-xs font-bold text-[#0AB600] flex items-center gap-0.5 hover:gap-1 transition-all">Semua <ChevronRight size={12} strokeWidth={3} /></Link>
              </div>
              <div className="divide-y divide-border">
                {researches.map(r => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground line-clamp-1">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.supervisor} · {r.mahasiswaCount + r.dosenCount} anggota</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full"><div className="bg-[#0AB600] h-1.5 rounded-full" style={{ width: `${r.progress}%` }} /></div>
                      <span className="text-[10px] font-black text-[#0AB600] w-8 text-right">{r.progress}%</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 4 cols */}
          <div className="xl:col-span-4 flex flex-col gap-5">
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" /> Pengajuan Menunggu
                  {(cutiMenunggu + suratMenunggu) > 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{cutiMenunggu + suratMenunggu}</span>}
                </h2>
              </div>
              <div className="p-4 flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {pendingCuti.map(l => (
                  <div key={l.id} className="p-3.5 border border-amber-100 bg-amber-50/40 rounded-[12px]">
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${l.mahasiswaColor}`}>{l.mahasiswaInitials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground">{l.mahasiswaNama}</p>
                        <p className="text-[10px] text-muted-foreground">{l.periodeStart} · {l.durasi}h</p>
                        <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Cuti</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleLeave(l.id, "Disetujui")} className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-[8px] transition-colors flex items-center justify-center gap-1"><Check size={10} strokeWidth={3} /> Setujui</button>
                      <button onClick={() => handleLeave(l.id, "Ditolak")} className="flex-1 py-1.5 bg-red-50 text-red-600 text-[10px] font-black rounded-[8px] border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"><X size={10} strokeWidth={3} /> Tolak</button>
                    </div>
                  </div>
                ))}
                {pendingSurat.map(s => (
                  <div key={s.id} className="p-3.5 border border-blue-100 bg-blue-50/40 rounded-[12px]">
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${s.mahasiswaColor}`}>{s.mahasiswaInitials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground">{s.mahasiswaNama}</p>
                        <p className="text-[10px] font-bold text-foreground mt-0.5 line-clamp-1">{s.jenis}</p>
                        <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Surat</span>
                      </div>
                    </div>
                    <Link to="/operator/surat" className="mt-2 flex items-center justify-center gap-1 py-1.5 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-[8px] transition-colors">Proses Surat <ArrowRight size={10} strokeWidth={3} /></Link>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-border bg-slate-50/50 grid grid-cols-2 gap-2">
                <Link to="/operator/cuti" className="text-center text-[10px] font-bold text-amber-600 hover:underline">Semua Cuti →</Link>
                <Link to="/operator/surat" className="text-center text-[10px] font-bold text-blue-600 hover:underline">Semua Surat →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
