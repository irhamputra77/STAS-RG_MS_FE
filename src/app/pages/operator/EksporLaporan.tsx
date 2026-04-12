import React from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarOff,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Loader2,
  RefreshCw,
  Users
} from "lucide-react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiGet } from "../../lib/api";
import {
  downloadCustomExport,
  ExportFormat,
  ExportTemplate,
  fetchExportTemplates
} from "../../lib/exportApi";

type OptionItem = {
  id: string;
  label: string;
  helper?: string;
};

type StudentRow = {
  id: string;
  label: string;
  helper?: string;
  angkatan?: string;
};

type ToastState = {
  type: "success" | "error";
  msg: string;
} | null;

const FORMAT_META: Record<ExportFormat, { label: string; icon: React.ReactNode }> = {
  xlsx: { label: "XLSX", icon: <FileSpreadsheet size={14} /> },
  csv: { label: "CSV", icon: <FileSpreadsheet size={14} /> },
  pdf: { label: "PDF", icon: <FileText size={14} /> }
};

const TEMPLATE_STYLES: Record<string, { icon: React.ReactNode; iconBg: string; border: string; bg: string }> = {
  kehadiran: {
    icon: <Calendar size={24} className="text-blue-600" />,
    iconBg: "bg-blue-100",
    border: "border-blue-200",
    bg: "bg-blue-50"
  },
  logbook: {
    icon: <BookOpen size={24} className="text-indigo-600" />,
    iconBg: "bg-indigo-100",
    border: "border-indigo-200",
    bg: "bg-indigo-50"
  },
  riset: {
    icon: <FlaskConical size={24} className="text-[#0AB600]" />,
    iconBg: "bg-green-100",
    border: "border-green-200",
    bg: "bg-green-50"
  },
  cuti: {
    icon: <CalendarOff size={24} className="text-orange-600" />,
    iconBg: "bg-orange-100",
    border: "border-orange-200",
    bg: "bg-orange-50"
  },
  "database-mahasiswa": {
    icon: <Users size={24} className="text-violet-600" />,
    iconBg: "bg-violet-100",
    border: "border-violet-200",
    bg: "bg-violet-50"
  },
  "layanan-surat": {
    icon: <FileText size={24} className="text-rose-600" />,
    iconBg: "bg-rose-100",
    border: "border-rose-200",
    bg: "bg-rose-50"
  }
};

