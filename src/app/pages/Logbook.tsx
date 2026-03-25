import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { apiDelete, apiGet, getStoredUser } from "../lib/api";
import { 
  Plus, CheckCircle2, Clock, Paperclip, ChevronLeft, ChevronRight, 
  FileText, Download, Target, AlertCircle, CheckCircle, Users,
  Globe, Calendar, Microscope, ChevronDown, X, Pencil, Trash2
} from "lucide-react";

export default function Logbook() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<any | null>(null);
  const [researches, setResearches] = useState<any[]>([]);
  const [logbookEntries, setLogbookEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatDisplayDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const studentId = user?.id;
        const [projects, entries] = await Promise.all([
          apiGet<Array<any>>("/research"),
          apiGet<Array<any>>(`/logbooks${studentId ? `?studentId=${studentId}` : ""}`)
        ]);

        const entriesByProject = entries.reduce((acc, entry) => {
          const key = entry.project_id || "";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const researchMapped = projects.map((project, index) => ({
          id: project.id,
          name: project.short_title || project.title,
          role: "Anggota",
          status: project.status,
          entries: entriesByProject[project.id] || 0,
          supervisor: project.supervisor_name || "-",
          period: project.period_text || "-",
          progress: project.progress || 0,
          color: ["primary", "success", "info"][index % 3]
        }));

        const mappedEntries = entries.map((entry) => {
          const date = new Date(entry.date);
          const comments = Array.isArray(entry.comments) ? entry.comments : [];
          return {
            id: entry.id,
            researchId: entry.project_id,
            date: Number.isNaN(date.getTime()) ? "-" : String(date.getDate()),
            month: Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID", { month: "short" }).toUpperCase(),
            fullDate: formatDisplayDate(entry.date),
            title: entry.title,
            preview: entry.description,
            tag: entry.project_name || "Tanpa Riset",
            tagColor: "primary",
            hasAttachment: Boolean(entry.has_attachment),
            attachmentCount: entry.has_attachment ? 1 : 0,
            description: entry.description,
            output: entry.output || "-",
            kendala: entry.kendala || "-",
            comments,
            commentsCount: Number(entry.comments_count) || comments.length,
            attachments: entry.has_attachment ? [{ name: "Lampiran", size: "-" }] : []
          };
        });

        setResearches(researchMapped);
        setLogbookEntries(mappedEntries);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data logbook.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Derived state
  const filteredEntries = useMemo(() => {
    if (!activeResearchId) return logbookEntries;
    return logbookEntries.filter((entry) => entry.researchId === activeResearchId);
  }, [activeResearchId, logbookEntries]);

  return (
    <Layout title="Logbook">
      {/* 
        The main scrollable area is padded. 
        Instead of the split layout, we use full width for everything.
      */}
      <div className="w-full mx-auto px-8 py-6 flex flex-col gap-6 relative">
        
        {/* Page Header Area */}
        <div className="flex items-end justify-between w-full">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mahasiswa</span>
            <h1 className="text-2xl font-bold text-foreground leading-none">Logbook</h1>
          </div>
          <button 
            onClick={() => navigate('/logbook/new')}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-[12px] font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} />
            Tambah Entri
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Research Filter Cards Area */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Filter Riset</h2>
            <div className="h-7 flex items-center">
              {activeResearchId !== null && (
                <button 
                  onClick={() => setActiveResearchId(null)}
                  className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
                >
                  <X size={14} /> Reset Filter
                </button>
              )}
            </div>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-2 snap-x custom-scrollbar">
            {researches.map((res) => {
              const isActive = activeResearchId === res.id;
              
              // Helper for dynamic colors
              const themeColors: Record<string, { hex: string, bg: string, twText: string, twBg: string, twBgSolid: string }> = {
                primary: { hex: '#6C47FF', bg: 'rgba(108, 71, 255, 0.03)', twText: 'text-primary', twBg: 'bg-primary/10', twBgSolid: 'bg-primary' },
                success: { hex: '#10B981', bg: 'rgba(16, 185, 129, 0.03)', twText: 'text-success', twBg: 'bg-success/10', twBgSolid: 'bg-success' },
                info: { hex: '#3B82F6', bg: 'rgba(59, 130, 246, 0.03)', twText: 'text-info', twBg: 'bg-info/10', twBgSolid: 'bg-info' },
              };
              const c = themeColors[res.color] || themeColors.primary;
              
              return (
                <div 
                  key={res.id}
                  onClick={() => setActiveResearchId(activeResearchId === res.id ? null : res.id)}
                  className={`bg-white rounded-[14px] p-5 cursor-pointer transition-all flex flex-col gap-4 border w-full min-w-[300px] md:w-[calc(50%-8px)] shrink-0 snap-start ${
                    isActive 
                      ? 'shadow-sm' 
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                  style={isActive ? { borderColor: c.hex, backgroundColor: c.bg, boxShadow: `0 0 0 1px ${c.hex}` } : {}}
                >
                  {/* Top Row: Icon, Title, Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.twBg} ${c.twText}`}>
                        {res.color === 'primary' ? <Microscope size={20} /> : <Globe size={20} />}
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-bold text-base text-foreground line-clamp-1">{res.name}</h3>
                        <span className="text-xs text-muted-foreground">{res.role}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full ${c.twBg} ${c.twText}`}>
                      {res.status}
                    </span>
                  </div>

                  {/* Info Row */}
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <FileText size={14} className={`${c.twText} opacity-70`} /> {res.entries} entri
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap truncate">
                      <Users size={14} className={`${c.twText} opacity-70`} /> {res.supervisor}
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar size={14} className={`${c.twText} opacity-70`} /> {res.period}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5 mt-auto pt-1">
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${c.twBgSolid}`} 
                        style={{ width: `${res.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Progress riset: {res.progress}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 Mini Stat Chips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-border rounded-[14px] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-default">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10 shadow-[inset_0_2px_4px_rgba(108,71,255,0.05)]">
              <FileText size={22} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Entri Bulan Ini</span>
              <span className="text-xl font-black text-foreground leading-none">{logbookEntries.length}</span>
            </div>
          </div>
          
          <div className="bg-white border border-border rounded-[14px] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-default">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/5 text-[#3B82F6] flex items-center justify-center shrink-0 border border-[#3B82F6]/10 shadow-[inset_0_2px_4px_rgba(59,130,246,0.05)]">
              <Calendar size={22} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Terakhir Diisi</span>
              <span className="text-sm font-bold text-foreground leading-tight">{logbookEntries[0]?.fullDate || "-"}</span>
            </div>
          </div>
          
          <div className="bg-white border border-border rounded-[14px] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-default">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent flex items-center justify-center shrink-0 border border-accent/10 shadow-[inset_0_2px_4px_rgba(245,158,11,0.05)]">
              <Microscope size={22} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Riset Aktif</span>
              <span className="text-xl font-black text-foreground leading-none">{researches.length}</span>
            </div>
          </div>
        </div>

        {/* List of Logbook Entries */}
        <div className="bg-white border border-border rounded-[14px] shadow-sm flex flex-col mt-2 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-2.5">
              <FileText size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">Daftar Entri Logbook</h2>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Maret 2026</span>
          </div>
          
          {/* List Content */}
          <div className="flex flex-col">
            {loading && (
              <div className="text-center py-10 text-sm text-muted-foreground">Memuat data logbook...</div>
            )}
            {filteredEntries.map((entry, idx) => (
              <div 
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`p-5 flex items-start gap-5 hover:bg-muted/30 cursor-pointer transition-colors group ${
                  idx !== filteredEntries.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                {/* Left: Date */}
                <div className="flex flex-col items-center justify-center w-12 shrink-0 pt-1">
                  <span className="text-2xl font-black text-primary leading-none">{entry.date}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{entry.month}</span>
                </div>
                
                {/* Middle: Content */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {entry.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed max-w-4xl">
                    {entry.preview}
                  </p>
                  
                  {/* Pills / Meta */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                      entry.tagColor === 'primary' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-success/10 text-success'
                    }`}>
                      {entry.tag}
                    </span>
                    {entry.hasAttachment && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Paperclip size={12} /> {entry.attachmentCount} lampiran
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {entry.fullDate}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="shrink-0 pt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/logbook/new'); // Navigate to form, in reality passing ID
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Edit Entri"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEntryToDelete(entry);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Hapus Entri"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {!loading && filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">Belum ada entri logbook untuk riset ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* 
          Detail Modal - Replacing the right column 
          This ensures we keep the detail functionality but match the visual layout of the reference!
        */}
        {selectedEntry && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl max-h-full rounded-[16px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedEntry.tagColor === 'primary' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                  }`}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Detail Entri</h2>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{selectedEntry.fullDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedEntry(null);
                      navigate('/logbook/new'); // In reality, this would navigate to edit specific ID
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Edit Entri"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedEntry(null);
                      setEntryToDelete(selectedEntry);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Hapus Entri"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="w-px h-4 bg-border mx-1"></div>
                  <button 
                    onClick={() => setSelectedEntry(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                
                {/* Title & Tag */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${
                      selectedEntry.tagColor === 'primary' 
                        ? 'bg-primary/5 text-primary border-primary/20' 
                        : 'bg-success/5 text-success border-success/20'
                    }`}>
                      {selectedEntry.tag}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-foreground leading-tight">
                    {selectedEntry.title}
                  </h1>
                </div>

                <div className="h-px w-full bg-border"></div>

                {/* Content Sections */}
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FileText size={16} className="text-muted-foreground" /> Deskripsi Kegiatan
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedEntry.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Target size={16} className="text-muted-foreground" /> Hasil / Output
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedEntry.output}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <AlertCircle size={16} className="text-muted-foreground" /> Kendala / Solusi
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedEntry.kendala}
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
                  <>
                    <div className="h-px w-full bg-border"></div>
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Paperclip size={16} className="text-primary" /> Lampiran
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedEntry.attachments.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-[12px] border border-border bg-muted/10 hover:border-primary/30 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center shrink-0 shadow-sm">
                                <FileText size={14} className="text-primary" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">{file.name}</span>
                                <span className="text-[10px] text-muted-foreground">{file.size}</span>
                              </div>
                            </div>
                            <button className="w-8 h-8 rounded-full hover:bg-white text-muted-foreground hover:text-primary flex items-center justify-center transition-colors shrink-0 shadow-sm border border-transparent hover:border-border">
                              <Download size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px w-full bg-border"></div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-foreground">Komentar Dosen</h3>
                  {selectedEntry.comments?.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                      {selectedEntry.comments.map((comment: any) => (
                        <div key={comment.id || `${comment.authorId}-${comment.createdAt}`} className="p-3 rounded-[10px] border border-indigo-100 bg-indigo-50/60">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <p className="text-xs font-bold text-indigo-800">{comment.authorName || "Dosen"}</p>
                            <p className="text-[10px] text-indigo-500">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString("id-ID") : "-"}
                            </p>
                          </div>
                          <p className="text-xs text-indigo-900 leading-relaxed">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Belum ada komentar dari dosen.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {entryToDelete && (
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Hapus Entri Logbook?</h3>
                <p className="text-sm text-muted-foreground">
                  Apakah Anda yakin ingin menghapus entri <span className="font-semibold text-foreground">"{entryToDelete.title}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="px-6 py-4 bg-muted/30 flex items-center justify-end gap-3 border-t border-border">
                <button 
                  onClick={() => setEntryToDelete(null)}
                  className="px-4 py-2 text-sm font-bold text-foreground bg-white border border-border rounded-xl hover:bg-muted transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    if (!entryToDelete?.id) return;
                    try {
                      await apiDelete<{ message: string }>(`/logbooks/${entryToDelete.id}`);
                      setLogbookEntries((prev) => prev.filter((item) => item.id !== entryToDelete.id));
                    } catch (err: any) {
                      setError(err?.message || "Gagal menghapus entri logbook.");
                    } finally {
                      setEntryToDelete(null);
                    }
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-destructive rounded-xl hover:bg-destructive/90 transition-colors shadow-md shadow-destructive/20"
                >
                  Hapus Entri
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
