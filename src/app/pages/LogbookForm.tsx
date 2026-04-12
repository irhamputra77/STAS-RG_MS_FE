import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useNavigate, useSearchParams } from "react-router";
import { apiGet, apiPost, apiPut, getStoredUser } from "../lib/api";
import {
  fileToDataUrl,
  formatAttachmentSize,
  LogbookAttachmentView,
  MAX_LOGBOOK_ATTACHMENT_BYTES,
  mapLogbookAttachment,
  validateLogbookAttachment
} from "../lib/logbookAttachments";
import { 
  ChevronLeft, 
  UploadCloud, 
  X, 
  FileText,
  Bold, 
  Italic, 
  List, 
  Link2
} from "lucide-react";


export default function LogbookForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getStoredUser();
  const editId = searchParams.get("edit");

  const [researchOptions, setResearchOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingEntry, setLoadingEntry] = useState(Boolean(editId));

  // Form State
  const [research, setResearch] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [output, setOutput] = useState("");
  const [issues, setIssues] = useState("");
  const [category, setCategory] = useState("");

  // StudentId state
  const [studentId, setStudentId] = useState<string>("");

  const [existingAttachment, setExistingAttachment] = useState<LogbookAttachmentView | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  // Fetch research options
  useEffect(() => {
    const loadResearch = async () => {
      try {
        const projects = await apiGet<Array<{ id: string; short_title?: string; title: string }>>("/research");
        setResearchOptions(
          projects.map((project) => ({
            id: project.id,
            title: project.short_title || project.title
          }))
        );
      } catch {
        setResearchOptions([]);
      }
    };
    loadResearch();
  }, []);

  // Fetch studentId jika role mahasiswa
  useEffect(() => {
    const fetchStudentId = async () => {
      if (user?.role === "mahasiswa" && user?.id) {
        try {
          const profile = await apiGet<any>(`/profile/${user.id}`);
          if (profile && profile.nim && profile.id) {
            setStudentId(profile.id); // id mahasiswa (students.id)
          } else if (profile && profile.student_id) {
            setStudentId(profile.student_id);
          } else {
            setStudentId("");
          }
        } catch {
          setStudentId("");
        }
      }
    };
    fetchStudentId();
  }, [user]);

  useEffect(() => {
    const loadEntry = async () => {
      if (!editId) {
        setLoadingEntry(false);
        return;
      }

      try {
        const entries = await apiGet<Array<any>>(`/logbooks${user?.id ? `?studentId=${encodeURIComponent(user.id)}` : ""}`);
        const entry = (entries || []).find((item) => item.id === editId);
        if (!entry) {
          setError("Entri logbook yang akan diedit tidak ditemukan.");
          return;
        }

        setResearch(entry.project_id || "");
        setDate(entry.date || "");
        setTitle(entry.title || "");
        setDescription(entry.description || "");
        setOutput(entry.output || "");
        setIssues(entry.kendala || "");
        setCategory(entry.category || "pengembangan");
        setExistingAttachment(mapLogbookAttachment(entry));
        setSelectedFile(null);
        setRemoveExistingAttachment(false);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat entri logbook.");
      } finally {
        setLoadingEntry(false);
      }
    };

    loadEntry();
  }, [editId, user?.id]);

  const visibleAttachment = selectedFile
    ? {
        name: selectedFile.name,
        size: selectedFile.size,
        sizeLabel: formatAttachmentSize(selectedFile.size),
        url: null
      }
    : existingAttachment && !removeExistingAttachment
      ? existingAttachment
      : null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validationMessage = validateLogbookAttachment(file);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setSelectedFile(file);
    setRemoveExistingAttachment(false);
  };

  const removeFile = () => {
    if (selectedFile) {
      setSelectedFile(null);
      return;
    }

    if (existingAttachment) {
      setRemoveExistingAttachment(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");


    if (!user?.id) {
      setError("User tidak ditemukan. Silakan login ulang.");
      return;
    }
    if (user?.role === "mahasiswa" && !studentId) {
      setError("ID mahasiswa tidak ditemukan. Silakan refresh atau hubungi admin.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        projectId: research,
        date,
        title,
        description,
        output,
        kendala: issues,
        ...(selectedFile
          ? {
              fileName: selectedFile.name,
              fileDataUrl: await fileToDataUrl(selectedFile)
            }
          : {}),
        ...(!selectedFile && existingAttachment && removeExistingAttachment
          ? { clearAttachment: true }
          : {})
      };

      if (editId) {
        await apiPut<{ message: string }>(`/logbooks/${editId}`, payload);
      } else {
        await apiPost<{ message: string }>("/logbooks", {
          id: `LB${Date.now()}`,
          studentId: user.role === "mahasiswa" ? studentId : user.id,
          ...payload
        });
      }

      navigate("/logbook");
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan entri logbook.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title={editId ? "Edit Entri Logbook" : "Tambah Entri Logbook"}>
      <div className="w-full mx-auto px-8 py-6 flex flex-col gap-6 relative">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/logbook")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-none">{editId ? "Edit Entri Logbook" : "Tambah Entri Logbook"}</h1>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[14px] shadow-sm border border-border p-8 w-full max-w-[800px] mx-auto mb-10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
              <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {loadingEntry && (
              <div className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600">
                Memuat entri logbook...
              </div>
            )}
            
            {/* 2-Column Row for Research & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Pilih Riset</label>
                <div className="relative">
                  <select 
                    value={research}
                    onChange={(e) => setResearch(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                    required
                  >
                    <option value="" disabled>Pilih riset aktif...</option>
                    {researchOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.title}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Tanggal Kegiatan</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                  required
                />
              </div>
            </div>

            {/* Entry Title */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Judul Kegiatan</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Setup environment Python dan TensorFlow"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                required
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Kategori</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                  required
                >
                  <option value="" disabled>Pilih kategori kegiatan...</option>
                  <option value="penelitian">Penelitian / Analisis</option>
                  <option value="pengembangan">Pengembangan / Coding</option>
                  <option value="dokumentasi">Dokumentasi</option>
                  <option value="rapat">Rapat / Diskusi</option>
                  <option value="lainnya">Lainnya</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {/* Description Textarea (Rich Text Mimic) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Kegiatan / Deskripsi</label>
              <div className="flex flex-col border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all bg-background">
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b border-border bg-white">
                  <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Bold size={14} /></button>
                  <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Italic size={14} /></button>
                  <div className="w-px h-4 bg-border mx-1"></div>
                  <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><List size={14} /></button>
                  <div className="w-px h-4 bg-border mx-1"></div>
                  <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Link2 size={14} /></button>
                </div>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ceritakan detail kegiatan yang dilakukan pada hari ini..."
                  className="w-full min-h-[160px] p-4 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60 custom-scrollbar resize-y"
                  required
                ></textarea>
              </div>
            </div>

            {/* Output & Kendala Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Output / Hasil</label>
                <textarea 
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder="Apa hasil dari kegiatan ini? (misal: Dokumen, Script, Model)"
                  className="w-full min-h-[100px] p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60 custom-scrollbar resize-y"
                ></textarea>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Kendala</label>
                <textarea 
                  value={issues}
                  onChange={(e) => setIssues(e.target.value)}
                  placeholder="Apakah ada kendala yang dihadapi selama proses ini?"
                  className="w-full min-h-[100px] p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60 custom-scrollbar resize-y"
                ></textarea>
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="flex flex-col gap-3 mt-2">
              <label className="text-sm font-semibold text-foreground">Lampiran</label>
              
              {/* Dropzone */}
              <label className="border-2 border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-primary/5 transition-colors rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Klik atau pilih file lampiran</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mendukung PDF, DOC, DOCX, JPG, JPEG, PNG, ZIP (Max. {Math.round(MAX_LOGBOOK_ATTACHMENT_BYTES / (1024 * 1024))}MB)
                  </p>
                </div>
              </label>

              {/* Uploaded Chips */}
              {visibleAttachment && (
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">File Terlampir (1)</span>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-3 bg-background border border-border px-3 py-2 rounded-lg">
                      <FileText size={16} className="text-primary" />
                      <div className="flex flex-col min-w-[120px]">
                        <span className="text-xs font-semibold text-foreground">{visibleAttachment.name}</span>
                        <span className="text-[10px] text-muted-foreground">{visibleAttachment.sizeLabel}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={removeFile}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-2"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-6 border-t border-border">
              <button 
                type="button"
                onClick={() => navigate("/logbook")}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-foreground bg-white border border-border hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={submitting || loadingEntry}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
              >
                {submitting ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Simpan Entri"}
              </button>
            </div>

          </form>
        </div>

      </div>
    </Layout>
  );
}