const ATTENDANCE_STATUS_META = [
  { label: "Hadir", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { label: "Cuti", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { label: "Libur", className: "border-slate-200 bg-slate-100 text-slate-600" },
  { label: "Tidak Hadir", className: "border-red-200 bg-red-50 text-red-600" }
] as const;

function getTemplateStyle(templateId: string) {
  return TEMPLATE_STYLES[templateId] || {
    icon: <Download size={24} className="text-slate-600" />,
    iconBg: "bg-slate-100",
    border: "border-slate-200",
    bg: "bg-slate-50"
  };
}

function normalizeStudentOptions(rows: Array<any>): StudentRow[] {
  return (rows || [])
    .map((row) => ({
      id: String(row?.id || row?.student_id || row?.user_id || ""),
      label: row?.name || row?.full_name || row?.nama || "Mahasiswa",
      helper: row?.nim || row?.student_number || row?.program_studi || row?.program || undefined,
      angkatan: row?.angkatan ? String(row.angkatan) : undefined
    }))
    .filter((row) => row.id);
}

function normalizeProjectOptions(rows: Array<any>) {
  return (rows || [])
    .map((row) => ({
      id: String(row?.id || row?.project_id || ""),
      label: row?.short_title || row?.title || row?.judul || "Riset",
      helper: row?.mitra || row?.period_text || undefined
    }))
    .filter((row) => row.id);
}

function FieldShell({
  label,
  caption,
  children
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-foreground">{label}</label>
      {children}
      {caption && <p className="mt-1.5 text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

export default function EksporLaporan() {
  const [templates, setTemplates] = React.useState<ExportTemplate[]>([]);
  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [projects, setProjects] = React.useState<OptionItem[]>([]);
  const [angkatanOptions, setAngkatanOptions] = React.useState<string[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(true);
  const [filtersLoading, setFiltersLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState("");
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat | "">("");
  const [studentId, setStudentId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [angkatan, setAngkatan] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [pageError, setPageError] = React.useState("");
  const [toast, setToast] = React.useState<ToastState>(null);
  const [lastDownloadedFile, setLastDownloadedFile] = React.useState("");

  const selectedTemplate = templates.find((item) => item.id === selectedType) || null;
  const isAttendanceExport = selectedTemplate?.id === "kehadiran";
  const isStudentDatabaseExport = selectedTemplate?.id === "database-mahasiswa";

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast);
  };

  const loadPageData = async () => {
    setTemplatesLoading(true);
    setFiltersLoading(true);
    setPageError("");

    try {
      const [templateRows, studentRows, projectRows] = await Promise.all([
        fetchExportTemplates(),
        apiGet<Array<any>>("/students").catch(() => []),
        apiGet<Array<any>>("/research").catch(() => [])
      ]);

      const normalizedTemplates = Array.isArray(templateRows) ? templateRows : [];
      const normalizedStudents = normalizeStudentOptions(studentRows || []);
      const uniqueAngkatan = Array.from(
        new Set(
          normalizedStudents
            .map((student) => student.angkatan?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => right.localeCompare(left));

      setTemplates(normalizedTemplates);
      setStudents(normalizedStudents);
      setProjects(normalizeProjectOptions(projectRows || []));
      setAngkatanOptions(uniqueAngkatan);
      setSelectedType((current) => {
        if (current && normalizedTemplates.some((template) => template.id === current)) {
          return current;
        }
        return normalizedTemplates[0]?.id || "";
      });
    } catch (error: any) {
      setPageError(error?.message || "Gagal memuat metadata export custom.");
    } finally {
      setTemplatesLoading(false);
      setFiltersLoading(false);
    }
  };

  React.useEffect(() => {
    void loadPageData();
  }, []);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  React.useEffect(() => {
    if (!selectedTemplate) {
      setSelectedFormat("");
      setStudentId("");
      setProjectId("");
      setStartDate("");
      setEndDate("");
      return;
    }

    setSelectedFormat((current) => (
      current && selectedTemplate.formats.includes(current) ? current : ""
    ));

    if (!selectedTemplate.filters.student) setStudentId("");
    if (!selectedTemplate.filters.project) setProjectId("");
    if (!selectedTemplate.filters.dateRange || selectedTemplate.id === "database-mahasiswa") {
      setStartDate("");
      setEndDate("");
    }
    if (selectedTemplate.id !== "database-mahasiswa") {
      setAngkatan("");
    }
  }, [selectedTemplate]);

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedFormat) {
      showToast({ type: "error", msg: "Pilih jenis data dan format file terlebih dahulu." });
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      showToast({ type: "error", msg: "Tanggal dari tidak boleh lebih besar dari tanggal sampai." });
      return;
    }

    setGenerating(true);
    setPageError("");

    try {
      const fileName = await downloadCustomExport(
        {
          type: selectedTemplate.id,
          format: selectedFormat,
          studentId: selectedTemplate.filters.student ? studentId || undefined : undefined,
          projectId: selectedTemplate.filters.project ? projectId || undefined : undefined,
          angkatan: isStudentDatabaseExport ? angkatan || undefined : undefined,
          startDate: selectedTemplate.filters.dateRange && !isStudentDatabaseExport ? startDate || undefined : undefined,
          endDate: selectedTemplate.filters.dateRange && !isStudentDatabaseExport ? endDate || undefined : undefined
        },
        selectedTemplate
      );

      setLastDownloadedFile(fileName);
      showToast({ type: "success", msg: `File ${fileName} sedang diunduh.` });
    } catch (error: any) {
      showToast({ type: "error", msg: error?.message || "Gagal mengunduh file export." });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <OperatorLayout title="Ekspor Laporan">
      <div className="flex flex-col gap-6 pb-4">
        {toast && (
          <div
            className={`fixed right-6 top-6 z-[400] flex items-center gap-3 rounded-[14px] border px-5 py-3.5 text-sm font-bold shadow-xl ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-600"
            }`}
          >
            {toast.type === "success" ? <Check size={16} strokeWidth={3} /> : <AlertTriangle size={16} strokeWidth={2.5} />}
            {toast.msg}
          </div>
        )}

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {pageError}
          </div>
        )}

        <div className="rounded-[20px] border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-foreground">Export Custom</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Template, format, dan filter mengikuti metadata dari backend export.
              </p>
            </div>
            <button
              onClick={() => void loadPageData()}
              disabled={templatesLoading || filtersLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
            >
              {templatesLoading || filtersLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Memuat...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Muat Ulang Metadata
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-3 block text-xs font-black text-foreground">Jenis Data</label>
                {templatesLoading ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-[132px] animate-pulse rounded-[18px] border border-border bg-slate-100" />
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-border bg-slate-50 px-5 py-6 text-sm text-muted-foreground">
                    Backend belum mengirim template export. Coba muat ulang metadata atau cek endpoint `/exports/templates`.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {templates.map((template) => {
                      const isActive = selectedType === template.id;
                      const style = getTemplateStyle(template.id);
                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedType(template.id)}
                          className={`rounded-[18px] border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                            isActive
                              ? "border-[#0AB600] bg-[#F0FFF0]"
                              : `${style.border} ${style.bg} hover:border-[#0AB600]/40`
                          }`}
                        >
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${style.iconBg}`}>
                              {style.icon}
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-muted-foreground shadow-sm">
                              {template.period || "Kustom"}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-foreground">{template.title}</h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{template.desc}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {template.formats.map((format) => (
                              <span
                                key={format}
                                className="rounded-full border border-white bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600"
                              >
                                {format}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[18px] border border-border bg-slate-50 p-5">
              <div className="mb-5">
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Panel Export</p>
                <h3 className="mt-1 text-lg font-black text-foreground">
                  {selectedTemplate?.title || "Pilih jenis data"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAttendanceExport
                    ? "Export kehadiran mengikuti histori harian pada page attendance, termasuk status sintetis untuk hari tanpa absensi real."
                    : isStudentDatabaseExport
                      ? "Export database mahasiswa sekarang difilter berdasarkan angkatan, tanpa perlu memasukkan rentang tanggal."
                    : selectedTemplate?.desc || "Pilih salah satu template di kiri untuk mengatur format dan filter export."}
                </p>
              </div>

              <div className="flex flex-col gap-5">
                {isAttendanceExport && (
                  <div className="rounded-[16px] border border-blue-200 bg-blue-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        <Calendar size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-blue-900">Histori harian sintetis</p>
                        <p className="mt-1 text-xs leading-relaxed text-blue-800">
                          File export akan berisi status per hari sesuai page kehadiran mahasiswa. Rentang tanggal tetap bisa menghasilkan
                          data meskipun tidak ada `attendance_records` real pada setiap hari.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ATTENDANCE_STATUS_META.map((status) => (
                            <span
                              key={status.label}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}
                            >
                              {status.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isStudentDatabaseExport && (
                  <div className="rounded-[16px] border border-violet-200 bg-violet-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                        <Users size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-violet-900">Filter berdasarkan angkatan</p>
                        <p className="mt-1 text-xs leading-relaxed text-violet-800">
                          Export database mahasiswa tidak lagi membutuhkan rentang tanggal. Pilih angkatan tertentu atau kosongkan
                          untuk mengekspor seluruh mahasiswa yang tersedia.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <FieldShell
                  label="Format File"
                  caption={
                    selectedTemplate
                      ? "Format mengikuti kontrak backend untuk jenis data yang dipilih."
                      : "Format akan aktif setelah jenis data dipilih."
                  }
                >
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedTemplate?.formats || []).map((format) => {
                      const meta = FORMAT_META[format];
                      const isActive = selectedFormat === format;
                      return (
                        <button
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          className={`flex h-11 items-center justify-center gap-1.5 rounded-[12px] border text-xs font-black transition-all ${
                            isActive
                              ? "border-[#0AB600] bg-[#0AB600] text-white"
                              : "border-border bg-white text-muted-foreground hover:bg-slate-100"
                          }`}
                        >
                          {meta.icon} {meta.label}
                        </button>
                      );
                    })}
                    {selectedTemplate && selectedTemplate.formats.length === 0 && (
                      <div className="col-span-3 rounded-[12px] border border-dashed border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                        Template ini belum mengirim daftar format yang didukung.
                      </div>
                    )}
                  </div>
                </FieldShell>

                {selectedTemplate?.filters.student && (
                  <FieldShell
                    label="Mahasiswa"
                    caption={
                      filtersLoading
                        ? "Memuat daftar mahasiswa..."
                        : isAttendanceExport
                          ? "Kosongkan jika ingin histori harian semua mahasiswa yang sesuai filter."
                          : "Kosongkan jika ingin semua mahasiswa."
                    }
                  >
                    <select
                      value={studentId}
                      onChange={(event) => setStudentId(event.target.value)}
                      className="h-11 w-full rounded-[12px] border border-border bg-white px-3 text-sm text-foreground outline-none transition-all focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    >
                      <option value="">Semua Mahasiswa</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.helper ? `${student.label} - ${student.helper}` : student.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                )}

                {selectedTemplate?.filters.project && (
                  <FieldShell
                    label="Riset"
                    caption={
                      filtersLoading
                        ? "Memuat daftar riset..."
                        : isAttendanceExport
                          ? "Filter ini tetap dipakai backend untuk membatasi mahasiswa yang terkait dengan riset."
                          : "Kosongkan jika ingin semua riset."
                    }
                  >
                    <select
                      value={projectId}
                      onChange={(event) => setProjectId(event.target.value)}
                      className="h-11 w-full rounded-[12px] border border-border bg-white px-3 text-sm text-foreground outline-none transition-all focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    >
                      <option value="">Semua Riset</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.helper ? `${project.label} - ${project.helper}` : project.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                )}

                {isStudentDatabaseExport && (
                  <FieldShell
                    label="Angkatan"
                    caption={
                      filtersLoading
                        ? "Memuat daftar angkatan mahasiswa..."
                        : "Kosongkan jika ingin seluruh angkatan."
                    }
                  >
                    <select
                      value={angkatan}
                      onChange={(event) => setAngkatan(event.target.value)}
                      className="h-11 w-full rounded-[12px] border border-border bg-white px-3 text-sm text-foreground outline-none transition-all focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                    >
                      <option value="">Semua Angkatan</option>
                      {angkatanOptions.map((item) => (
                        <option key={item} value={item}>
                          Angkatan {item}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                )}

                {selectedTemplate?.filters.dateRange && !isStudentDatabaseExport && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldShell
                      label="Tanggal Dari"
                      caption={
                        isAttendanceExport
                          ? "Rentang tanggal dipakai untuk membentuk histori harian dengan format kirim YYYY-MM-DD."
                          : "Frontend mengirim format YYYY-MM-DD."
                      }
                    >
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="h-11 w-full rounded-[12px] border border-border bg-white px-3 text-sm text-foreground outline-none transition-all focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                      />
                    </FieldShell>
                    <FieldShell
                      label="Tanggal Sampai"
                      caption={
                        isAttendanceExport
                          ? "Hari dalam rentang bisa berstatus Hadir, Cuti, Libur, atau Tidak Hadir."
                          : "Boleh dikosongkan jika backend mengizinkan."
                      }
                    >
                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="h-11 w-full rounded-[12px] border border-border bg-white px-3 text-sm text-foreground outline-none transition-all focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                      />
                    </FieldShell>
                  </div>
                )}

                {!selectedTemplate && (
                  <div className="rounded-[14px] border border-dashed border-border bg-white px-4 py-4 text-sm text-muted-foreground">
                    Belum ada jenis data yang dipilih. Tombol download akan aktif setelah jenis data dan format file dipilih.
                  </div>
                )}

                {lastDownloadedFile && (
                  <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    Unduhan terakhir: {lastDownloadedFile}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedTemplate || !selectedFormat}
                  className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#0AB600] text-sm font-black text-white shadow-sm transition-all hover:bg-[#099800] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Menyiapkan file export...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Generate dan Unduh
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
