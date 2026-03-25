import React, { useState } from "react";
import { Layout } from "../components/Layout";
import {
  Plus,
  X,
  Eye,
  Download,
  Upload,
  FileText,
  BookOpen,
  ScrollText,
  ClipboardList,
  ChevronDown,
  CheckCircle2,
  Clock,
  MessageSquare,
  RotateCcw,
  FileUp,
  Info,
  Calendar,
  HardDrive,
  Tag,
  User,
} from "lucide-react";
import { apiGet, getStoredUser } from "../lib/api";

type DraftType = "Laporan TA" | "Jurnal" | "Laporan Kemajuan";
type DraftStatus = "Menunggu Review" | "Dalam Review" | "Disetujui";

interface DraftRecord {
  id: string;
  title: string;
  type: DraftType;
  uploadDate: string;
  fileSize: string;
  format: string;
  status: DraftStatus;
  comment?: string;
  riset: string;
  version: string;
}

type FilterType = "Semua" | DraftType;

const filterOptions: FilterType[] = ["Semua", "Laporan TA", "Jurnal", "Laporan Kemajuan"];

const typeConfig: Record<DraftType, { bg: string; text: string; icon: React.ReactNode; border: string }> = {
  "Laporan TA": {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    icon: <ScrollText size={20} />,
  },
  Jurnal: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    icon: <BookOpen size={20} />,
  },
  "Laporan Kemajuan": {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    icon: <ClipboardList size={20} />,
  },
};

const statusConfig: Record<DraftStatus, { cls: string; icon: React.ReactNode; dot: string }> = {
  "Menunggu Review": {
    cls: "bg-amber-100 text-amber-700 border border-amber-200",
    icon: <Clock size={11} strokeWidth={2.5} />,
    dot: "bg-amber-400",
  },
  "Dalam Review": {
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
    icon: <Eye size={11} strokeWidth={2.5} />,
    dot: "bg-blue-400",
  },
  Disetujui: {
    cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 size={11} strokeWidth={2.5} />,
    dot: "bg-emerald-400",
  },
};

