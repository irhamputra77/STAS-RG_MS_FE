import React, { useEffect, useState } from "react";
import { DosenLayout } from "../../components/DosenLayout";
import { Award, Info, X, Download, Check } from "lucide-react";
import { apiGet, apiPost, getStoredUser, resolveApiAssetUrl } from "../../lib/api";

type CertStatus = "Terbit" | "Diproses" | "Belum Diminta";

interface CertRow {
  id: string;
  realId: string | null;
  studentId: string;
  studentName: string;
  studentInitials: string;
  nim: string;
  projectId: string;
  projectName: string;
  studentRole: string;
  status: CertStatus;
  issueDate: string | null;
  certificateNumber: string | null;
  fileUrl: string | null;
}

const STATUS_STYLE: Record<CertStatus, string> = {
  Terbit: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Diproses: "bg-amber-100 text-amber-700 border border-amber-200",
  "Belum Diminta": "bg-slate-100 text-slate-500 border border-slate-200"
};

export default function SertifikatMahasiswa() {
  const user = getStoredUser();
  const [rows, setRows] = useState<CertRow[]>([]);
  const [requestModal, setRequestModal] = useState<CertRow | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [error, setError] = useState("");

  const loadRows = async () => {
    try {
      const data = await apiGet<Array<any>>("/certificates");
      const mapped: CertRow[] = data.map((item, index) => ({
        id: item.id,
        realId: item.real_id || null,
        studentId: item.student_id,
        studentName: item.student_name || "Mahasiswa",
        studentInitials: item.student_initials || "M",
        nim: item.nim || "-",
        projectId: item.project_id,
        projectName: item.project_name || "Riset",
        studentRole: item.student_role || "Anggota",
        status: item.status as CertStatus,
        issueDate: item.issue_date ? new Date(item.issue_date).toLocaleDateString("id-ID") : null,
        certificateNumber: item.certificate_number || null,
        fileUrl: item.file_url || null
      }));
      setRows(mapped);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat data sertifikat.");
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const handleRequest = async () => {
    if (!requestModal) return;
    try {
      await apiPost<{ message: string }>("/certificates", {
        id: `CR${Date.now()}`,
        studentId: requestModal.studentId,
        projectId: requestModal.projectId,
        requestedBy: user?.id || null,
        kontribusiSelesaiDate: requestDate || null,
        requestNote
      });
      setRequestModal(null);
      setRequestDate("");
      setRequestNote("");
      await loadRows();
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim permintaan sertifikat.");
    }
  };

  return (
    <DosenLayout title="Sertifikat Mahasiswa">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-[14px]">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-blue-800">Alur Sertifikat</p>
            <p className="text-xs text-blue-600 mt-0.5">Dosen mengajukan sertifikat untuk mahasiswa bimbingan. Operator akan memproses hingga status terbit.</p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground flex items-center gap-2"><Award size={15} className="text-indigo-600" /> Daftar Sertifikat Mahasiswa</h2>
            <p className="text-xs font-medium text-muted-foreground">{rows.filter((r) => r.status === "Terbit").length} terbit</p>
          </div>
          <table className="w-full text-sm text-left">
            <thead><tr className="bg-slate-50 border-b border-border">
              {["Mahasiswa", "Riset", "Peran", "Status", "Tanggal Terbit", "Aksi"].map((h) => (
                <th key={h} className="px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={`${row.projectId}-${row.studentId}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-indigo-600 text-white">{row.studentInitials}</div>
                      <div>
                        <p className="font-black text-foreground text-sm">{row.studentName}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{row.nim}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-bold text-foreground">{row.projectName}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-muted-foreground">{row.studentRole}</td>
                  <td className="px-5 py-3.5"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[row.status]}`}>{row.status}</span></td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{row.issueDate || "-"}</td>
                  <td className="px-5 py-3.5">
                    {row.status === "Belum Diminta" && (
                      <button onClick={() => setRequestModal(row)} className="flex items-center gap-1 h-7 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-[8px] transition-colors">
                        <Award size={11} /> Minta Terbit
                      </button>
                    )}
                    {row.status === "Diproses" && (
                      <span className="text-[10px] font-bold text-amber-600">Diproses operator</span>
                    )}
                    {row.status === "Terbit" && row.fileUrl && (
                      <a href={resolveApiAssetUrl(row.fileUrl) || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1 h-7 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-[8px] border border-indigo-200 transition-colors">
                        <Download size={11} /> Unduh
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {requestModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setRequestModal(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[440px]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Minta Penerbitan Sertifikat</h3>
              <button onClick={() => setRequestModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="p-4 bg-slate-50 border border-border rounded-[12px] text-xs">
                <p><span className="font-black text-muted-foreground">Mahasiswa:</span> <span className="font-bold">{requestModal.studentName}</span></p>
                <p><span className="font-black text-muted-foreground">Riset:</span> <span className="font-bold">{requestModal.projectName}</span></p>
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Tanggal Selesai Kontribusi</label>
                <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Catatan (Opsional)</label>
                <textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setRequestModal(null)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={handleRequest} className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                <Check size={14} strokeWidth={3} /> Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </DosenLayout>
  );
}
