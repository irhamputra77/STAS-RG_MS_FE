import React, { useState } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { Download, Calendar, BookOpen, FlaskConical, CalendarOff, Check, FileSpreadsheet, FileText } from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";

const QUICK_EXPORTS = [
  { id: "kehadiran", icon: <Calendar size={24} className="text-blue-600" />, title: "Rekap Kehadiran", desc: "Data kehadiran seluruh mahasiswa aktif beserta durasi harian.", period: "Maret 2026", bg: "bg-blue-50", border: "border-blue-200", iconBg: "bg-blue-100" },
  { id: "logbook", icon: <BookOpen size={24} className="text-indigo-600" />, title: "Logbook Mahasiswa", desc: "Semua entri logbook dari seluruh mahasiswa dalam periode berjalan.", period: "Maret 2026", bg: "bg-indigo-50", border: "border-indigo-200", iconBg: "bg-indigo-100" },
  { id: "riset", icon: <FlaskConical size={24} className="text-[#0AB600]" />, title: "Data Riset", desc: "Ringkasan progres, milestone, dan anggota semua proyek riset.", period: "Semua Waktu", bg: "bg-green-50", border: "border-green-200", iconBg: "bg-green-100" },
  { id: "cuti", icon: <CalendarOff size={24} className="text-orange-600" />, title: "Ringkasan Cuti", desc: "Histori pengajuan cuti, status persetujuan, dan sisa jatah.", period: "Maret 2026", bg: "bg-orange-50", border: "border-orange-200", iconBg: "bg-orange-100" },
];

