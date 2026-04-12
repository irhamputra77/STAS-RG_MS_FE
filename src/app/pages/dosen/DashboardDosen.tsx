import React, { useState } from "react";
import { Link } from "react-router";
import { DosenLayout } from "../../components/DosenLayout";
import { FlaskConical, Users, BookOpen, CalendarCheck, Eye, Check, X, ChevronRight, Target, AlertTriangle, Clock } from "lucide-react";
import { apiGet, apiPatch, getStoredUser } from "../../lib/api";

export default function DashboardDosen() {
  const user = getStoredUser();
  const [detailLog, setDetailLog] = useState<any | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  React.useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) return;
      const [data, withdrawalRows] = await Promise.all([
        apiGet<any>(`/dashboard/lecturer?userId=${encodeURIComponent(user.id)}`),
        apiGet<Array<any>>(`/withdrawal-requests?advisorId=${encodeURIComponent(user.id)}&finalStatus=${encodeURIComponent("Menunggu Dosen")}`)
      ]);
      setDashboardData(data);
      setLeaves((data.pendingLeaves || []).map((item: any) => ({
        ...item,
        mahasiswaNama: item.student_name || "Mahasiswa",
        mahasiswaInitials: (item.student_name || "M").slice(0, 2).toUpperCase(),
        mahasiswaColor: "bg-[#8B6FFF] text-white",
        periodeStart: item.periode_start,
        periodeEnd: item.periode_end,
        alasan: item.alasan,
        durasi: item.durasi
      })));
      setWithdrawals((withdrawalRows || []).map((item: any) => ({
        id: item.id,
        studentName: item.student_name || "Mahasiswa",
        studentNim: item.student_nim || "-",
        studentInitials: String(item.student_name || "M").split(" ").map((chunk: string) => chunk[0] || "").join("").slice(0, 2).toUpperCase() || "M",
        studentColor: "bg-amber-500 text-white",
        reason: item.reason || "-",
        submittedAt: item.submitted_at,
        operatorNote: item.operator_note || "",
        finalStatus: item.final_status || "Menunggu Dosen"
      })));
    };

    loadDashboard();
  }, [user?.id]);

  const myRiset = dashboardData?.myResearch || [];
  const myMahasiswaCount = dashboardData?.stats?.mahasiswaAktif || 0;
  const pendingLogs = (dashboardData?.pendingLogs || []).map((item: any) => ({
    ...item,
    mahasiswaNama: item.student_name,
    riset: item.project_name || "Riset",
    fullDate: new Date(item.date).toLocaleDateString("id-ID"),
    mahasiswaInitials: (item.student_name || "M").slice(0, 2).toUpperCase(),
    mahasiswaColor: "bg-[#8B6FFF] text-white",
    title: item.title
  }));
  const pendingLeaveCount = leaves.length;
  const pendingWithdrawalCount = withdrawals.length;

  const handleLeave = async (id: string, action: "Disetujui" | "Ditolak") => {
    await apiPatch(`/leave-requests/${id}/status`, { status: action });
    setLeaves(p => p.filter(l => l.id !== id));
  };

  const handleWithdrawal = async (id: string, action: "Disetujui" | "Ditolak") => {
    await apiPatch(`/withdrawal-requests/${id}/advisor-review`, {
      status: action,
      reviewedById: user?.id,
      note: action === "Disetujui"
        ? "Pengajuan pengunduran diri disetujui dosen pembimbing."
        : "Pengajuan pengunduran diri ditolak dosen pembimbing."
    });
    setWithdrawals((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <DosenLayout title="Dashboard Dosen">
      <div className="flex flex-col gap-6 pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Selamat datang, {user?.name || "Dosen"}!</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · <span className="text-indigo-600 font-black">{myRiset.length} Riset Aktif</span></p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { icon: <FlaskConical size={22} className="text-blue-600" />, label: "Riset Dipimpin", value: dashboardData?.stats?.risetDipimpin ?? myRiset.length, sub: "semua aktif", bg: "bg-blue-100", href: "/dosen/riset" },
              { icon: <Users size={22} className="text-emerald-600" />, label: "Mahasiswa Aktif", value: myMahasiswaCount, sub: "di bawah bimbingan", bg: "bg-emerald-100", href: "/dosen/riset" },
              { icon: <BookOpen size={22} className="text-amber-600" />, label: "Logbook Pending Review", value: dashboardData?.stats?.pendingLogbook ?? pendingLogs.length, sub: "butuh perhatian", bg: "bg-amber-100", href: "/dosen/logbook" },
              { icon: <CalendarCheck size={22} className="text-red-500" />, label: "Cuti Menunggu", value: pendingLeaveCount, sub: "perlu persetujuan", bg: "bg-red-100", href: "#" },
              { icon: <AlertTriangle size={22} className="text-orange-500" />, label: "Pengunduran Diri", value: pendingWithdrawalCount, sub: "menunggu keputusan", bg: "bg-orange-100", href: "#" },
            ].map(s => (
            <Link key={s.label} to={s.href} className="bg-white border border-border rounded-[14px] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-3">
              <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{s.label}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* 7-5 Split */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

          {/* Left 7 cols */}
          <div className="xl:col-span-7 flex flex-col gap-5">

            {/* Logbook Perlu Direview */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2"><BookOpen size={15} className="text-indigo-600" /> Logbook Perlu Direview</h2>
                <Link to="/dosen/logbook" className="text-xs font-bold text-indigo-600 flex items-center gap-0.5 hover:gap-1 transition-all">Lihat Semua <ChevronRight size={12} strokeWidth={3} /></Link>
              </div>
              <table className="w-full text-xs text-left">
                <thead><tr className="bg-slate-50 border-b border-border">
                  {["Mahasiswa", "Riset", "Tanggal", "Judul Entry", ""].map(h => <th key={h} className="px-5 py-2.5 font-black text-muted-foreground uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {pendingLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${log.mahasiswaColor}`}>{log.mahasiswaInitials}</div>
                          <span className="font-black text-foreground">{log.mahasiswaNama.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#F8F5FF] text-[#6C47FF]">{log.riset}</span></td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{log.fullDate.split(", ")[1]}</td>
                      <td className="px-5 py-3 font-bold text-foreground max-w-[200px]"><p className="line-clamp-1">{log.title}</p></td>
                      <td className="px-5 py-3">
                        <button onClick={() => setDetailLog(log)} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-[8px] transition-colors">
                          <Eye size={11} /> Lihat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pengajuan Cuti */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                  <CalendarCheck size={15} className="text-red-500" /> Pengajuan Cuti Mahasiswa
                  {pendingLeaveCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingLeaveCount}</span>}
                </h2>
              </div>
              {leaves.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada pengajuan cuti menunggu.</div>
              ) : (
                <div className="divide-y divide-border">
                  {leaves.map(l => (
                    <div key={l.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${l.mahasiswaColor}`}>{l.mahasiswaInitials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground text-sm">{l.mahasiswaNama}</p>
                        <p className="text-xs text-muted-foreground">{l.periodeStart}{l.periodeEnd !== l.periodeStart ? ` – ${l.periodeEnd}` : ""} · {l.durasi} hari</p>
                        <p className="text-xs text-foreground mt-0.5 line-clamp-1">{l.alasan}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleLeave(l.id, "Disetujui")} className="flex items-center gap-1 h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-[8px] transition-colors"><Check size={12} strokeWidth={3} /> Setujui</button>
                        <button onClick={() => handleLeave(l.id, "Ditolak")} className="flex items-center gap-1 h-8 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-[8px] border border-red-200 transition-colors"><X size={12} strokeWidth={3} /> Tolak</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-orange-200 rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-orange-100 flex items-center justify-between bg-orange-50/40">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                  <AlertTriangle size={15} className="text-orange-500" /> Pengunduran Diri Menunggu Keputusan
                  {pendingWithdrawalCount > 0 && <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingWithdrawalCount}</span>}
                </h2>
              </div>
              {withdrawals.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada pengunduran diri yang menunggu keputusan dosen.</div>
              ) : (
                <div className="divide-y divide-border">
                  {withdrawals.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${item.studentColor}`}>{item.studentInitials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground text-sm">{item.studentName}</p>
                        <p className="text-xs text-muted-foreground">{item.studentNim}</p>
                        <p className="text-xs text-foreground mt-0.5 line-clamp-2">{item.reason}</p>
                        {item.operatorNote && (
                          <p className="mt-1 text-[10px] font-medium text-orange-700">Catatan operator: {item.operatorNote}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleWithdrawal(item.id, "Disetujui")} className="flex items-center gap-1 h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-[8px] transition-colors"><Check size={12} strokeWidth={3} /> Setujui</button>
                        <button onClick={() => handleWithdrawal(item.id, "Ditolak")} className="flex items-center gap-1 h-8 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-[8px] border border-red-200 transition-colors"><X size={12} strokeWidth={3} /> Tolak</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 cols */}
          <div className="xl:col-span-5 flex flex-col gap-5">

            {/* Riset Saya */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2"><FlaskConical size={15} className="text-indigo-600" /> Riset Saya</h2>
                <Link to="/dosen/riset" className="text-xs font-bold text-indigo-600 flex items-center gap-0.5"><ChevronRight size={12} strokeWidth={3} /></Link>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {myRiset.map(r => (
                  <div key={r.id} className="p-3.5 bg-slate-50/60 border border-border rounded-[12px]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-black text-foreground line-clamp-1">{(r.short_title || r.title || "").split("–")[1]?.trim() || r.short_title || r.title}</p>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">{r.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full"><div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${r.progress}%` }} /></div>
                      <span className="text-[10px] font-black text-indigo-600">{r.progress}%</span>
                    </div>
                    <Link to="/dosen/progress" className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-0.5">Lihat Board →</Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Tim */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2"><Target size={15} className="text-indigo-600" /> Progress Tim</h2>
                <Link to="/dosen/progress" className="text-xs font-bold text-indigo-600 flex items-center gap-0.5"><ChevronRight size={12} strokeWidth={3} /></Link>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {myRiset.map((riset: any) => {
                  const bc = (dashboardData?.boardSummary || []).find((item: any) => item.id === riset.id) || { todo: 0, doing: 0, review: 0, done: 0 };
                  return (
                    <div key={riset.id}>
                      <p className="text-[10px] font-black text-muted-foreground mb-2">{(riset.short_title || riset.title || "").split("–")[1]?.trim() || riset.short_title || riset.title}</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[["To Do", bc.todo, "bg-slate-100 text-slate-600"], ["Doing", bc.doing, "bg-blue-100 text-blue-700"], ["Review", bc.review, "bg-amber-100 text-amber-700"], ["Done", bc.done, "bg-emerald-100 text-emerald-700"]].map(([l, v, c]) => (
                          <div key={String(l)} className={`rounded-[8px] py-2 text-center ${c}`}>
                            <p className="text-sm font-black">{v}</p>
                            <p className="text-[9px] font-black uppercase tracking-wide">{l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2"><Clock size={15} className="text-indigo-600" /> Deadline Mendatang</h2>
              </div>
              <div className="divide-y divide-border">
                {(dashboardData?.deadlines || []).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${d.overdue ? "bg-red-500" : "bg-indigo-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground line-clamp-1">{d.task}</p>
                      <p className="text-[10px] text-muted-foreground">{d.riset}</p>
                    </div>
                    <span className={`text-[10px] font-black shrink-0 flex items-center gap-0.5 ${d.overdue ? "text-red-500" : "text-muted-foreground"}`}>
                      {d.overdue && <AlertTriangle size={10} strokeWidth={3} />} {d.deadline}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Detail Float */}
      {detailLog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetailLog(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[520px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#F8F5FF] text-[#6C47FF]">{detailLog.riset}</span>
                  <span className="text-xs text-muted-foreground">{detailLog.fullDate}</span>
                </div>
                <h3 className="font-black text-foreground">{detailLog.title}</h3>
              </div>
              <button onClick={() => setDetailLog(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground ml-4 shrink-0"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Deskripsi</p><p className="text-sm text-foreground leading-relaxed">{detailLog.description}</p></div>
              <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Output</p><p className="text-sm text-foreground leading-relaxed">{detailLog.output}</p></div>
              {detailLog.kendala && <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Kendala</p><p className="text-sm text-foreground leading-relaxed">{detailLog.kendala}</p></div>}
              <Link to="/dosen/logbook" className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2">
                Tambah Komentar di Halaman Logbook
              </Link>
            </div>
          </div>
        </div>
      )}
    </DosenLayout>
  );
}