function StatusBadge({ status }: { status: DraftStatus }) {
  const c = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${c.cls}`}>
      {c.icon}
      {status}
    </span>
  );
}

// Disetujui → green icon overlay
function DraftTypeIcon({ type, status }: { type: DraftType; status: DraftStatus }) {
  if (status === "Disetujui") {
    return (
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-200 relative">
        <FileText size={20} />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center border border-white">
          <CheckCircle2 size={9} className="text-white" strokeWidth={3} />
        </div>
      </div>
    );
  }
  const c = typeConfig[type];
  return (
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
      {c.icon}
    </div>
  );
}

const draftTypeOptions = ["Laporan TA", "Jurnal", "Laporan Kemajuan"];
const risetOptions = ["Riset A – LSTM Prediction System", "Riset B – IoT Sensor Network", "Riset C – Computer Vision"];

export default function DraftReport() {
  const user = getStoredUser();
  const [activeFilter, setActiveFilter] = useState<FilterType>("Semua");
  const [draftData, setDraftData] = useState<DraftRecord[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftRecord | null>(null);
  const [revisiDraft, setRevisiDraft] = useState<DraftRecord | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState("");
  const [uploadRiset, setUploadRiset] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");

  // Revisi modal state
  const [revisiFile, setRevisiFile] = useState<string | null>(null);
  const [revisiNotes, setRevisiNotes] = useState("");
  const [revisiDragging, setRevisiDragging] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    const loadDrafts = async () => {
      if (!user?.id) return;
      try {
        const rows = await apiGet<DraftRecord[]>(`/draft-reports?studentId=${encodeURIComponent(user.id)}`);
        if (Array.isArray(rows)) setDraftData(rows);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat draft dari backend");
      }
    };

    loadDrafts();
  }, [user?.id]);

  const filtered = activeFilter === "Semua"
    ? draftData
    : draftData.filter((d) => d.type === activeFilter);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file.name);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file.name);
  };

  const handleRevisiDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRevisiDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setRevisiFile(file.name);
  };

  const handleRevisiFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setRevisiFile(file.name);
  };

  const openRevisi = (draft: DraftRecord) => {
    setRevisiDraft(draft);
    setRevisiFile(null);
    setRevisiNotes("");
    setRevisiDragging(false);
  };

  const closeRevisi = () => {
    setRevisiDraft(null);
    setRevisiFile(null);
    setRevisiNotes("");
  };

  return (
    <Layout title="Draft Laporan / Jurnal / TA">
      <div className="flex flex-col gap-6 max-w-[1100px] mx-auto">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Mahasiswa</p>
            <h1 className="text-2xl font-black text-foreground">Draft Laporan / Jurnal / TA</h1>
          </div>
          <button
            onClick={() => document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-[#6C47FF] hover:bg-[#5835e5] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-[#6C47FF]/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={3} />
            Upload Draft Baru
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">

            {/* Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {filterOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-bold transition-all ${
                    activeFilter === f
                      ? "bg-[#6C47FF] text-white shadow-sm shadow-[#6C47FF]/20"
                      : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-slate-300"
                  }`}
                >
                  {f}
                  {f !== "Semua" && (
                    <span className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                      activeFilter === f ? "bg-white/20" : "bg-slate-100 text-slate-500"
                    }`}>
                      {draftData.filter((d) => d.type === f).length}
                    </span>
                  )}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                {filtered.length} dokumen
              </span>
            </div>

            {/* Draft Cards */}
            <div className="flex flex-col gap-3">
              {filtered.map((draft) => (
                <div
                  key={draft.id}
                  className={`bg-white rounded-[16px] border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all ${
                    draft.status === "Disetujui"
                      ? "border-emerald-200/70"
                      : draft.status === "Dalam Review"
                      ? "border-blue-200/70"
                      : "border-border/60"
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3.5">
                    <DraftTypeIcon type={draft.type} status={draft.status} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p className="text-sm font-black text-foreground leading-snug line-clamp-2 pr-2">
                            {draft.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeConfig[draft.type].bg} ${typeConfig[draft.type].text} ${typeConfig[draft.type].border}`}>
                              {draft.type}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Calendar size={10} />
                              {draft.uploadDate}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <HardDrive size={10} />
                              {draft.fileSize}
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold uppercase">{draft.format}</span>
                            <span className="text-[11px] text-slate-400 font-medium">{draft.version}</span>
                          </div>
                        </div>
                        <StatusBadge status={draft.status} />
                      </div>
                    </div>
                  </div>

                  {/* Comment preview */}
                  {draft.comment && (
                    <div className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs ${
                      draft.status === "Disetujui"
                        ? "bg-emerald-50 border border-emerald-100"
                        : "bg-blue-50 border border-blue-100"
                    }`}>
                      <MessageSquare size={13} className={`shrink-0 mt-0.5 ${draft.status === "Disetujui" ? "text-emerald-500" : "text-blue-400"}`} />
                      <p className={`font-medium line-clamp-2 ${draft.status === "Disetujui" ? "text-emerald-800" : "text-blue-800"}`}>
                        <span className="font-black">Komentar Dosen:</span> {draft.comment}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setSelectedDraft(draft)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                    >
                      <Eye size={13} strokeWidth={2.5} />
                      Lihat
                    </button>
                    {draft.status === "Disetujui" ? (
                      <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-500/20">
                        <Download size={13} strokeWidth={2.5} />
                        Unduh
                      </button>
                    ) : (
                      <button
                        onClick={() => openRevisi(draft)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6C47FF] hover:bg-[#5835e5] text-white text-xs font-bold transition-all shadow-sm shadow-[#6C47FF]/20"
                      >
                        <RotateCcw size={13} strokeWidth={2.5} />
                        Revisi
                      </button>
                    )}
                    <span className="ml-auto text-[10px] font-medium text-muted-foreground">{draft.riset}</span>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="bg-white border border-dashed border-slate-200 rounded-[16px] p-12 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                    <FileText size={24} />
                  </div>
                  <p className="text-sm font-black text-slate-400">Belum ada draft untuk kategori ini</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div id="upload-section" className="w-[360px] shrink-0 sticky top-0">
            <div className="bg-white border border-border rounded-[18px] shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F8F5FF] text-[#6C47FF] flex items-center justify-center">
                  <FileUp size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Upload Draft Baru</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Isi semua field sebelum upload</p>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-4">

                {/* Info note */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                  <Info size={14} className="text-blue-500 shrink-0" />
                  <p className="text-[11px] font-medium text-blue-700">
                    Format yang diterima: <span className="font-bold">PDF</span>. Maks. ukuran file <span className="font-bold">20 MB</span>.
                  </p>
                </div>

                {/* Jenis Dokumen */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag size={11} className="text-slate-400" />
                    Jenis Dokumen <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all appearance-none cursor-pointer text-slate-700"
                    >
                      <option value="" disabled>Pilih jenis dokumen...</option>
                      {draftTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Riset Terkait */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <BookOpen size={11} className="text-slate-400" />
                    Riset Terkait <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={uploadRiset}
                      onChange={(e) => setUploadRiset(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all appearance-none cursor-pointer text-slate-700"
                    >
                      <option value="" disabled>Pilih riset...</option>
                      {risetOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Judul */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText size={11} className="text-slate-400" />
                    Judul Dokumen <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Masukkan judul draft..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all"
                  />
                </div>

                {/* PDF Drop Zone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Upload size={11} className="text-slate-400" />
                    File PDF <span className="text-red-500">*</span>
                  </label>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center gap-2.5 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#6C47FF] bg-[#F8F5FF]"
                        : uploadedFile
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      className="sr-only"
                      onChange={handleFileInput}
                    />
                    {uploadedFile ? (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 size={22} strokeWidth={2} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black text-emerald-700 truncate max-w-[240px]">{uploadedFile}</p>
                          <p className="text-[11px] text-emerald-600 mt-0.5">File siap diupload</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setUploadedFile(null); }}
                          className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Ganti file
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDragging ? "bg-[#6C47FF]/10 text-[#6C47FF]" : "bg-slate-200 text-slate-400"}`}>
                          <Upload size={20} strokeWidth={2} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black text-slate-500">
                            {isDragging ? "Lepaskan file di sini" : "Seret & lepas file PDF"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">atau <span className="text-[#6C47FF] font-bold">klik untuk memilih</span></p>
                        </div>
                      </>
                    )}
                  </label>
                </div>

                {/* Upload Button */}
                <button
                  onClick={() => {
                    if (uploadedFile && uploadType && uploadRiset && uploadTitle) {
                      setUploadedFile(null);
                      setUploadType("");
                      setUploadRiset("");
                      setUploadTitle("");
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    uploadedFile && uploadType && uploadRiset && uploadTitle
                      ? "bg-[#6C47FF] hover:bg-[#5835e5] text-white shadow-sm shadow-[#6C47FF]/20"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Upload size={15} strokeWidth={2.5} />
                  Upload Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedDraft && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setSelectedDraft(null)}
        >
          <div
            className="bg-white w-full max-w-[560px] rounded-[22px] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <DraftTypeIcon type={selectedDraft.type} status={selectedDraft.status} />
                <div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{selectedDraft.type}</p>
                  <h2 className="text-sm font-black text-foreground leading-snug max-w-[340px] line-clamp-2 mt-0.5">
                    {selectedDraft.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedDraft(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* File Preview Placeholder */}
            <div className="mx-6 mt-5 rounded-[14px] bg-slate-50 border border-slate-200 h-[160px] flex flex-col items-center justify-center gap-3 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #6C47FF, #6C47FF 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, #6C47FF, #6C47FF 1px, transparent 1px, transparent 28px)" }} />
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm z-10">
                <ScrollText size={26} />
              </div>
              <div className="text-center z-10">
                <p className="text-xs font-black text-slate-400">Preview Dokumen</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Klik "Unduh" untuk melihat file lengkap</p>
              </div>
            </div>

            {/* Info Rows */}
            <div className="px-6 py-5 grid grid-cols-2 gap-4">
              {[
                { label: "Jenis Dokumen", value: selectedDraft.type, icon: <Tag size={13} className="text-slate-400" /> },
                { label: "Tanggal Upload", value: selectedDraft.uploadDate, icon: <Calendar size={13} className="text-slate-400" /> },
                { label: "Ukuran File", value: `${selectedDraft.fileSize} · ${selectedDraft.format}`, icon: <HardDrive size={13} className="text-slate-400" /> },
                { label: "Versi", value: selectedDraft.version, icon: <RotateCcw size={13} className="text-slate-400" /> },
                { label: "Riset", value: selectedDraft.riset, icon: <BookOpen size={13} className="text-slate-400" /> },
                { label: "Status", value: "", icon: null, statusBadge: true },
              ].map((row) => (
                <div key={row.label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    {row.icon}
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{row.label}</p>
                  </div>
                  {row.statusBadge ? (
                    <StatusBadge status={selectedDraft.status} />
                  ) : (
                    <p className="text-sm font-bold text-foreground">{row.value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Lecturer Comment */}
            {selectedDraft.comment && (
              <div className="mx-6 mb-5 rounded-[14px] bg-slate-50 border border-slate-200 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-slate-500" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Komentar Dosen Pembimbing</p>
                </div>
                <p className="text-sm text-foreground font-medium leading-relaxed">
                  {selectedDraft.comment}
                </p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-slate-50/50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedDraft(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
              <div className="flex items-center gap-2.5">
                {selectedDraft.status !== "Disetujui" && (
                  <button
                    onClick={() => { setSelectedDraft(null); openRevisi(selectedDraft); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6C47FF] hover:bg-[#5835e5] text-white text-sm font-bold transition-all shadow-sm shadow-[#6C47FF]/20"
                  >
                    <RotateCcw size={14} strokeWidth={2.5} />
                    Upload Revisi
                  </button>
                )}
                <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-sm shadow-emerald-500/20">
                  <Download size={14} strokeWidth={2.5} />
                  Unduh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Revisi Modal ─── */}
      {revisiDraft && (
        <div
          className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={closeRevisi}
        >
          <div
            className="bg-white w-full max-w-[480px] rounded-[22px] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8F5FF] text-[#6C47FF] flex items-center justify-center shrink-0">
                  <RotateCcw size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Upload Revisi</p>
                  <h2 className="text-sm font-black text-foreground leading-snug mt-0.5 max-w-[300px] line-clamp-2">
                    {revisiDraft.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={closeRevisi}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors shrink-0 mt-0.5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">

              {/* Info about current version */}
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <FileText size={15} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Versi saat ini</p>
                  <p className="text-xs font-bold text-amber-800 mt-0.5">
                    {revisiDraft.version} · {revisiDraft.type} · {revisiDraft.uploadDate}
                  </p>
                </div>
                <StatusBadge status={revisiDraft.status} />
              </div>

              {/* Catatan Revisi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare size={11} className="text-slate-400" />
                  Catatan Perubahan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={revisiNotes}
                  onChange={(e) => setRevisiNotes(e.target.value)}
                  placeholder="Jelaskan perubahan yang dilakukan pada revisi ini, misal: Memperbaiki Bab 3, menambahkan diagram arsitektur sistem..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none resize-none transition-all"
                />
              </div>

              {/* PDF Drop Zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Upload size={11} className="text-slate-400" />
                  File PDF Revisi <span className="text-red-500">*</span>
                </label>
                <label
                  onDragOver={(e) => { e.preventDefault(); setRevisiDragging(true); }}
                  onDragLeave={() => setRevisiDragging(false)}
                  onDrop={handleRevisiDrop}
                  className={`relative flex flex-col items-center justify-center gap-2.5 border-2 border-dashed rounded-xl p-7 cursor-pointer transition-all ${
                    revisiDragging
                      ? "border-[#6C47FF] bg-[#F8F5FF]"
                      : revisiFile
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    onChange={handleRevisiFileInput}
                  />
                  {revisiFile ? (
                    <>
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={24} strokeWidth={2} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-emerald-700 truncate max-w-[280px]">{revisiFile}</p>
                        <p className="text-[11px] text-emerald-600 mt-0.5">File revisi siap diupload</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setRevisiFile(null); }}
                        className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Ganti file
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${revisiDragging ? "bg-[#6C47FF]/10 text-[#6C47FF]" : "bg-slate-200 text-slate-400"}`}>
                        <Upload size={22} strokeWidth={2} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-500">
                          {revisiDragging ? "Lepaskan file di sini" : "Seret & lepas file PDF revisi"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          atau <span className="text-[#6C47FF] font-bold">klik untuk memilih</span> · Maks. 20 MB
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={closeRevisi}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (revisiFile && revisiNotes) closeRevisi();
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  revisiFile && revisiNotes
                    ? "bg-[#6C47FF] hover:bg-[#5835e5] text-white shadow-sm shadow-[#6C47FF]/20"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <RotateCcw size={14} strokeWidth={2.5} />
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}