export default function EksporLaporan() {
  const [quickExports, setQuickExports] = useState(QUICK_EXPORTS);
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [format, setFormat] = useState("XLSX");
  const [generating, setGenerating] = useState(false);
  const [customDone, setCustomDone] = useState(false);
  const [selectedData, setSelectedData] = useState<string[]>(["kehadiran"]);
  const [error, setError] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [customDownloadUrl, setCustomDownloadUrl] = useState("");
  
  // Filter states
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [researches, setResearches] = useState<Array<{ id: string; title: string }>>([]);
  const [dateFromCustom, setDateFromCustom] = useState("");
  const [dateToCustom, setDateToCustom] = useState("");
  const [customStudentFilter, setCustomStudentFilter] = useState("");
  const [customResearchFilter, setCustomResearchFilter] = useState("");

  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const rows = await apiGet<Array<any>>("/exports/templates");
        if (rows.length > 0) {
          setQuickExports((prev) => prev.map((item) => {
            const found = rows.find((row) => row.id === item.id);
            return found ? { ...item, title: found.title, desc: found.desc, period: found.period } : item;
          }));
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuat template ekspor");
      }
    };

    loadTemplates();
  }, []);

  React.useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [studentRows, researchRows] = await Promise.all([
          apiGet<Array<any>>("/students").catch(() => []),
          apiGet<Array<any>>("/research").catch(() => [])
        ]);
        setStudents((studentRows || []).map(s => ({ id: s.id, name: s.name })));
        setResearches((researchRows || []).map(r => ({ id: r.id, title: r.title || r.short_title })));
      } catch (err: any) {
        console.error("Gagal memuat data filter:", err?.message);
      }
    };

    loadFiltersData();
  }, []);

  const handleQuickExport = async (id: string) => {
    if (done.includes(id)) return;
    setLoading(id);
    try {
      const response = await apiPost<any>("/exports/generate", { format, selectedData: [id] });
      const downloadUrl = response?.downloadUrl || `${window.location.origin}/api/exports/download?id=${response?.id}&format=${format}`;
      setDownloadUrls((prev) => ({ ...prev, [id]: downloadUrl }));
      setDone((prev) => [...prev, id]);
    } catch (err: any) {
      setError(err?.message || "Gagal menyiapkan ekspor");
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = (downloadUrl: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || `laporan-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickDownload = (id: string) => {
    const url = downloadUrls[id];
    if (url) handleDownload(url, `laporan-${id}-${Date.now()}.${format.toLowerCase()}`);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setCustomDone(false);
    try {
      const filters: any = {};
      
      // Add custom export filters
      if (customStudentFilter) {
        filters.customStudentId = customStudentFilter;
      }
      if (customResearchFilter) {
        filters.customResearchId = customResearchFilter;
      }
      if (dateFromCustom || dateToCustom) {
        filters.customDateFrom = dateFromCustom;
        filters.customDateTo = dateToCustom;
      }

      const response = await apiPost<any>("/exports/generate", { format, selectedData });
      const downloadUrl = response?.downloadUrl || `${window.location.origin}/api/exports/download?id=${response?.id}&format=${format}`;
      setCustomDownloadUrl(downloadUrl);
      setCustomDone(true);
      // Auto download
      handleDownload(downloadUrl, `laporan-custom-${Date.now()}.${format.toLowerCase()}`);
    } catch (err: any) {
      setError(err?.message || "Gagal generate laporan");
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomDownloadAgain = () => {
    if (customDownloadUrl) handleDownload(customDownloadUrl, `laporan-custom-${Date.now()}.${format.toLowerCase()}`);
  };

  const toggleData = (id: string) => setSelectedData(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <OperatorLayout title="Ekspor Laporan">
      <div className="flex flex-col gap-6 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Quick Export */}
        <div>
          <h2 className="font-black text-foreground mb-1">Ekspor Cepat</h2>
          <p className="text-sm text-muted-foreground mb-4">Unduh laporan standar dengan satu klik.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {quickExports.map(q => {
              const isLoading = loading === q.id;
              const isDone = done.includes(q.id);
              return (
                <div key={q.id} className={`bg-white border rounded-[16px] p-5 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all ${q.border}`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center ${q.iconBg}`}>{q.icon}</div>
                    <span className="text-[10px] font-black text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{q.period}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-foreground">{q.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{q.desc}</p>
                  </div>
                  <button
                    onClick={() => handleQuickExport(q.id)}
                    disabled={isLoading || isDone}
                    className={`w-full h-9 rounded-[10px] text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      isDone ? "bg-emerald-500 text-white" : isLoading ? "bg-slate-100 text-slate-500 cursor-wait" : "bg-[#0AB600] hover:bg-[#099800] text-white shadow-sm"
                    }`}
                  >
                    {isLoading ? (
                      <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Menyiapkan...</>
                    ) : isDone ? (
                      <><Check size={14} strokeWidth={3} /> Siap Diunduh</>
                    ) : (
                      <><Download size={14} /> Ekspor</>
                    )}
                  </button>
                  {isDone && (
                    <button onClick={() => handleQuickDownload(q.id)} className="w-full h-8 bg-green-50 hover:bg-green-100 text-[#0AB600] text-xs font-black rounded-[10px] border border-green-200 flex items-center justify-center gap-1.5 transition-colors -mt-2">
                      <Download size={12} /> Unduh Sekarang
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Export */}
        <div className="bg-white border border-border rounded-[16px] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="font-black text-foreground">Ekspor Kustom</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pilih jenis data, periode, dan format sesuai kebutuhan.</p>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left */}
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-black text-foreground block mb-2">Jenis Data</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "kehadiran", label: "Rekap Kehadiran" },
                    { id: "logbook", label: "Logbook Mahasiswa" },
                    { id: "riset", label: "Data Riset" },
                    { id: "cuti", label: "Ringkasan Cuti" },
                    { id: "mahasiswa", label: "Database Mahasiswa" },
                    { id: "surat", label: "Layanan Surat" },
                  ].map(d => (
                    <label key={d.id} className={`flex items-center gap-2.5 p-3 rounded-[10px] border cursor-pointer transition-all ${selectedData.includes(d.id) ? "border-green-400 bg-green-50" : "border-border hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={selectedData.includes(d.id)} onChange={() => toggleData(d.id)} className="accent-[#0AB600] shrink-0" />
                      <span className="text-xs font-bold text-foreground">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-2">Format File</label>
                <div className="flex gap-2">
                  {["XLSX", "CSV", "PDF"].map(f => (
                    <button key={f} onClick={() => setFormat(f)} className={`flex-1 h-10 rounded-[10px] text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${format === f ? "bg-[#0AB600] text-white border-[#0AB600]" : "bg-white text-muted-foreground border-border hover:bg-slate-50"}`}>
                      {f === "PDF" ? <FileText size={14} /> : <FileSpreadsheet size={14} />} {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-5">
              {/* Custom Export Filters */}
              <div className="pt-3 border-t border-border">
                <label className="text-xs font-black text-foreground block mb-3">Filter Ekspor Kustom</label>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground mb-1">Mahasiswa (Opsional)</p>
                    <select value={customStudentFilter} onChange={(e) => setCustomStudentFilter(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all cursor-pointer">
                      <option value="">Semua Mahasiswa</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground mb-1">Riset (Opsional)</p>
                    <select value={customResearchFilter} onChange={(e) => setCustomResearchFilter(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all cursor-pointer">
                      <option value="">Semua Riset</option>
                      {researches.map(r => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">Tanggal Dari</p>
                      <input type="date" value={dateFromCustom} onChange={(e) => setDateFromCustom(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">Tanggal Sampai</p>
                      <input type="date" value={dateToCustom} onChange={(e) => setDateToCustom(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button onClick={handleGenerate} disabled={generating || selectedData.length === 0}
                className="h-11 bg-[#0AB600] hover:bg-[#099800] disabled:opacity-60 text-white font-black rounded-[12px] transition-all shadow-sm flex items-center justify-center gap-2">
                {generating ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menyiapkan Laporan...</>
                ) : (
                  <><Download size={16} /> Generate & Unduh ({format})</>
                )}
              </button>
              {customDone && (
                <button onClick={handleCustomDownloadAgain} className="w-full flex items-center gap-2 p-3 bg-green-50 border border-green-200 hover:bg-green-100 rounded-[10px] text-[#0AB600] text-sm font-black transition-colors">
                  <Check size={16} strokeWidth={3} /> Laporan siap! Klik untuk unduh kembali.
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
