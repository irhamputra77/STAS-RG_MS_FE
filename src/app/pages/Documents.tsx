import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { apiGet, apiPost, getStoredUser, resolveApiAssetUrl } from "../lib/api";
import {
  Plus,
  X,
  Check,
  Download,
  FileText,
  Award,
  Info,
  ChevronDown,
  Clock,
  CheckCircle2,
  Hourglass,
  AlertTriangle,
  Sparkles,
  BookOpen,
  CalendarClock,
  SendHorizonal,
} from "lucide-react";

type SuratStatus = "Menunggu" | "Diproses" | "Siap Unduh";

interface SuratRecord {
  id: string;
  jenis: string;
  tanggal: string;
  tujuan: string;
  status: SuratStatus;
  estimasi?: string;
  fileUrl?: string | null;
}

interface CertificateRecord {
  id: string;
  projectId: string;
  projectName: string;
  status: "Belum Diminta" | "Diproses" | "Terbit";
  issueDate?: string | null;
  certificateNumber?: string | null;
  fileUrl?: string | null;
}

const SuratStatusBadge = ({ status }: { status: SuratStatus }) => {
  const config: Record<SuratStatus, { cls: string; icon: React.ReactNode }> = {
    Menunggu: {
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: <Hourglass size={11} strokeWidth={2.5} />,
    },
    Diproses: {
      cls: "bg-blue-100 text-blue-700 border border-blue-200",
      icon: <Clock size={11} strokeWidth={2.5} />,
    },
    "Siap Unduh": {
      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle2 size={11} strokeWidth={2.5} />,
    },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${c.cls}`}>
      {c.icon}
      {status}
    </span>
  );
};

const suratJenisOptions = [
  "Surat Keterangan Aktif Magang",
  "Surat Pengantar Penelitian",
  "Surat Rekomendasi Dosen Pembimbing",
  "Surat Keterangan Penelitian",
  "Surat Izin Penggunaan Laboratorium",
  "Surat Keterangan Selesai Magang",
];

export default function Documents() {
  const user = getStoredUser();
  const [activeTab, setActiveTab] = useState<"surat" | "sertifikat">("surat");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJenis, setSelectedJenis] = useState("");
  const [tujuanPenggunaan, setTujuanPenggunaan] = useState("");
  const [suratData, setSuratData] = useState<SuratRecord[]>([]);
  const [certificateData, setCertificateData] = useState<CertificateRecord[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certProjectId, setCertProjectId] = useState("");
  const [certRequestNote, setCertRequestNote] = useState("");
  const [certFinishDate, setCertFinishDate] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentId = user?.id;
        const [rows, certRows, projectRows] = await Promise.all([
          apiGet<Array<any>>("/letter-requests"),
          apiGet<Array<any>>(`/certificates${studentId ? `?studentId=${studentId}` : ""}`),
          studentId ? apiGet<Array<any>>(`/research/assigned?userId=${encodeURIComponent(studentId)}`) : Promise.resolve([])
        ]);
        const mapped: SuratRecord[] = rows
          .filter((item) => !studentId || item.student_id === studentId)
          .map((item) => ({
            id: item.id,
            jenis: item.jenis,
            tanggal: item.tanggal,
            tujuan: item.tujuan,
            status: item.status,
            estimasi: item.estimasi || undefined,
            fileUrl: item.file_url || null
          }));

        const mappedCerts: CertificateRecord[] = certRows
          .filter((item) => !studentId || item.student_id === studentId)
          .map((item) => ({
            id: item.id,
            projectId: item.project_id,
            projectName: item.project_name || "Riset",
            status: item.status,
            issueDate: item.issue_date || null,
            certificateNumber: item.certificate_number || null,
            fileUrl: item.file_url || null
          }));

        setSuratData(mapped);
        setCertificateData(mappedCerts);
        const projectOptions = (projectRows || []).map((item) => ({
          id: item.id,
          title: item.short_title || item.title || item.id
        }));
        setAssignedProjects(projectOptions);
        if (!selectedProjectId && projectOptions.length > 0) {
          setSelectedProjectId(projectOptions[0].id);
        }
        if (!certProjectId && projectOptions.length > 0) {
          setCertProjectId(projectOptions[0].id);
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data dokumen.");
      }
    };

    loadData();
  }, [user?.id]);

  const submitLetterRequest = async () => {
    if (!user?.id) {
      setError("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (!selectedJenis || !tujuanPenggunaan.trim()) {
      setError("Jenis surat dan tujuan penggunaan wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const id = `S${Date.now()}`;
      const tanggal = new Date().toISOString().slice(0, 10);

      await apiPost<{ message: string }>("/letter-requests", {
        id,
        studentId: user.id,
        jenis: selectedJenis,
        tanggal,
        tujuan: tujuanPenggunaan
      });

      setSuratData((prev) => [
        { id, jenis: selectedJenis, tanggal, tujuan: tujuanPenggunaan, status: "Menunggu" },
        ...prev
      ]);
      setSelectedJenis("");
      setTujuanPenggunaan("");
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim pengajuan surat.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCertificateRequest = async () => {
    if (!user?.id) {
      setError("User tidak ditemukan. Silakan login ulang.");
      return;
    }
    if (!certProjectId) {
      setError("Pilih riset untuk sertifikat.");
      return;
    }
    const existing = certificateData.find((item) => item.projectId === certProjectId);
    if (existing && existing.status !== "Belum Diminta") {
      setError("Permintaan sertifikat untuk riset ini sudah ada.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const requestId = `CR${Date.now()}`;
      await apiPost<{ message: string }>("/certificates", {
        id: requestId,
        studentId: user.id,
        projectId: certProjectId,
        requestedBy: user.id,
        kontribusiSelesaiDate: certFinishDate || null,
        requestNote: certRequestNote || null
      });

      const projectTitle = assignedProjects.find((project) => project.id === certProjectId)?.title || "Riset";
      setCertificateData((prev) => {
        const next = prev.filter((item) => item.projectId !== certProjectId);
        return [
          {
            id: requestId,
            projectId: certProjectId,
            projectName: projectTitle,
            status: "Diproses",
            issueDate: null,
            certificateNumber: null,
            fileUrl: null
          },
          ...next
        ];
      });
      setCertModalOpen(false);
      setCertRequestNote("");
      setCertFinishDate("");
    } catch (err: any) {
      setError(err?.message || "Gagal mengajukan sertifikat.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Dokumen & Sertifikat">
      <div className="flex flex-col gap-6 max-w-[1060px] mx-auto">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Mahasiswa</p>
            <h1 className="text-2xl font-black text-foreground">Dokumen & Sertifikat</h1>
          </div>
          {activeTab === "surat" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#6C47FF] hover:bg-[#5835e5] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-[#6C47FF]/20 transition-all flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} />
              Ajukan Surat
            </button>
          )}
          {activeTab === "sertifikat" && (
            <button
              onClick={() => setCertModalOpen(true)}
              className="bg-[#6C47FF] hover:bg-[#5835e5] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-[#6C47FF]/20 transition-all flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} />
              Ajukan Sertifikat
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-[14px] w-fit">
          <button
            onClick={() => setActiveTab("surat")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-bold transition-all ${
              activeTab === "surat"
                ? "bg-white text-[#6C47FF] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={15} />
            Layanan Surat
          </button>
          <button
            onClick={() => setActiveTab("sertifikat")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-bold transition-all ${
              activeTab === "sertifikat"
                ? "bg-white text-[#6C47FF] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Award size={15} />
            Sertifikat
          </button>
        </div>

        {/* ─── TAB: LAYANAN SURAT ─── */}
        {activeTab === "surat" && (
          <div className="flex flex-col gap-5">

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-[14px] px-5 py-4 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                <Info size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-800">Informasi Layanan Surat</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Layanan surat diproses dalam <span className="font-bold">3–5 hari kerja</span> setelah pengajuan diterima. Pastikan data yang Anda isi lengkap dan benar untuk mempercepat proses.
                </p>
              </div>
            </div>

            {/* Surat Cards List */}
            <div className="flex flex-col gap-3.5">
              {suratData.map((surat) => (
                <div
                  key={surat.id}
                  className={`bg-white border rounded-[16px] p-5 shadow-sm flex items-start gap-4 transition-all hover:shadow-md ${
                    surat.status === "Siap Unduh"
                      ? "border-emerald-200/70"
                      : surat.status === "Diproses"
                      ? "border-blue-200/70"
                      : "border-border/60"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    surat.status === "Siap Unduh"
                      ? "bg-emerald-50 text-emerald-600"
                      : surat.status === "Diproses"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    <FileText size={20} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-black text-foreground">{surat.jenis}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Diajukan {surat.tanggal}
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[320px]">
                            {surat.tujuan}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <SuratStatusBadge status={surat.status} />
                        {surat.status === "Siap Unduh" && (
                          <a
                            href={resolveApiAssetUrl(surat.fileUrl) || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              resolveApiAssetUrl(surat.fileUrl)
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                                : "bg-slate-100 text-slate-400 pointer-events-none shadow-none"
                            }`}
                          >
                            <Download size={13} strokeWidth={2.5} />
                            Unduh
                          </a>
                        )}
                        {surat.status === "Diproses" && surat.estimasi && (
                          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold">
                            <CalendarClock size={13} strokeWidth={2.5} />
                            Estimasi {surat.estimasi}
                          </div>
                        )}
                        {surat.status === "Menunggu" && (
                          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-bold">
                            <Clock size={13} />
                            Antrian
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state hint */}
            <p className="text-center text-xs text-muted-foreground py-2">
              Menampilkan {suratData.length} pengajuan surat · Belum ada surat baru hari ini
            </p>
          </div>
        )}

        {/* ─── TAB: SERTIFIKAT ─── */}
        {activeTab === "sertifikat" && (
          <div className="flex flex-col gap-4">
            {certificateData.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-[18px] p-10 flex flex-col items-center justify-center text-center gap-3 bg-slate-50/50">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm">
                  <Sparkles size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-500">Belum ada data sertifikat</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data akan muncul setelah dosen/operator memproses permintaan sertifikat.
                  </p>
                </div>
              </div>
            ) : (
              certificateData.map((cert) => (
                <div key={cert.id} className="bg-white border rounded-[16px] p-5 shadow-sm border-border/60">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-black text-foreground">Sertifikat Peserta Program Riset</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cert.projectName}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      cert.status === "Terbit"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : cert.status === "Diproses"
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {cert.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tanggal Terbit</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{cert.issueDate || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No. Sertifikat</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{cert.certificateNumber || "-"}</p>
                    </div>
                  </div>
                  {cert.status === "Terbit" && cert.fileUrl && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <a
                        href={resolveApiAssetUrl(cert.fileUrl) || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all"
                      >
                        <Download size={14} strokeWidth={2.5} />
                        Unduh Sertifikat
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── Modal: Ajukan Surat ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[500px] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8F5FF] text-[#6C47FF] flex items-center justify-center">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Ajukan Surat</h2>
                  <p className="text-[11px] font-medium text-muted-foreground">Isi form pengajuan dengan lengkap</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-5">

              {/* Info note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Info size={15} className="text-blue-500 shrink-0" />
                <p className="text-xs font-medium text-blue-700">
                  Surat akan diproses dalam <span className="font-bold">3–5 hari kerja</span>. Harap pastikan jenis surat sudah sesuai kebutuhan.
                </p>
              </div>

              {/* Jenis Surat Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Jenis Surat <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedJenis}
                    onChange={(e) => setSelectedJenis(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all appearance-none cursor-pointer text-slate-700"
                  >
                    <option value="" disabled>Pilih jenis surat...</option>
                    {suratJenisOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Riset Terkait */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Riset Terkait</label>
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all appearance-none cursor-pointer text-slate-700"
                  >
                    <option value="">Pilih riset terkait (opsional)</option>
                    {assignedProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Keperluan / Tujuan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Keperluan / Tujuan Penggunaan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={tujuanPenggunaan}
                  onChange={(event) => setTujuanPenggunaan(event.target.value)}
                  placeholder="Jelaskan keperluan surat ini secara singkat dan jelas, termasuk tujuan penggunaan dan instansi yang dituju..."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none resize-none transition-all"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={submitLetterRequest}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#6C47FF] hover:bg-[#5835e5] shadow-sm shadow-[#6C47FF]/20 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                <SendHorizonal size={15} strokeWidth={2.5} />
                {submitting ? "Mengirim..." : "Kirim Pengajuan"}
              </button>
            </div>

          </div>
        </div>
      )}

      {certModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[500px] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8F5FF] text-[#6C47FF] flex items-center justify-center">
                  <Award size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Ajukan Sertifikat</h2>
                  <p className="text-[11px] font-medium text-muted-foreground">Diajukan ke dosen/operator untuk diproses</p>
                </div>
              </div>
              <button onClick={() => setCertModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Riset <span className="text-red-500">*</span></label>
                <select value={certProjectId} onChange={(e) => setCertProjectId(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all">
                  <option value="">Pilih riset...</option>
                  {assignedProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Tanggal Selesai Kontribusi</label>
                <input type="date" value={certFinishDate} onChange={(e) => setCertFinishDate(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Catatan (Opsional)</label>
                <textarea rows={3} value={certRequestNote} onChange={(event) => setCertRequestNote(event.target.value)} placeholder="Tambahkan catatan untuk dosen/operator..." className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none resize-none transition-all" />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => setCertModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={submitCertificateRequest} disabled={submitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#6C47FF] hover:bg-[#5835e5] shadow-sm shadow-[#6C47FF]/20 transition-all flex items-center gap-2 disabled:opacity-60">
                <SendHorizonal size={15} strokeWidth={2.5} />
                {submitting ? "Mengirim..." : "Kirim Pengajuan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
