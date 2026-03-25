import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { Plus, X, Check } from "lucide-react";
import { apiGet, apiPost, getStoredUser } from "../lib/api";

type LeaveStatus = "Disetujui" | "Ditolak" | "Menunggu";
interface LeaveRecord { id: string; tanggalPengajuan: string; periodeMulai: string; periodeSelesai: string; durasi: number; alasan: string; catatan: string; status: LeaveStatus; reviewedBy?: string; reviewedAt?: string; }

export default function LeaveRequest() {
  const user = getStoredUser();
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);
  const [cutiRule, setCutiRule] = useState<{ maxSemesterDays: number; maxMonthDays: number; minAttendancePct: number } | null>(null);
  const [error, setError] = useState("");
  const [requestModal, setRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    periodeMulai: "",
    periodeSelesai: "",
    alasan: "",
    catatan: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [rows, settings] = await Promise.all([
          apiGet<Array<any>>(`/leave-requests${user?.id ? `?studentId=${user.id}` : ""}`),
          apiGet<any>("/health/leave-rules")
        ]);
        const mapped: LeaveRecord[] = rows.map((item) => ({
          id: item.id, tanggalPengajuan: item.tanggal_pengajuan, periodeMulai: item.periode_start,
          periodeSelesai: item.periode_end, durasi: item.durasi || 1, alasan: item.alasan,
          catatan: item.catatan || "", status: item.status, reviewedBy: item.reviewed_by_name, reviewedAt: item.reviewed_at
        }));
        setLeaveData(mapped);
        setCutiRule({
          maxSemesterDays: Number(settings?.maxSemesterDays || 0),
          maxMonthDays: Number(settings?.maxMonthDays || 0),
          minAttendancePct: Number(settings?.minAttendancePct || 0)
        });
      } catch (err: any) { setError(err?.message || "Gagal memuat data cuti."); }
    };
    load();
  }, [user?.id]);

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmitLeaveRequest = async () => {
    if (!formData.periodeMulai || !formData.periodeSelesai || !formData.alasan.trim()) {
      setError("Tanggal mulai, tanggal selesai, dan alasan harus diisi.");
      return;
    }

    try {
      const durasi = calculateDuration(formData.periodeMulai, formData.periodeSelesai);
      if (durasi <= 0) {
        setError("Durasi cuti tidak valid.");
        return;
      }

      if (cutiRule?.maxMonthDays && durasi > cutiRule.maxMonthDays) {
        setError(`Maksimal cuti per bulan adalah ${cutiRule.maxMonthDays} hari.`);
        return;
      }

      if (cutiRule?.maxSemesterDays && durasi > cutiRule.maxSemesterDays) {
        setError(`Maksimal cuti per semester adalah ${cutiRule.maxSemesterDays} hari.`);
        return;
      }

      await apiPost<{ message: string }>("/leave-requests", {
        id: `LR${Date.now()}`,
        studentId: user?.id || "S001",
        periodeStart: formData.periodeMulai,
        periodeEnd: formData.periodeSelesai,
        durasi,
        alasan: formData.alasan,
        catatan: formData.catatan || null,
        tanggalPengajuan: new Date().toISOString().split('T')[0]
      });

      const newLeave: LeaveRecord = {
        id: `LR${Date.now()}`,
        tanggalPengajuan: new Date().toLocaleDateString("id-ID"),
        periodeMulai: formData.periodeMulai,
        periodeSelesai: formData.periodeSelesai,
        durasi,
        alasan: formData.alasan,
        catatan: formData.catatan,
        status: "Menunggu"
      };
      setLeaveData([newLeave, ...leaveData]);
      setRequestModal(false);
      setFormData({ periodeMulai: "", periodeSelesai: "", alasan: "", catatan: "" });
    } catch (err: any) {
      setError(err?.message || "Gagal mengajukan cuti.");
    }
  };

  const StatusBadge = ({ status }: { status: LeaveStatus }) => {
    const colors = { Disetujui: "bg-emerald-100 text-emerald-700", Ditolak: "bg-red-100 text-red-600", Menunggu: "bg-amber-100 text-amber-700" };
    return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${colors[status]}`}>{status}</span>;
  };

  return (
    <Layout title="Pengajuan Cuti">
      <div className="flex flex-col gap-5 p-6 max-w-4xl">
        {error && <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">{error}</div>}
        {cutiRule && (
          <div className="px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700">
            Batas cuti aktif: {cutiRule.maxSemesterDays} hari/semester, {cutiRule.maxMonthDays} hari/bulan, minimum kehadiran {cutiRule.minAttendancePct}%.
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Riwayat Pengajuan Cuti</h2>
          <button onClick={() => setRequestModal(true)} className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-[10px] transition-colors flex items-center gap-2">
            <Plus size={14} /> Ajukan Cuti Baru
          </button>
        </div>
        <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
          <p className="text-xs font-black text-muted-foreground mb-3 uppercase tracking-wide">Riwayat ({leaveData.length} entri)</p>
          {leaveData.length === 0 ? (
            <p className="text-muted-foreground italic">Tidak ada pengajuan cuti.</p>
          ) : (
            <div className="space-y-3">
              {leaveData.map(leave => (
                <div key={leave.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex-1">
                    <p className="font-bold">{leave.tanggalPengajuan}</p>
                    <p className="text-sm text-muted-foreground">{leave.periodeMulai} - {leave.periodeSelesai} ({leave.durasi} hari)</p>
                    <p className="text-sm mt-1">{leave.alasan}</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Leave Modal */}
        {requestModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setRequestModal(false)}>
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[480px]" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                <h3 className="font-black text-foreground">Ajukan Cuti Baru</h3>
                <button onClick={() => setRequestModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-black text-foreground block mb-1.5">Tanggal Mulai</label>
                  <input type="date" value={formData.periodeMulai} onChange={e => setFormData({...formData, periodeMulai: e.target.value})} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-black text-foreground block mb-1.5">Tanggal Selesai</label>
                  <input type="date" value={formData.periodeSelesai} onChange={e => setFormData({...formData, periodeSelesai: e.target.value})} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                </div>
                {formData.periodeMulai && formData.periodeSelesai && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-[10px]">
                    <p className="text-xs font-bold text-blue-700">Durasi: <span className="font-black">{calculateDuration(formData.periodeMulai, formData.periodeSelesai)} hari</span></p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-black text-foreground block mb-1.5">Alasan Cuti</label>
                  <textarea value={formData.alasan} onChange={e => setFormData({...formData, alasan: e.target.value})} rows={3} placeholder="Jelaskan alasan pengajuan cuti..." className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none" />
                </div>
                <div>
                  <label className="text-xs font-black text-foreground block mb-1.5">Catatan Tambahan (Opsional)</label>
                  <textarea value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} rows={2} placeholder="Informasi atau rujukan lainnya..." className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none" />
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => { setRequestModal(false); setFormData({ periodeMulai: "", periodeSelesai: "", alasan: "", catatan: "" }); }} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Batal</button>
                <button onClick={handleSubmitLeaveRequest} className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                  <Check size={14} strokeWidth={3} /> Ajukan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
