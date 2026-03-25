import React, { useEffect, useState } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiDelete, apiGet, apiPatch, apiPost, getStoredUser, resolveApiAssetUrl } from "../../lib/api";
import { Award, Check, Trash2, Upload, X } from "lucide-react";

type CertStatus = "Belum Diminta" | "Diproses" | "Terbit";

interface CertRow {
  id: string;
  real_id: string | null;
  student_id: string;
  student_name: string;
  student_initials: string;
  nim: string;
  project_id: string;
  project_name: string;
  status: CertStatus;
  issue_date: string | null;
  certificate_number: string | null;
  file_url: string | null;
}

export default function SertifikatOperator() {
  const user = getStoredUser();
  const [rows, setRows] = useState<CertRow[]>([]);
  const [error, setError] = useState("");
  const [publishModal, setPublishModal] = useState<CertRow | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const loadRows = async () => {
    try {
      const data = await apiGet<CertRow[]>("/certificates");
      setRows(data || []);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat data sertifikat.");
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const updateStatus = async (id: string, status: CertStatus, payload: any = {}) => {
    try {
      await apiPatch(`/certificates/${id}/status`, { status, ...payload });
      await loadRows();
    } catch (err: any) {
      setError(err?.message || "Gagal memperbarui status sertifikat.");
    }
  };

  const removeRow = async (id: string) => {
    try {
      await apiDelete(`/certificates/${id}`);
      await loadRows();
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus data sertifikat.");
    }
  };

  return (
    <OperatorLayout title="Proses Sertifikat">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground flex items-center gap-2"><Award size={15} className="text-[#0AB600]" /> Antrian Sertifikat</h2>
            <p className="text-xs font-medium text-muted-foreground">{rows.filter((item) => item.status === "Diproses").length} menunggu terbit</p>
          </div>
          <table className="w-full text-sm text-left">
            <thead><tr className="bg-slate-50 border-b border-border">
              {["Mahasiswa", "Riset", "Status", "Nomor", "File", "Aksi"].map((h) => (
                <th key={h} className="px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const realId = row.real_id;
                return (
                  <tr key={`${row.project_id}-${row.student_id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-[#0AB600] text-white">{row.student_initials || "M"}</div>
                        <div>
                          <p className="font-black text-foreground text-sm">{row.student_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{row.nim || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-foreground">{row.project_name || "Riset"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        row.status === "Terbit"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : row.status === "Diproses"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>{row.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{row.certificate_number || "-"}</td>
                    <td className="px-5 py-3.5">
                      {resolveApiAssetUrl(row.file_url) ? (
                        <a href={resolveApiAssetUrl(row.file_url) || "#"} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline">Lihat File</a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {(row.status === "Diproses" || row.status === "Belum Diminta") && (
                          <button onClick={() => {
                            setPublishModal(row);
                            setIssueDate(row.issue_date || "");
                            setCertificateNumber(row.certificate_number || "");
                            setFileUrl(row.file_url || "");
                            setFileDataUrl("");
                            setFileName("");
                          }} className="h-7 px-3 rounded-[8px] bg-[#0AB600] hover:bg-[#099800] text-white text-[10px] font-black">
                            Terbitkan
                          </button>
                        )}
                        {row.status === "Terbit" && realId && (
                          <button onClick={() => updateStatus(realId, "Diproses")} className="h-7 px-3 rounded-[8px] bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-black">
                            Kembalikan
                          </button>
                        )}
                        {realId && (
                          <button onClick={() => removeRow(realId)} className="w-7 h-7 rounded-[8px] border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {publishModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setPublishModal(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[460px]" onClick={(event) => event.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Terbitkan Sertifikat</h3>
              <button onClick={() => setPublishModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="p-4 bg-slate-50 border border-border rounded-[12px] text-xs">
                <p><span className="font-black text-muted-foreground">Mahasiswa:</span> <span className="font-bold">{publishModal.student_name}</span></p>
                <p><span className="font-black text-muted-foreground">Riset:</span> <span className="font-bold">{publishModal.project_name}</span></p>
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Tanggal Terbit</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Nomor Sertifikat</label>
                <input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">URL File Sertifikat</label>
                <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Upload File Sertifikat (PDF/Gambar)</label>
                <label className="w-full h-10 px-3 rounded-[10px] border border-border text-sm flex items-center gap-2 cursor-pointer hover:bg-slate-50">
                  <Upload size={14} className="text-muted-foreground" />
                  <span className="truncate">{fileName || "Pilih file..."}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 4 * 1024 * 1024) {
                        setError("Ukuran file maksimal 4 MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setFileDataUrl(reader.result);
                          setFileName(file.name);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setPublishModal(null)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={async () => {
                let realId = publishModal.real_id;
                if (!realId) {
                  const requestId = `CR${Date.now()}`;
                  await apiPost<{ message: string }>("/certificates", {
                    id: requestId,
                    studentId: publishModal.student_id,
                    projectId: publishModal.project_id,
                    requestedBy: user?.id || null
                  });
                  await loadRows();
                  const refreshed = await apiGet<CertRow[]>(`/certificates?studentId=${encodeURIComponent(publishModal.student_id)}&projectId=${encodeURIComponent(publishModal.project_id)}`);
                  realId = refreshed.find((item) => item.real_id)?.real_id || null;
                }
                if (!realId) {
                  setError("Gagal membuat request sertifikat sebelum diterbitkan.");
                  return;
                }
                await updateStatus(realId, "Terbit", {
                  issueDate: issueDate || null,
                  certificateNumber: certificateNumber || null,
                  fileUrl: fileUrl || null,
                  fileDataUrl: fileDataUrl || null,
                  fileName: fileName || null
                });
                setPublishModal(null);
              }} className="flex-1 h-10 bg-[#0AB600] hover:bg-[#099800] text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                <Check size={14} strokeWidth={3} /> Simpan Terbit
              </button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
