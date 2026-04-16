import React, { useState } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { Check, X, Eye, CalendarCheck, AlertTriangle, Download, Clock } from "lucide-react";
import { apiDelete, apiGet, apiPatch, getStoredUser } from "../../lib/api";
import { formatDateYmd } from "../../lib/date";

type RequestType = "cuti" | "izin" | "sakit";
type LeaveRequestAll = any;

type Status = "Menunggu" | "Disetujui" | "Ditolak";
const STATUS_STYLE: Record<Status, string> = {
  Menunggu: "bg-amber-100 text-amber-700 border border-amber-200",
  Disetujui: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Ditolak: "bg-red-100 text-red-600 border border-red-200",
};

const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  cuti: "Cuti",
  izin: "Izin",
  sakit: "Sakit",
};

const REQUEST_TYPE_BADGE: Record<RequestType, string> = {
  cuti: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  izin: "bg-amber-100 text-amber-700 border border-amber-200",
  sakit: "bg-rose-100 text-rose-700 border border-rose-200",
};

type ToastState = { msg: string; type: "success" | "error" } | null;

function TypeBadge({ jenis }: { jenis: RequestType }) {
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${REQUEST_TYPE_BADGE[jenis]}`}>{REQUEST_TYPE_LABEL[jenis]}</span>;
}

export default function PersetujuanCuti() {
  const user = getStoredUser();
  const [leaves, setLeaves] = useState<LeaveRequestAll[]>([]);
  const [detail, setDetail] = useState<LeaveRequestAll | null>(null);
  const [confirm, setConfirm] = useState<{ item: LeaveRequestAll; action: "Setujui" | "Tolak" } | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    const loadLeaves = async () => {
      try {
        const rows = await apiGet<Array<any>>("/leave-requests");
        const mapped: LeaveRequestAll[] = rows.map((item) => ({
          id: item.id,
          mahasiswaId: item.student_id,
          mahasiswaNama: item.student_name,
          mahasiswaInitials: item.student_initials || item.student_name?.slice(0, 2)?.toUpperCase() || "M",
          mahasiswaColor: "bg-[#8B6FFF] text-white",
          nim: item.nim,
          jenis: (item.jenis_pengajuan || item.jenis || "cuti") as RequestType,
          riset: item.project_name || "-",
          periodeStart: formatDateYmd(item.periode_start),
          periodeEnd: formatDateYmd(item.periode_end),
          durasi: item.durasi,
          alasan: item.alasan,
          catatan: item.catatan || "",
          tanggalPengajuan: formatDateYmd(item.tanggal_pengajuan),
          status: item.status,
          reviewedBy: item.reviewed_by_name,
          reviewedAt: item.reviewed_at ? formatDateYmd(item.reviewed_at) : undefined,
          reviewNote: item.review_note,
        }));
        setLeaves(mapped);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data cuti.");
      }
    };

    loadLeaves();
  }, []);

  const counts = {
    menunggu: leaves.filter((l) => l.status === "Menunggu").length,
    disetujui: leaves.filter((l) => l.status === "Disetujui").length,
    ditolak: leaves.filter((l) => l.status === "Ditolak").length,
  };
  const filtered = filterStatus === "Semua" ? leaves : leaves.filter((l) => l.status === filterStatus);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const newStatus: Status = confirm.action === "Setujui" ? "Disetujui" : "Ditolak";
    try {
      await apiPatch<{ message: string }>(`/leave-requests/${confirm.item.id}/status`, {
        status: newStatus,
        reviewedBy: user?.id || "OP001",
        reviewNote: note,
      });

      const reviewedAt = formatDateYmd(new Date().toISOString());
      setLeaves((prev) => prev.map((leave) => leave.id === confirm.item.id ? { ...leave, status: newStatus, reviewedBy: user?.name || "Admin Operator", reviewedAt, reviewNote: note } : leave));
      setDetail((prev) => prev?.id === confirm.item.id ? { ...prev, status: newStatus, reviewedBy: user?.name || "Admin Operator", reviewedAt, reviewNote: note } : prev);
      showToast(`Pengajuan cuti ${confirm.item.mahasiswaNama} berhasil ${confirm.action === "Setujui" ? "disetujui" : "ditolak"}.`, confirm.action === "Setujui" ? "success" : "error");
      setConfirm(null);
      setNote("");
    } catch (err: any) {
      setError(err?.message || "Gagal memperbarui status cuti.");
    }
  };

  const handleDelete = async (item: LeaveRequestAll) => {
    const confirmed = window.confirm(`Hapus pengajuan ${item.jenis} milik ${item.mahasiswaNama}?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");
    try {
      await apiDelete(`/leave-requests/${item.id}`);
      setLeaves((prev) => prev.filter((leave) => leave.id !== item.id));
      setDetail((prev) => prev?.id === item.id ? null : prev);
      showToast(`Pengajuan ${item.mahasiswaNama} berhasil dihapus.`, "success");
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus pengajuan cuti.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <OperatorLayout title="Persetujuan Cuti">
      <div className="flex flex-col gap-5 pb-4">
        {error && <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">{error}</div>}

        {toast && (
          <div className={`fixed top-6 right-6 z-[400] flex items-center gap-3 px-5 py-3.5 rounded-[14px] shadow-xl border text-sm font-bold ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}>
            {toast.type === "success" ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
            {toast.msg}
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Menunggu", value: counts.menunggu, icon: <Clock size={20} className="text-amber-600" />, color: "bg-amber-100", urgent: true },
            { label: "Disetujui", value: counts.disetujui, icon: <Check size={20} className="text-emerald-600" />, color: "bg-emerald-100", urgent: false },
            { label: "Ditolak", value: counts.ditolak, icon: <X size={20} className="text-red-600" />, color: "bg-red-100", urgent: false },
            { label: "Total Pengajuan", value: leaves.length, icon: <CalendarCheck size={20} className="text-blue-600" />, color: "bg-blue-100", urgent: false },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border rounded-[14px] p-4 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-black text-foreground">{s.value}</p>
                  {s.urgent && s.value > 0 && <AlertTriangle size={14} className="text-amber-500" />}
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-5 items-start">
          <div className="flex-1 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-[10px]">
                {["Semua", "Menunggu", "Disetujui", "Ditolak"].map((f) => (
                  <button key={f} onClick={() => setFilterStatus(f)} className={`px-3 py-1.5 rounded-[8px] text-xs font-black transition-all ${filterStatus === f ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {f} {f === "Menunggu" && counts.menunggu > 0 && <span className="ml-1 text-amber-600">({counts.menunggu})</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-border">
                    {["Mahasiswa", "Jenis", "Riset", "Periode Cuti", "Durasi", "Alasan", "Pengajuan", "Status", "Aksi"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${l.mahasiswaColor}`}>{l.mahasiswaInitials}</div>
                          <div>
                            <p className="font-black text-foreground text-xs">{l.mahasiswaNama}</p>
                            <p className="text-[10px] text-muted-foreground">{l.nim}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><TypeBadge jenis={l.jenis} /></td>
                      <td className="px-5 py-3.5"><span className={`text-[10px] font-black px-2 py-0.5 rounded ${l.riset === "Riset A" ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-emerald-50 text-emerald-700"}`}>{l.riset}</span></td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{l.periodeStart}{l.periodeEnd !== l.periodeStart ? ` - ${l.periodeEnd}` : ""}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-foreground">{l.durasi}h</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[160px]"><p className="line-clamp-1">{l.alasan}</p></td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{l.tanggalPengajuan}</td>
                      <td className="px-5 py-3.5"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[l.status]}`}>{l.status}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetail(l)} className="w-7 h-7 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-slate-100 transition-colors" title="Detail"><Eye size={13} /></button>
                          {l.status === "Menunggu" && (
                            <>
                              <button onClick={() => setConfirm({ item: l, action: "Setujui" })} className="h-7 px-2 rounded-[8px] text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">Setujui</button>
                              <button onClick={() => setConfirm({ item: l, action: "Tolak" })} className="h-7 px-2 rounded-[8px] text-[10px] font-black bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors">Tolak</button>
                            </>
                          )}
                          <button onClick={() => handleDelete(l)} disabled={deletingId === l.id} className="h-7 px-2 rounded-[8px] text-[10px] font-black bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 transition-colors disabled:opacity-50">
                            {deletingId === l.id ? "Menghapus..." : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/30 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-[420px] bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-black text-foreground">Detail Pengajuan Cuti</h3>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black ${detail.mahasiswaColor}`}>{detail.mahasiswaInitials}</div>
                <div>
                  <p className="font-black text-foreground">{detail.mahasiswaNama}</p>
                  <p className="text-xs text-muted-foreground">{detail.nim}</p>
                  <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[detail.status]}`}>{detail.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border border-border rounded-[10px] p-3"><p className="font-black text-muted-foreground mb-1.5">Jenis</p><TypeBadge jenis={detail.jenis} /></div>
                <div className="bg-slate-50 border border-border rounded-[10px] p-3"><p className="font-black text-muted-foreground mb-0.5">Riset</p><p className="font-black text-foreground">{detail.riset}</p></div>
                <div className="bg-slate-50 border border-border rounded-[10px] p-3"><p className="font-black text-muted-foreground mb-0.5">Durasi</p><p className="font-black text-foreground">{detail.durasi} hari</p></div>
                <div className="bg-slate-50 border border-border rounded-[10px] p-3"><p className="font-black text-muted-foreground mb-0.5">Pengajuan</p><p className="font-black text-foreground">{detail.tanggalPengajuan}</p></div>
                <div className="bg-slate-50 border border-border rounded-[10px] p-3"><p className="font-black text-muted-foreground mb-0.5">Mulai</p><p className="font-black text-foreground">{detail.periodeStart}</p></div>
                <div className="bg-slate-50 border border-border rounded-[10px] p-3"><p className="font-black text-muted-foreground mb-0.5">Selesai</p><p className="font-black text-foreground">{detail.periodeEnd}</p></div>
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground mb-1.5">Alasan</p>
                <div className="bg-slate-50 border border-border rounded-[10px] p-3 text-sm text-foreground">{detail.alasan}</div>
              </div>
              {detail.catatan && (
                <div>
                  <p className="text-xs font-black text-muted-foreground mb-1.5">Catatan Mahasiswa</p>
                  <div className="bg-slate-50 border border-border rounded-[10px] p-3 text-sm text-foreground">{detail.catatan}</div>
                </div>
              )}
              <div className="bg-slate-50 border border-border rounded-[10px] p-3">
                <p className="text-xs font-black text-muted-foreground mb-1">Lampiran</p>
                <button className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:underline"><Download size={13} /> surat_keterangan.pdf</button>
              </div>
              {detail.reviewedBy && (
                <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-3 text-xs">
                  <p className="font-black text-blue-700 mb-1">Riwayat Persetujuan</p>
                  <p className="font-bold text-blue-600">{detail.reviewedBy} - {detail.reviewedAt}</p>
                  {detail.reviewNote && <p className="text-blue-500 mt-0.5">{detail.reviewNote}</p>}
                </div>
              )}
              {detail.status === "Menunggu" && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setConfirm({ item: detail, action: "Setujui" })} className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2"><Check size={15} /> Setujui</button>
                  <button onClick={() => setConfirm({ item: detail, action: "Tolak" })} className="flex-1 h-10 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-black rounded-[10px] border border-red-200 transition-colors flex items-center justify-center gap-2"><X size={15} /> Tolak</button>
                </div>
              )}
              <button onClick={() => handleDelete(detail)} disabled={deletingId === detail.id} className="h-10 bg-slate-100 hover:bg-red-50 disabled:opacity-60 text-slate-600 hover:text-red-600 text-sm font-black rounded-[10px] border border-slate-200 transition-colors">
                {deletingId === detail.id ? "Menghapus..." : "Hapus Pengajuan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirm.action === "Setujui" ? "bg-emerald-100" : "bg-red-100"}`}>
              {confirm.action === "Setujui" ? <Check size={22} className="text-emerald-600" strokeWidth={3} /> : <X size={22} className="text-red-600" strokeWidth={3} />}
            </div>
            <h3 className="text-center font-black text-foreground mb-1">{confirm.action} Pengajuan Cuti</h3>
            <p className="text-center text-sm text-muted-foreground mb-4">Anda akan <strong>{confirm.action === "Setujui" ? "menyetujui" : "menolak"}</strong> cuti {confirm.item.durasi} hari dari <strong>{confirm.item.mahasiswaNama}</strong></p>
            <div className="mb-4">
              <label className="text-xs font-black text-foreground block mb-1.5">Catatan (opsional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Tambahkan catatan untuk mahasiswa..." className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={handleConfirm} className={`flex-1 h-10 text-white text-sm font-black rounded-[10px] transition-colors ${confirm.action === "Setujui" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}>Ya, {confirm.action}</button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
