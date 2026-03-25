import React, { useState } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { FileText, Clock, CheckCircle2, Hourglass, Eye, Upload, X, Download, Check } from "lucide-react";
import { apiGet, apiPatch, resolveApiAssetUrl } from "../../lib/api";

type LetterRequestAll = any;

type ToastState = { msg: string; type: "success" } | null;
const STATUS_COLOR: Record<string, string> = {
  "Menunggu": "bg-amber-100 text-amber-700 border border-amber-200",
  "Diproses": "bg-blue-100 text-blue-700 border border-blue-200",
  "Siap Unduh": "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

export default function LayananSurat() {
  const [letters, setLetters] = useState<LetterRequestAll[]>([]);
  const [detail, setDetail] = useState<LetterRequestAll | null>(null);
  const [uploadModal, setUploadModal] = useState<LetterRequestAll | null>(null);
  const [nomorSurat, setNomorSurat] = useState("");
  const [tanggalTerbit, setTanggalTerbit] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState("");

  React.useEffect(() => {
    const loadLetters = async () => {
      try {
        const rows = await apiGet<Array<any>>("/letter-requests");
        const mapped: LetterRequestAll[] = rows.map((item) => ({
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
          estimasi: item.estimasi,
          nomorSurat: item.nomor_surat,
          fileUrl: item.file_url || null
        }));
        setLetters(mapped);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data surat.");
      }
    };

    loadLetters();
  }, []);

  const counts = {
    menunggu: letters.filter(l => l.status === "Menunggu").length,
    diproses: letters.filter(l => l.status === "Diproses").length,
    siapUnduh: letters.filter(l => l.status === "Siap Unduh").length,
    total: letters.length,
  };
  const filtered = filterStatus === "Semua" ? letters : letters.filter(l => l.status === filterStatus);

  const showToast = (msg: string) => { setToast({ msg, type: "success" }); setTimeout(() => setToast(null), 3000); };

  const handleProses = (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
      apiPatch<{ message: string }>(`/letter-requests/${id}/status`, {
        status: "Diproses"
      })
        .then(() => {
          setLetters(prev => prev.map(l => l.id === id ? { ...l, status: "Diproses" as const } : l));
          showToast("Permintaan surat berhasil diproses.");
        })
        .catch((err) => {
          setError(err?.message || "Gagal memproses surat.");
        })
        .finally(() => {
          setProcessingId(null);
        });
    }, 1500);
  };

  const handleUpload = async () => {
    if (!uploadModal) return;
    if (!nomorSurat.trim()) {
      setError("Nomor surat wajib diisi.");
      return;
    }
    if (!uploadedFileDataUrl && !uploadModal.fileUrl) {
      setError("File surat wajib diupload sebelum status Siap Unduh.");
      return;
    }

    try {
      await apiPatch<{ message: string }>(`/letter-requests/${uploadModal.id}/status`, {
        status: "Siap Unduh",
        nomorSurat,
        tanggalTerbit,
        fileDataUrl: uploadedFileDataUrl || null,
        fileName: uploadedFileName || null
      });

      setLetters(prev => prev.map(l => l.id === uploadModal.id ? { ...l, status: "Siap Unduh" as const, nomorSurat } : l));
      setUploadModal(null);
      setNomorSurat("");
      setTanggalTerbit("");
      setUploadedFileDataUrl("");
      setUploadedFileName("");
      showToast("Dokumen surat berhasil diupload dan siap diunduh mahasiswa.");
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan status surat.");
    }
  };

  const handlePickedFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Ukuran file maksimal 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedFileDataUrl(reader.result);
        setUploadedFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <OperatorLayout title="Layanan Surat">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-[400] flex items-center gap-3 px-5 py-3.5 rounded-[14px] shadow-xl border bg-emerald-50 border-emerald-200 text-emerald-700 text-sm font-bold">
            <Check size={16} strokeWidth={3} /> {toast.msg}
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Menunggu", value: counts.menunggu, icon: <Clock size={20} className="text-amber-600" />, bg: "bg-amber-100" },
            { label: "Diproses", value: counts.diproses, icon: <Hourglass size={20} className="text-blue-600" />, bg: "bg-blue-100" },
            { label: "Siap Unduh", value: counts.siapUnduh, icon: <CheckCircle2 size={20} className="text-emerald-600" />, bg: "bg-emerald-100" },
            { label: "Total Bulan Ini", value: counts.total, icon: <FileText size={20} className="text-slate-600" />, bg: "bg-slate-100" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-border rounded-[14px] p-4 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-[10px]">
              {["Semua", "Menunggu", "Diproses", "Siap Unduh"].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)} className={`px-3 py-1.5 rounded-[8px] text-xs font-black transition-all ${filterStatus === f ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead><tr className="bg-slate-50 border-b border-border">
                {["Mahasiswa", "Jenis Surat", "Tanggal Pengajuan", "Keperluan", "Status", "Aksi"].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered.map(l => (
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
                    <td className="px-5 py-3.5 text-xs font-bold text-foreground max-w-[180px]"><p className="line-clamp-1">{l.jenis}</p></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{l.tanggal}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[180px]"><p className="line-clamp-1">{l.tujuan}</p></td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_COLOR[l.status]}`}>{l.status}</span>
                      {l.estimasi && <p className="text-[9px] text-muted-foreground mt-0.5">Est. {l.estimasi}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetail(l)} className="w-7 h-7 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-slate-100 transition-colors"><Eye size={13} /></button>
                        {l.status === "Menunggu" && (
                          <button onClick={() => handleProses(l.id)} disabled={processingId === l.id} className="h-7 px-2 rounded-[8px] text-[10px] font-black bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-60 flex items-center gap-1">
                            {processingId === l.id ? <><span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Proses...</> : "Proses"}
                          </button>
                        )}
                        {l.status === "Diproses" && (
                          <button onClick={() => {
                            setUploadModal(l);
                            setNomorSurat(l.nomorSurat || "");
                            setUploadedFileDataUrl("");
                            setUploadedFileName("");
                          }} className="h-7 px-2 rounded-[8px] text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-1">
                            <Upload size={11} /> Upload
                          </button>
                        )}
                        {l.status === "Siap Unduh" && (
                          <a
                            href={resolveApiAssetUrl(l.fileUrl) || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`h-7 px-2 rounded-[8px] text-[10px] font-black border transition-colors flex items-center gap-1 ${resolveApiAssetUrl(l.fileUrl) ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200 pointer-events-none"}`}
                          >
                            <Download size={11} /> Unduh
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/30 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-[400px] bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-black text-foreground">Detail Layanan Surat</h3>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black ${detail.mahasiswaColor}`}>{detail.mahasiswaInitials}</div>
                <div>
                  <p className="font-black text-foreground">{detail.mahasiswaNama}</p>
                  <p className="text-xs text-muted-foreground">{detail.nim}</p>
                  <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_COLOR[detail.status]}`}>{detail.status}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs border-t border-border pt-4">
                {[["Jenis Surat", detail.jenis], ["Tanggal", detail.tanggal], ["Nomor Surat", detail.nomorSurat || "–"], ["Estimasi", detail.estimasi || "–"]].map(([l, v]) => (
                  <div key={l} className="flex gap-2"><span className="font-black text-muted-foreground w-24 shrink-0">{l}</span><span className="font-bold text-foreground">{v}</span></div>
                ))}
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground mb-1.5">Keperluan</p>
                <div className="bg-slate-50 border border-border rounded-[10px] p-3 text-sm text-foreground">{detail.tujuan}</div>
              </div>
              {detail.status === "Siap Unduh" && (
                <a
                  href={resolveApiAssetUrl(detail.fileUrl) || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 h-10 font-black text-sm rounded-[10px] transition-colors ${resolveApiAssetUrl(detail.fileUrl) ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 pointer-events-none"}`}
                >
                  <Download size={15} /> Unduh Dokumen
                </a>
              )}
              {detail.status === "Menunggu" && (
                <button onClick={() => { handleProses(detail.id); setDetail(null); }} className="h-10 bg-blue-500 hover:bg-blue-600 text-white font-black text-sm rounded-[10px] transition-colors">Proses Sekarang</button>
              )}
              {detail.status === "Diproses" && (
                          <button onClick={() => {
                            setUploadModal(detail);
                            setNomorSurat(detail.nomorSurat || "");
                            setUploadedFileDataUrl("");
                            setUploadedFileName("");
                            setDetail(null);
                          }} className="flex items-center justify-center gap-2 h-10 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-[10px] transition-colors"><Upload size={15} /> Upload Dokumen</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setUploadModal(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[440px]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Upload Dokumen Surat</h3>
              <button onClick={() => setUploadModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Nomor Surat</label>
                <input value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} placeholder="SK/2026/03/xxxx" className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Tanggal Terbit</label>
                <input type="date" value={tanggalTerbit} onChange={e => setTanggalTerbit(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all" />
              </div>
              <label
                className="border-2 border-dashed border-amber-200 rounded-[12px] p-8 text-center hover:bg-amber-50 transition-colors cursor-pointer block"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handlePickedFile(event.dataTransfer.files?.[0]);
                }}
              >
                <Upload size={24} className="text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">Klik untuk upload atau seret file</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, PNG, JPG maks. 4 MB</p>
                <p className="text-xs font-bold text-emerald-600 mt-2">{uploadedFileName || "Belum ada file dipilih"}</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) => handlePickedFile(event.target.files?.[0])}
                />
              </label>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setUploadModal(null)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={handleUpload} className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2"><Upload size={14} /> Submit & Selesai</button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
