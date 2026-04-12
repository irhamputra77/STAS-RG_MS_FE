import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import {
  BookOpen,
  Calendar,
  Download,
  Eye,
  HardDrive,
  Info,
  Link as LinkIcon,
  Plus,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { apiGet, apiPost, apiPut, getStoredUser, resolveApiAssetUrl } from "../lib/api";
import { fetchDraftReportTypes, getCachedDraftReportTypes } from "../lib/draftReportTypes";

type DraftStatus = "Menunggu Review" | "Dalam Review" | "Disetujui";
type DraftResponse = {
  id?: string;
  studentId?: string;
  studentName?: string;
  title?: string;
  type?: string;
  uploadDate?: string;
  fileSize?: string;
  format?: string;
  status?: DraftStatus;
  comment?: string | null;
  riset?: string;
  version?: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | string | null;
  mime_type?: string | null;
  projectId?: string | null;
};

type DraftRecord = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  type: string;
  uploadDate: string;
  fileSize: string;
  format: string;
  status: DraftStatus;
  comment?: string;
  riset: string;
  version: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  projectId: string | null;
};

type ResearchOption = { id: string; label: string };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
const BASE_FILTER = "Semua";
const STATUS_CLASS: Record<DraftStatus, string> = {
  "Menunggu Review": "bg-amber-100 text-amber-700 border-amber-200",
  "Dalam Review": "bg-blue-100 text-blue-700 border-blue-200",
  Disetujui: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatBytes(bytes?: number | null, fallback?: string | null) {
  if (typeof bytes === "number" && Number.isFinite(bytes) && bytes > 0) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return String(fallback || "-");
}

function normalizeDate(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? raw
    : parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function detectFormat(row: DraftResponse) {
  const explicit = String(row.format || "").trim();
  if (explicit) return explicit.toUpperCase();
  const name = String(row.file_name || "").trim();
  if (name.includes(".")) return name.split(".").pop()?.toUpperCase() || "FILE";
  const mime = String(row.mime_type || "").toLowerCase();
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("doc")) return "DOC";
  return "FILE";
}

function normalizeDraft(row: DraftResponse): DraftRecord {
  const fileSizeBytes = row.file_size == null ? null : Number(row.file_size);
  return {
    id: String(row.id || ""),
    studentId: String(row.studentId || ""),
    studentName: String(row.studentName || "Mahasiswa"),
    title: String(row.title || "Draft tanpa judul"),
    type: String(row.type || "Laporan TA"),
    uploadDate: normalizeDate(row.uploadDate),
    fileSize: formatBytes(Number.isFinite(fileSizeBytes as number) ? fileSizeBytes : null, row.fileSize || null),
    format: detectFormat(row),
    status: (row.status || "Menunggu Review") as DraftStatus,
    comment: row.comment || undefined,
    riset: String(row.riset || "-"),
    version: String(row.version || "v1.0"),
    fileUrl: resolveApiAssetUrl(row.file_url || null),
    fileName: row.file_name || null,
    fileSizeBytes: Number.isFinite(fileSizeBytes as number) ? Number(fileSizeBytes) : null,
    mimeType: row.mime_type || null,
    projectId: row.projectId ? String(row.projectId) : null,
  };
}

function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) return "Format file harus PDF, DOC, atau DOCX.";
  if (file.size > MAX_FILE_SIZE) return "Ukuran file maksimal 10 MB.";
  return "";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

