import React, { useEffect, useState } from "react";
import { DosenLayout } from "../../components/DosenLayout";
import { apiGet, apiPost, getStoredUser, resolveApiAssetUrl } from "../../lib/api";
import { Calendar, Download, FileText, Info, Plus, SendHorizonal, X } from "lucide-react";

type LetterStatus = "Menunggu" | "Diproses" | "Siap Unduh";

type LetterRecord = {
  id: string;
  jenis: string;
  tanggal: string;
  tujuan: string;
  status: LetterStatus;
  projectName?: string;
  fileUrl?: string | null;
  nomorSurat?: string | null;
};

const letterTypes = [
  "Surat Tugas",
  "Surat Pengantar",
  "Surat Keterangan Dosen",
  "Surat Rekomendasi",
  "Surat Permohonan Data",
];

export default function PengajuanDokumenDosen() {
  const user = getStoredUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requests, setRequests] = useState<LetterRecord[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedJenis, setSelectedJenis] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError("");
        const [rows, researchRows] = await Promise.all([
          apiGet<Array<any>>("/letter-requests?requesterType=lecturer"),
          apiGet<Array<any>>(`/research/assigned?userId=${encodeURIComponent(user.id)}`).catch(() => []),
        ]);

        setRequests(
          (rows || []).map((item) => ({
            id: String(item?.id || ""),
            jenis: String(item?.jenis || "Surat"),
            tanggal: String(item?.tanggal || "-"),
            tujuan: String(item?.tujuan || "-"),
            status: (item?.status || "Menunggu") as LetterStatus,
            projectName: item?.project_name || item?.projectName || undefined,
            fileUrl: resolveApiAssetUrl(item?.file_url || null),
            nomorSurat: item?.nomor_surat || null,
          }))
        );

        const nextProjects = (researchRows || [])
          .map((item) => ({
            id: String(item?.id || ""),
            title: String(item?.short_title || item?.title || "").trim(),
          }))
          .filter((item) => item.id && item.title);
        setProjects(nextProjects);
        if (!selectedProjectId && nextProjects.length > 0) {
          setSelectedProjectId(nextProjects[0].id);
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuat pengajuan surat dosen.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [user?.id]);

  const submitRequest = async () => {
    if (!selectedJenis || !tujuan.trim()) {
      setError("Jenis surat dan tujuan wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const tanggal = new Date().toISOString().slice(0, 10);
      const response = await apiPost<any>("/letter-requests", {
        requesterType: "lecturer",
        requesterId: user?.id,
        jenis: selectedJenis,
        tanggal,
        tujuan: tujuan.trim(),
        projectId: selectedProjectId || null,
        catatan: catatan.trim() || null,
      });

      const created = response?.data || response;
      if (created) {
        setRequests((prev) => [
          {
            id: String(created?.id || `LTR-DSN-${Date.now()}`),
            jenis: String(created?.jenis || selectedJenis),
            tanggal: String(created?.tanggal || tanggal),
            tujuan: String(created?.tujuan || tujuan.trim()),
            status: (created?.status || "Menunggu") as LetterStatus,
            projectName: created?.project_name || created?.projectName || projects.find((item) => item.id === selectedProjectId)?.title,
            fileUrl: resolveApiAssetUrl(created?.file_url || null),
            nomorSurat: created?.nomor_surat || null,
          },
          ...prev,
        ]);
      }

      setSelectedJenis("");
      setTujuan("");
      setCatatan("");
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Gagal mengajukan surat dosen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DosenLayout title="Pengajuan Surat Dosen">
      <div className="max-w-[980px] mx-auto flex flex-col gap-5">
        {error && (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Dosen</p>
            <h1 className="text-2xl font-black text-foreground">Pengajuan Surat</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#0AB600] hover:bg-[#099800] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={3} /> Ajukan Surat
          </button>
        </div>

        <div className="rounded-[16px] border border-blue-200 bg-blue-50 px-5 py-4 text-blue-800">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black">Pengajuan surat dosen sudah memakai endpoint generic surat</p>
              <p className="text-xs mt-1 leading-relaxed">
                Data pengajuan akan masuk ke operator melalui endpoint `letter-requests` dengan `requesterType=lecturer`.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-[16px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground">Riwayat Pengajuan Surat</h2>
            <span className="text-xs text-muted-foreground font-medium">{loading ? "Memuat..." : `${requests.length} pengajuan`}</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Memuat pengajuan surat dosen...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Belum ada pengajuan surat dosen.</div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map((item) => (
                <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">{item.jenis}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar size={11} /> {item.tanggal}</span>
                      {item.projectName && <span>{item.projectName}</span>}
                      {item.nomorSurat && <span>No. {item.nomorSurat}</span>}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.tujuan}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                      item.status === "Siap Unduh"
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : item.status === "Diproses"
                          ? "border-blue-200 bg-blue-100 text-blue-700"
                          : "border-amber-200 bg-amber-100 text-amber-700"
                    }`}>
                      {item.status}
                    </span>
                    {item.status === "Siap Unduh" && item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                      >
                        <Download size={13} /> Unduh
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[500px] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0FFF0] text-[#0AB600] flex items-center justify-center">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Ajukan Surat Dosen</h2>
                  <p className="text-[11px] font-medium text-muted-foreground">Pengajuan akan diteruskan ke operator</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <select
                value={selectedJenis}
                onChange={(event) => setSelectedJenis(event.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border text-sm focus:outline-none"
              >
                <option value="">Pilih jenis surat...</option>
                {letterTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border text-sm focus:outline-none"
              >
                <option value="">Pilih riset terkait (opsional)</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>

              <textarea
                rows={4}
                value={tujuan}
                onChange={(event) => setTujuan(event.target.value)}
                placeholder="Jelaskan tujuan penggunaan surat..."
                className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none resize-none"
              />

              <textarea
                rows={3}
                value={catatan}
                onChange={(event) => setCatatan(event.target.value)}
                placeholder="Catatan tambahan untuk operator (opsional)..."
                className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none resize-none"
              />
            </div>

            <div className="p-5 border-t border-border bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button
                onClick={submitRequest}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0AB600] hover:bg-[#099800] transition-all flex items-center gap-2 disabled:opacity-60"
              >
                <SendHorizonal size={15} strokeWidth={2.5} />
                {submitting ? "Mengirim..." : "Kirim Pengajuan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DosenLayout>
  );
}
