import React from "react";
import { Link } from "react-router";
import { Layout } from "../components/Layout";
import {
  UserCheck, BookOpen, ClipboardCheck, CalendarOff, MapPin, Clock,
  ChevronRight, FileText, FlaskConical, ScrollText, Award, Kanban,
  ArrowRight, AlertTriangle, CheckCircle2, Hourglass, Check,
  Target, GitBranch, TrendingUp, MessageSquare, Calendar,
} from "lucide-react";
import { apiGet, getStoredUser } from "../lib/api";

function getActiveMilestone(project: any) {
  const milestones = project?.milestones || [];
  return milestones.find((item: any) => !item.done)?.label || "Semua Selesai";
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, barPct, barColor, href,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  sub?: string; barPct: number; barColor: string; href: string;
}) {
  return (
    <Link
      to={href}
      className="bg-white border border-border rounded-[14px] p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all group h-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-[12px] bg-slate-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
          <div className="text-2xl font-black text-foreground leading-none">{value}</div>
          {sub && <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${barPct}%` }} />
      </div>
    </Link>
  );
}

function SectionHeader({
  icon, title, href, linkLabel = "Lihat Semua",
}: {
  icon: React.ReactNode; title: string; href: string; linkLabel?: string;
}) {
  return (
    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
      <h2 className="text-sm font-black text-foreground flex items-center gap-2">
        {icon} {title}
      </h2>
      <Link to={href} className="text-xs font-bold text-primary hover:gap-1.5 flex items-center gap-1 transition-all">
        {linkLabel} <ChevronRight size={13} strokeWidth={3} />
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE MINI-STEPS
// ─────────────────────────────────────────────────────────────────────────────

function MiniMilestones({ milestones, color }: { milestones: { label: string; done: boolean }[]; color: string }) {
  return (
    <div className="flex items-center gap-0 mt-3">
      {milestones.map((m, i, arr) => (
        <div key={i} className="contents">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              m.done ? `${color} border-transparent text-white` : "bg-white border-slate-200"
            }`}>
              {m.done && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
                  <path d="M1 6l3.5 3.5L11 2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`text-[8px] font-bold whitespace-nowrap ${m.done ? "text-slate-500" : "text-slate-300"}`}>
              {m.label.length > 8 ? m.label.slice(0, 7) + "…" : m.label}
            </span>
          </div>
          {i < arr.length - 1 && (
            <div className={`h-0.5 flex-1 mx-0.5 mb-3.5 ${m.done && arr[i + 1].done ? color : "bg-slate-100"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = getStoredUser();
  const [dashboardData, setDashboardData] = React.useState<any>(null);

  React.useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) return;
      try {
        const data = await apiGet<any>(`/dashboard/student?userId=${encodeURIComponent(user.id)}`);
        setDashboardData(data);
      } catch {
      }
    };

    loadDashboard();
  }, [user?.id]);

  const researchProjectsData = dashboardData?.projects?.length ? dashboardData.projects : [];

  // ── Data dari halaman lain (sumber kebenaran tunggal) ──────────────────────

  // Attendance (dari Attendance.tsx)
  const attendanceHadir = dashboardData?.stats?.attendanceHadir ?? 0;
  const attendanceTotal = dashboardData?.stats?.attendanceTotal ?? 0;
  const attendancePct = attendanceTotal > 0 ? Math.round((attendanceHadir / attendanceTotal) * 100) : 0;

  // Logbook (dari Logbook.tsx — 3 riset: 9+5+12)
  const logbookEntries = dashboardData?.stats?.logbookEntries ?? 0;
  const logbookTarget = dashboardData?.stats?.logbookTarget ?? 0;
  const logbookPct = logbookTarget > 0 ? Math.round((logbookEntries / logbookTarget) * 100) : 0;

  // Tasks dari Board / Research (Riset A 13/20 + Riset B 8/20)
  const tasksDone = researchProjectsData.reduce((s: number, r: any) => s + (r.tugasSelesai || 0), 0);
  const tasksTotal = researchProjectsData.reduce((s: number, r: any) => s + (r.tugasTotal || 0), 0);
  const tasksPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  // Leave (dari LeaveRequest.tsx — sisa 1/3)
  const sisaCuti = dashboardData?.stats?.sisaCuti ?? 0;
  const totalCuti = dashboardData?.stats?.totalCuti ?? 0;
  const cutiPct = totalCuti > 0 ? Math.round((sisaCuti / totalCuti) * 100) : 0;

  const draftRecent = dashboardData?.draftRecent || [];
  const draftDiReview = draftRecent.filter((item: any) => item.status === "Dalam Review").length;
  const draftDisetujui = draftRecent.filter((item: any) => item.status === "Disetujui").length;
  const draftTotal = draftRecent.length;

  // Dokumen (dari Documents.tsx)
  const dokSiapUnduh = dashboardData?.stats?.dokSiapUnduh ?? 0;

  const logbookRecent = (dashboardData?.logbookRecent || []).map((item: any) => ({
    ...item,
    tag: item?.riset?.toLowerCase?.().includes("b") ? "bg-emerald-50 text-emerald-700" : "bg-[#F8F5FF] text-[#6C47FF]"
  }));

  // Active sprint tasks (dari ScrumBoard — todo & doing)
  const sprintTasks = dashboardData?.sprintTasks || [];

  const cutiRecent = dashboardData?.leaveRecent || [];
  const letterRecent = dashboardData?.letterRecent || [];
  const attendanceToday = dashboardData?.attendanceToday || {};

  // Quick links
  const quickLinks = [
    { label: "Logbook",               icon: <BookOpen size={18} />,    href: "/logbook",   color: "bg-indigo-50 text-indigo-600 border-indigo-100"  },
    { label: "Riset & Board",         icon: <FlaskConical size={18} />, href: "/research",  color: "bg-[#F0FFF0] text-[#0AB600] border-green-200"   },
    { label: "Pengajuan Cuti",        icon: <CalendarOff size={18} />,  href: "/leave",     color: "bg-amber-50 text-amber-600 border-amber-100"     },
    { label: "Dokumen & Sertifikat",  icon: <Award size={18} />,        href: "/documents", color: "bg-emerald-50 text-emerald-600 border-emerald-100"},
    { label: "Draft TA / Jurnal",     icon: <ScrollText size={18} />,   href: "/draft",     color: "bg-blue-50 text-blue-600 border-blue-100"        },
    { label: "Kehadiran GPS",         icon: <MapPin size={18} />,       href: "/attendance",color: "bg-rose-50 text-rose-600 border-rose-100"         },
  ];

  const statusStyles = {
    "Disetujui":    "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "Ditolak":      "bg-red-50 text-red-600 border border-red-200",
    "Menunggu":     "bg-amber-50 text-amber-700 border border-amber-200",
    "Dalam Review": "bg-blue-50 text-blue-700 border border-blue-200",
    "Diproses":     "bg-blue-50 text-blue-700 border border-blue-200",
    "Siap Unduh":   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };

  return (
    <Layout title="Dashboard">
      <div className="flex flex-col gap-6 pb-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Selamat datang, {user?.name || "Mahasiswa"}!</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} &nbsp;·&nbsp;
              <span className="text-[#6C47FF] font-black">
                {researchProjectsData.filter((r: any) => r.status === "Aktif").length} Riset Aktif
              </span>
              {!!dashboardData?.header?.nim && <>&nbsp;·&nbsp; NIM {dashboardData.header.nim}</>}
            </p>
          </div>

        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={<UserCheck size={22} className="text-[#6C47FF]" />}
            label="Kehadiran"
            value={<><span>{attendanceHadir}</span><span className="text-base text-muted-foreground font-bold">/{attendanceTotal}</span></>}
            sub={`${attendancePct}% bulan ini`}
            barPct={attendancePct}
            barColor="bg-[#6C47FF]"
            href="/attendance"
          />
          <StatCard
            icon={<BookOpen size={22} className="text-indigo-500" />}
            label="Entri Logbook"
            value={logbookEntries}
            sub={`Target ${logbookTarget} entri`}
            barPct={logbookPct}
            barColor="bg-indigo-500"
            href="/logbook"
          />
          <StatCard
            icon={<ClipboardCheck size={22} className="text-emerald-500" />}
            label="Tugas Selesai"
            value={<><span>{tasksDone}</span><span className="text-base text-muted-foreground font-bold">/{tasksTotal}</span></>}
            sub="Sprint board aktif"
            barPct={tasksPct}
            barColor="bg-emerald-500"
            href="/research"
          />
          <StatCard
            icon={<CalendarOff size={22} className="text-amber-500" />}
            label="Sisa Cuti"
            value={<><span>{sisaCuti}</span><span className="text-base text-muted-foreground font-bold">/{totalCuti}</span></>}
            sub="Jatah hari ini"
            barPct={cutiPct}
            barColor="bg-amber-500"
            href="/leave"
          />
        </div>

        {/* ── Attendance Banner ── */}
        <Link to="/attendance"
          className="bg-gradient-to-r from-[#0AB600] to-[#065e00] rounded-[14px] p-5 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-lg transition-all group"
        >
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 10% 50%, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <MapPin size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-black text-white/90 uppercase tracking-wider">Status Kehadiran Hari Ini</span>
              </div>
              <p className="font-black text-base">
                {attendanceToday?.checkInAt
                  ? `Check-in ${new Date(attendanceToday.checkInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                  : "Belum Check-in"}
              </p>
              <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1.5"><Clock size={11} /> Status: {attendanceToday?.status || "Belum Check-in"}</p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <div className="bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-[12px] font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              Lihat Riwayat <ArrowRight size={14} strokeWidth={3} />
            </div>
          </div>
        </Link>

        {/* ── Main Grid 8-4 ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* ─── LEFT (8 cols) ─── */}
          <div className="xl:col-span-8 flex flex-col gap-6">

            {/* Riset Progress — both projects */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <SectionHeader icon={<FlaskConical size={16} className="text-[#6C47FF]" />} title="Progres Riset Aktif" href="/research" />
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {researchProjectsData.map((r: any) => {
                  const activeMilestone = getActiveMilestone(r);
                  const doneCount = r.milestones.filter(m => m.done).length;
                  const milestonePct = Math.round((doneCount / r.milestones.length) * 100);
                  return (
                    <Link
                      key={r.id}
                      to="/research"
                      className="flex flex-col p-4 bg-slate-50/60 border border-border rounded-[12px] hover:border-[#6C47FF]/30 hover:bg-[#FDFCFF] hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="text-sm font-black text-foreground leading-snug group-hover:text-[#6C47FF] transition-colors line-clamp-2">
                          {r.shortTitle}
                        </h3>
                        <span className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-lg ${r.peranColor}`}>{r.peranSaya}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {r.status}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">{r.period}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Tugas</span>
                        <span className="text-xs font-black text-foreground">{r.tugasSelesai}/{r.tugasTotal}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                        <div className={`${r.progressColor} h-1.5 rounded-full`} style={{ width: `${r.progress}%` }} />
                      </div>
                      {/* Active milestone */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Target size={11} className="text-muted-foreground shrink-0" />
                        <span className="text-[11px] font-bold text-foreground">{activeMilestone}</span>
                      </div>
                      {/* Mini milestone steps */}
                      <MiniMilestones milestones={r.milestones} color={r.progressColor} />
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">{doneCount}/{r.milestones.length} milestone</span>
                        <span className="text-[10px] font-black text-[#6C47FF] flex items-center gap-0.5">
                          {milestonePct}% <ChevronRight size={11} strokeWidth={3} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sprint Tasks — aktif dari board */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <SectionHeader icon={<Kanban size={16} className="text-[#6C47FF]" />} title="Tugas Sprint Aktif" href="/research" linkLabel="Buka Board" />
              <div className="divide-y divide-border">
                {sprintTasks.map((task, i) => (
                  <Link
                    key={i}
                    to="/research"
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Status pill */}
                    <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide ${
                      task.status === "DOING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {task.status}
                    </span>
                    {/* Title */}
                    <p className="flex-1 text-sm font-bold text-foreground group-hover:text-[#6C47FF] transition-colors line-clamp-1">
                      {task.title}
                    </p>
                    {/* Progress (if doing) */}
                    {task.progress !== undefined && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full">
                          <div className="bg-[#6C47FF] h-1.5 rounded-full" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-[#6C47FF]">{task.progress}%</span>
                      </div>
                    )}
                    {/* Deadline */}
                    <div className={`flex items-center gap-1 text-[11px] font-bold shrink-0 ${task.overdue ? "text-red-500" : "text-muted-foreground"}`}>
                      {task.overdue && <AlertTriangle size={11} strokeWidth={3} />}
                      {task.deadline}
                    </div>
                    {/* Riset tag */}
                    <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded bg-[#F8F5FF] text-[#6C47FF]">{task.tag}</span>
                  </Link>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    <span className="font-black text-foreground">{tasksDone}</span> dari <span className="font-black text-foreground">{tasksTotal}</span> tugas selesai di semua riset
                  </p>
                  <Link to="/research" className="text-xs font-black text-[#6C47FF] flex items-center gap-1 hover:gap-1.5 transition-all">
                    Kelola Board <ArrowRight size={12} strokeWidth={3} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Draft & Dokumen row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Draft TA / Jurnal */}
              <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
                <SectionHeader icon={<ScrollText size={16} className="text-blue-600" />} title="Draft TA & Jurnal" href="/draft" />
                <div className="divide-y divide-border">
                  {draftRecent.map((d, i) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground line-clamp-1">{d.title}</p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{d.riset} · {d.version}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${statusStyles[d.status]}`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-2.5 border-t border-border bg-slate-50/50 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">{draftDisetujui} disetujui · {draftDiReview} dalam review</span>
                  <Link to="/draft" className="text-[10px] font-black text-[#6C47FF] flex items-center gap-0.5">Upload <ChevronRight size={11} strokeWidth={3} /></Link>
                </div>
              </div>

              {/* Dokumen & Sertifikat */}
              <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
                <SectionHeader icon={<Award size={16} className="text-amber-600" />} title="Dokumen & Sertifikat" href="/documents" />
                <div className="p-5 flex flex-col gap-3">
                  {letterRecent.slice(0, 3).map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{doc.jenis}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">{doc.tanggal ? new Date(doc.tanggal).toLocaleDateString("id-ID") : "-"}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${statusStyles[doc.status as keyof typeof statusStyles] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                  {letterRecent.length === 0 && (
                    <p className="text-xs text-muted-foreground">Belum ada pengajuan dokumen terbaru.</p>
                  )}
                </div>
                <div className="px-5 py-2.5 border-t border-border bg-slate-50/50 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">{dokSiapUnduh} siap diunduh</span>
                  <Link to="/documents" className="text-[10px] font-black text-[#6C47FF] flex items-center gap-0.5">Kelola <ChevronRight size={11} strokeWidth={3} /></Link>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT (4 cols) ─── */}
          <div className="xl:col-span-4 flex flex-col gap-6">

            {/* Logbook Terbaru */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <SectionHeader icon={<BookOpen size={16} className="text-indigo-600" />} title="Logbook Terbaru" href="/logbook" />
              <div className="p-5">
                <div className="relative border-l-2 border-slate-100 ml-2 flex flex-col gap-5">
                  {logbookRecent.map((log, i) => (
                    <div key={i} className="relative pl-5 group">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-primary shadow-sm" />
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wide">{log.date}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${log.tag}`}>{log.riset}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground leading-relaxed line-clamp-2">{log.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/logbook/new"
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] border-2 border-dashed border-slate-200 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  + Tambah Entri Logbook
                </Link>
              </div>
            </div>

            {/* Pengajuan Cuti */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <SectionHeader icon={<Calendar size={16} className="text-amber-600" />} title="Pengajuan Cuti" href="/leave" linkLabel="Ajukan" />
              <div className="p-5 flex flex-col gap-3">
                {/* Sisa cuti visual */}
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-[10px]">
                  <div className="flex gap-1">
                    {Array.from({ length: totalCuti }).map((_, i) => (
                      <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                        i < sisaCuti ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-300"
                      }`}>
                        {i < sisaCuti ? "✓" : "–"}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-800">{sisaCuti} hari tersisa</p>
                    <p className="text-[10px] font-medium text-amber-600">dari {totalCuti} jatah cuti</p>
                  </div>
                </div>
                {/* Recent list */}
                {cutiRecent.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <p className="text-[10px] font-black text-muted-foreground">{c.id}</p>
                      <p className="text-xs font-bold text-foreground">{c.period}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">{c.durasi}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${statusStyles[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>



          </div>
        </div>
      </div>
    </Layout>
  );
}