function downloadFile(url: string, fileName?: string | null) {
  const link = document.createElement("a");
  link.href = url;
  if (fileName) link.download = fileName;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function DraftReport() {
  const user = getStoredUser();
  const [activeFilter, setActiveFilter] = useState(BASE_FILTER);
  const [studentId, setStudentId] = useState("");
  const [researchOptions, setResearchOptions] = useState<ResearchOption[]>([]);
  const [draftTypes, setDraftTypes] = useState<string[]>(() => getCachedDraftReportTypes().map((item) => item.label));
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftRecord | null>(null);
  const [revisiDraft, setRevisiDraft] = useState<DraftRecord | null>(null);
  const [uploadType, setUploadType] = useState("");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [revisiTitle, setRevisiTitle] = useState("");
  const [revisiFile, setRevisiFile] = useState<File | null>(null);
  const [clearAttachment, setClearAttachment] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);
  const [savingRevisi, setSavingRevisi] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const filters = useMemo(() => [BASE_FILTER, ...draftTypes], [draftTypes]);

  useEffect(() => {
    const handleTypesChanged = () => setDraftTypes(getCachedDraftReportTypes().map((item) => item.label));
    window.addEventListener("draft-report-types:updated", handleTypesChanged as EventListener);
    return () => window.removeEventListener("draft-report-types:updated", handleTypesChanged as EventListener);
  }, []);

  useEffect(() => {
    const loadTypes = async () => {
      const rows = await fetchDraftReportTypes();
      setDraftTypes(rows.map((item) => item.label));
    };

    void loadTypes();
  }, []);

  const loadDrafts = async (resolvedStudentId: string, filter: string) => {
    const params = new URLSearchParams({ studentId: resolvedStudentId });
    if (filter !== BASE_FILTER) params.set("type", filter);
    const rows = await apiGet<Array<DraftResponse>>(`/draft-reports?${params.toString()}`);
    setDrafts(Array.isArray(rows) ? rows.map(normalizeDraft) : []);
  };

  useEffect(() => {
    const init = async () => {
      if (!user?.id) {
        setLoadingInit(false);
        return;
      }
      try {
        setLoadingInit(true);
        setError("");
        const [profile, researchRows] = await Promise.all([
          apiGet<any>(`/profile/${user.id}`),
          apiGet<Array<any>>("/research").catch(() => []),
        ]);
        const resolvedStudentId = String(profile?.id || profile?.student_id || "").trim();
        if (!resolvedStudentId) throw new Error("ID mahasiswa tidak ditemukan.");
        setStudentId(resolvedStudentId);
        setResearchOptions(
          (researchRows || [])
            .map((item: any) => ({ id: String(item?.id || ""), label: String(item?.short_title || item?.title || "").trim() }))
            .filter((item) => item.id && item.label)
        );
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data awal draft.");
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, [user?.id]);

  useEffect(() => {
    const run = async () => {
      if (!studentId) return;
      try {
        setLoadingDrafts(true);
        setError("");
        await loadDrafts(studentId, activeFilter);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat draft.");
      } finally {
        setLoadingDrafts(false);
      }
    };
    run();
  }, [studentId, activeFilter]);

  const filtered = useMemo(() => (
    activeFilter === BASE_FILTER ? drafts : drafts.filter((item) => item.type === activeFilter)
  ), [activeFilter, drafts]);

  const handleFileChange = (file?: File | null, mode: "upload" | "revisi" = "upload") => {
    if (!file) return;
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    if (mode === "upload") setUploadFile(file);
    else {
      setRevisiFile(file);
      setClearAttachment(false);
    }
  };

  const submitUpload = async () => {
    if (!studentId || !uploadType || !uploadProjectId || !uploadTitle.trim() || !uploadFile) {
      setError("Lengkapi jenis dokumen, riset, judul, dan file draft.");
      return;
    }
    try {
      setSavingUpload(true);
      setError("");
      setInfo("");
      await apiPost("/draft-reports", {
        id: `DRF-${Date.now()}`,
        studentId,
        projectId: uploadProjectId,
        title: uploadTitle.trim(),
        type: uploadType,
        fileName: uploadFile.name,
        fileDataUrl: await fileToDataUrl(uploadFile),
      });
      setUploadType("");
      setUploadProjectId("");
      setUploadTitle("");
      setUploadFile(null);
      setInfo("Draft berhasil diupload ke backend.");
      await loadDrafts(studentId, activeFilter);
    } catch (err: any) {
      setError(err?.message || "Gagal mengupload draft.");
    } finally {
      setSavingUpload(false);
    }
  };

  const openRevisi = (draft: DraftRecord) => {
    setRevisiDraft(draft);
    setRevisiTitle(draft.title);
    setRevisiFile(null);
    setClearAttachment(false);
    setError("");
    setInfo("");
  };

  const submitRevisi = async () => {
    if (!revisiDraft || !revisiTitle.trim() || (!revisiFile && !clearAttachment)) {
      setError("Isi judul revisi dan unggah file baru atau hapus lampiran lama.");
      return;
    }
    try {
      setSavingRevisi(true);
      setError("");
      setInfo("");
      const payload: Record<string, unknown> = { title: revisiTitle.trim() };
      if (revisiFile) {
        payload.fileName = revisiFile.name;
        payload.fileDataUrl = await fileToDataUrl(revisiFile);
      }
      if (clearAttachment && !revisiFile) payload.clearAttachment = true;
      await apiPut(`/draft-reports/${revisiDraft.id}`, payload);
      setInfo("Revisi draft berhasil dikirim.");
      setRevisiDraft(null);
      setRevisiFile(null);
      setClearAttachment(false);
      await loadDrafts(studentId, activeFilter);
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim revisi draft.");
    } finally {
      setSavingRevisi(false);
    }
  };

  return (
    <Layout title="Draft Laporan / Jurnal / TA">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-6">
        {error && <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">{error}</div>}
        {info && <div className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">{info}</div>}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Mahasiswa</p>
            <h1 className="text-2xl font-black text-foreground">Draft Laporan / Jurnal / TA</h1>
          </div>
          <button onClick={() => document.getElementById("upload-draft")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#6C47FF] hover:bg-[#5835e5] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
            <Plus size={16} strokeWidth={3} /> Upload Draft Baru
          </button>
        </div>

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {filters.map((item) => (
                <button key={item} onClick={() => setActiveFilter(item)} className={`px-4 py-2 rounded-[10px] text-sm font-bold transition-all ${activeFilter === item ? "bg-[#6C47FF] text-white" : "bg-white border border-border text-muted-foreground hover:text-foreground"}`}>
                  {item}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground font-medium">{loadingInit || loadingDrafts ? "Memuat..." : `${filtered.length} dokumen`}</span>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Riwayat draft sekarang menampilkan data persisten backend, termasuk nama file, ukuran file, format, versi, status, dan URL file untuk preview atau download.
            </div>

            {loadingInit || loadingDrafts ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-[16px] p-12 text-center text-sm font-bold text-slate-400">Memuat draft dari backend...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-[16px] p-12 text-center text-sm font-bold text-slate-400">Belum ada draft pada filter ini.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((draft) => (
                  <div key={draft.id} className="bg-white border border-border rounded-[16px] p-5 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground line-clamp-2">{draft.title}</p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground font-medium">
                          <span className="inline-flex items-center gap-1"><BookOpen size={11} /> {draft.type}</span>
                          <span className="inline-flex items-center gap-1"><Calendar size={11} /> {draft.uploadDate}</span>
                          <span className="inline-flex items-center gap-1"><HardDrive size={11} /> {draft.fileSize}</span>
                          <span>{draft.format}</span>
                          <span>{draft.version}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{draft.riset}</p>
                        {draft.fileName && <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1"><LinkIcon size={11} /> {draft.fileName}</p>}
                      </div>
                      <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[draft.status]}`}>{draft.status}</span>
                    </div>
                    {draft.comment && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><span className="font-black">Komentar Dosen:</span> {draft.comment}</div>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setSelectedDraft(draft)} className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5"><Eye size={13} /> Detail</button>
                      {draft.fileUrl && <button onClick={() => window.open(draft.fileUrl as string, "_blank", "noopener,noreferrer")} className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5"><Eye size={13} /> Preview</button>}
                      {draft.fileUrl && <button onClick={() => downloadFile(draft.fileUrl as string, draft.fileName)} className="px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"><Download size={13} /> Download</button>}
                      {draft.status !== "Disetujui" && <button onClick={() => openRevisi(draft)} className="px-3.5 py-2 rounded-xl bg-[#6C47FF] text-white text-xs font-bold inline-flex items-center gap-1.5"><RotateCcw size={13} /> Revisi</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div id="upload-draft" className="w-[360px] shrink-0">
            <div className="bg-white border border-border rounded-[18px] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <p className="text-sm font-black text-foreground">Upload Draft Baru</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-1">Frontend akan mengirim `studentId`, `projectId`, `title`, `type`, `fileName`, dan `fileDataUrl`.</p>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] text-blue-700"><Info size={13} className="inline mr-2" />Format file: PDF, DOC, DOCX. Maksimal 10 MB.</div>
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-border text-sm focus:outline-none">
                  <option value="">Pilih jenis dokumen...</option>
                  {draftTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={uploadProjectId} onChange={(e) => setUploadProjectId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-border text-sm focus:outline-none">
                  <option value="">Pilih riset...</option>
                  {researchOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Judul draft..." className="w-full h-11 px-3 rounded-xl border border-border text-sm focus:outline-none" />
                <label className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center cursor-pointer">
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { handleFileChange(e.target.files?.[0] || null, "upload"); e.target.value = ""; }} />
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={20} className="text-slate-400" />
                    <p className="text-xs font-bold text-slate-600">{uploadFile ? uploadFile.name : "Klik untuk memilih file draft"}</p>
                    <p className="text-[11px] text-slate-400">{uploadFile ? `${formatBytes(uploadFile.size)} • ${uploadFile.name.split(".").pop()?.toUpperCase() || "FILE"}` : "PDF, DOC, DOCX"}</p>
                  </div>
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
                  <p>studentId: <span className="font-bold">{studentId || "-"}</span></p>
                  <p>projectId: <span className="font-bold">{uploadProjectId || "-"}</span></p>
                </div>
                <button onClick={submitUpload} disabled={savingUpload || !uploadType || !uploadProjectId || !uploadTitle.trim() || !uploadFile} className="w-full h-11 rounded-xl bg-[#6C47FF] hover:bg-[#5835e5] disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-black transition-colors">
                  {savingUpload ? "Mengupload..." : "Upload Draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDraft && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedDraft(null)}>
          <div className="bg-white w-full max-w-[560px] rounded-[22px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{selectedDraft.type}</p>
                <h2 className="text-lg font-black text-foreground mt-1">{selectedDraft.title}</h2>
              </div>
              <button onClick={() => setSelectedDraft(null)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-foreground">{selectedDraft.fileName || "Lampiran draft"}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedDraft.fileSize} • {selectedDraft.format} • {selectedDraft.version}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {selectedDraft.fileUrl && <button onClick={() => window.open(selectedDraft.fileUrl as string, "_blank", "noopener,noreferrer")} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5"><Eye size={13} /> Preview</button>}
                  {selectedDraft.fileUrl && <button onClick={() => downloadFile(selectedDraft.fileUrl as string, selectedDraft.fileName)} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"><Download size={13} /> Download</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p><span className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[selectedDraft.status]}`}>{selectedDraft.status}</span></div>
                <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Riset</p><p className="font-bold text-foreground">{selectedDraft.riset}</p></div>
                <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tanggal Upload</p><p className="font-bold text-foreground">{selectedDraft.uploadDate}</p></div>
                <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Format</p><p className="font-bold text-foreground">{selectedDraft.format}</p></div>
              </div>
              {selectedDraft.comment && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><span className="font-black">Komentar Dosen:</span> {selectedDraft.comment}</div>}
            </div>
          </div>
        </div>
      )}

      {revisiDraft && (
        <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setRevisiDraft(null)}>
          <div className="bg-white w-full max-w-[480px] rounded-[22px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Upload Revisi</p>
                <h2 className="text-base font-black text-foreground mt-1">{revisiDraft.title}</h2>
              </div>
              <button onClick={() => setRevisiDraft(null)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Versi saat ini: <span className="font-black">{revisiDraft.version}</span>. Backend akan menaikkan versi dan mereset status ke <span className="font-black">Menunggu Review</span>.
              </div>
              <input value={revisiTitle} onChange={(e) => setRevisiTitle(e.target.value)} placeholder="Judul revisi..." className="w-full h-11 px-3 rounded-xl border border-border text-sm focus:outline-none" />
              {revisiDraft.fileName && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-bold text-slate-800">{revisiDraft.fileName}</p>
                  <p className="text-xs mt-1">{revisiDraft.fileSize} • {revisiDraft.format}</p>
                  <button type="button" onClick={() => { setClearAttachment((prev) => !prev); setRevisiFile(null); }} className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold ${clearAttachment ? "text-red-600" : "text-slate-500 hover:text-red-600"}`}>
                    <X size={12} /> {clearAttachment ? "Lampiran lama akan dihapus" : "Hapus lampiran lama"}
                  </button>
                </div>
              )}
              <label className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center cursor-pointer">
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { handleFileChange(e.target.files?.[0] || null, "revisi"); e.target.value = ""; }} />
                <div className="flex flex-col items-center gap-2">
                  <RotateCcw size={20} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-600">{revisiFile ? revisiFile.name : "Klik untuk memilih file revisi"}</p>
                  <p className="text-[11px] text-slate-400">{revisiFile ? `${formatBytes(revisiFile.size)} • ${revisiFile.name.split(".").pop()?.toUpperCase() || "FILE"}` : "PDF, DOC, DOCX"}</p>
                </div>
              </label>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setRevisiDraft(null)} className="flex-1 h-11 rounded-xl border border-border text-sm font-bold text-slate-600">Batal</button>
              <button onClick={submitRevisi} disabled={savingRevisi || !revisiTitle.trim() || (!revisiFile && !clearAttachment)} className="flex-1 h-11 rounded-xl bg-[#6C47FF] hover:bg-[#5835e5] disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-black transition-colors">
                {savingRevisi ? "Mengirim..." : "Kirim Revisi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

