import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiGet, apiPatch, getStoredUser, resolveApiAssetUrl } from "../../lib/api";
import {
  createDraftReportType,
  deleteDraftReportType,
  DraftReportTypeOption,
  fetchDraftReportTypes,
  getCachedDraftReportTypes
} from "../../lib/draftReportTypes";
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Link as LinkIcon,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type DraftStatus = "Menunggu Review" | "Dalam Review" | "Disetujui";

interface DraftItem {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  type: string;
  uploadDate: string;
  status: DraftStatus;
  comment?: string;
  riset: string;
  version?: string;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: string | null;
  format?: string | null;
}

const STATUS_STYLE: Record<DraftStatus, string> = {
  "Menunggu Review": "bg-amber-100 text-amber-700 border border-amber-200",
  "Dalam Review": "bg-blue-100 text-blue-700 border border-blue-200",
  "Disetujui": "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

function normalizeDraft(row: any, student: any): DraftItem {
  const fileSizeValue = row?.file_size == null ? null : Number(row.file_size);
  const fallbackSize = row?.fileSize || null;
  const fileSize = typeof fileSizeValue === "number" && Number.isFinite(fileSizeValue) && fileSizeValue > 0
    ? fileSizeValue < 1024
      ? `${fileSizeValue} B`
      : fileSizeValue < 1024 * 1024
        ? `${(fileSizeValue / 1024).toFixed(1)} KB`
        : `${(fileSizeValue / (1024 * 1024)).toFixed(1)} MB`
    : fallbackSize;

  const fileName = row?.file_name || null;
  const format = row?.format
    || (fileName && fileName.includes(".") ? fileName.split(".").pop()?.toUpperCase() : null)
    || null;

  return {
    id: String(row?.id || ""),
    studentId: String(row?.studentId || student.id),
    studentName: row?.studentName || student.name || "Mahasiswa",
    title: row?.title || "Draft tanpa judul",
    type: row?.type || "Laporan TA",
    uploadDate: row?.uploadDate || "-",
    status: (row?.status || "Menunggu Review") as DraftStatus,
    comment: row?.comment || undefined,
    riset: row?.riset || "-",
    version: row?.version || "v1.0",
    fileName,
    fileUrl: resolveApiAssetUrl(row?.file_url || null),
    fileSize,
    format,
  };
}

export default function ReviewDraftOperator() {
  const user = getStoredUser();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [typeFilter, setTypeFilter] = useState("Semua");
  const [selected, setSelected] = useState<DraftItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [types, setTypes] = useState<DraftReportTypeOption[]>(() => getCachedDraftReportTypes());
  const [newType, setNewType] = useState("");

  useEffect(() => {
    const handleTypesChanged = () => setTypes(getCachedDraftReportTypes());
    window.addEventListener("draft-report-types:updated", handleTypesChanged as EventListener);
    return () => window.removeEventListener("draft-report-types:updated", handleTypesChanged as EventListener);
  }, []);

  useEffect(() => {
    const loadTypes = async () => {
      const rows = await fetchDraftReportTypes();
      setTypes(rows);
    };

    void loadTypes();
  }, []);

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const students = await apiGet<Array<any>>("/students");
        const batches = await Promise.all(
          students.map((student) =>
            apiGet<Array<any>>(`/draft-reports?studentId=${student.id}`).then((rows) =>
              rows.map((row) => normalizeDraft(row, student))
            )
          )
        );
        setDrafts(batches.flat());
      } catch (err: any) {
        setError(err?.message || "Gagal memuat draft laporan mahasiswa.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    return drafts.filter((item) => {
      const q = search.toLowerCase();
      const matchQuery = !q
        || item.title.toLowerCase().includes(q)
        || item.studentName.toLowerCase().includes(q)
        || item.riset.toLowerCase().includes(q);
      const matchStatus = statusFilter === "Semua" || item.status === statusFilter;
      const matchType = typeFilter === "Semua" || item.type === typeFilter;
      return matchQuery && matchStatus && matchType;
    });
  }, [drafts, search, statusFilter, typeFilter]);

  const submitReview = async (status: DraftStatus) => {
    if (!selected) return;

    try {
      setSaving(true);
      await apiPatch(`/draft-reports/${selected.id}/review`, {
        studentId: selected.studentId,
        status,
        note: reviewNote,
        reviewedBy: user?.id || "OP001",
        reviewedByName: `${user?.name || "Operator"} (Operator)`,
      });

      setDrafts((prev) => prev.map((item) => (
        item.id === selected.id
          ? { ...item, status, comment: reviewNote || item.comment }
          : item
      )));

      setSelected(null);
      setReviewNote("");
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan review draft.");
    } finally {
      setSaving(false);
    }
  };

  const addType = async () => {
    const label = newType.trim();
    if (!label) return;
    try {
      const next = await createDraftReportType(label);
      setTypes(next);
      setNewType("");
    } catch (err: any) {
      setError(err?.message || "Gagal menambah jenis laporan.");
    }
  };

  const removeType = async (item: DraftReportTypeOption) => {
    try {
      const next = await deleteDraftReportType(item.id);
      setTypes(next);
      if (typeFilter === item.label) {
        setTypeFilter("Semua");
      }
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus jenis laporan.");
    }
  };

  const typeLabels = useMemo(() => types.map((item) => item.label), [types]);

  useEffect(() => {
    if (typeFilter !== "Semua" && !typeLabels.includes(typeFilter)) {
      setTypeFilter("Semua");
    }
  }, [typeFilter, typeLabels]);

  return (
    <OperatorLayout title="Review Laporan Mahasiswa">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-5">
          <div className="bg-white border border-border rounded-[14px] shadow-sm p-4 flex flex-col gap-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Operator dapat melakukan review laporan mahasiswa. Nama reviewer akan dikirim ke backend dengan penanda <span className="font-black">(Operator)</span>.
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[12px] w-72 focus-within:ring-2 focus-within:ring-[#0AB600]/30 transition-all">
                <Search size={15} className="text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari mahasiswa / judul / riset..."
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
                />
                {search && <button onClick={() => setSearch("")}><X size={13} className="text-muted-foreground" /></button>}
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 bg-white border border-border rounded-[10px] text-sm font-bold focus:outline-none cursor-pointer"
              >
                {["Semua", "Menunggu Review", "Dalam Review", "Disetujui"].map((item) => <option key={item}>{item}</option>)}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-3 bg-white border border-border rounded-[10px] text-sm font-bold focus:outline-none cursor-pointer"
              >
                <option>Semua</option>
                {typeLabels.map((item) => <option key={item}>{item}</option>)}
              </select>
              <Link to="/operator/sertifikat" className="ml-auto inline-flex items-center gap-2 h-9 px-3 rounded-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold hover:bg-emerald-100 transition-colors">
                <Award size={14} /> Kelola Sertifikat
              </Link>
            </div>
          </div>

          <div className="bg-white border border-border rounded-[14px] shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-[#0AB600]" />
              <h2 className="text-sm font-black text-foreground">Jenis Laporan</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Operator dapat menambah atau menghapus jenis laporan dari backend agar otomatis muncul di frontend mahasiswa dan reviewer.
            </p>
            <div className="flex gap-2">
              <input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addType(); }}
                placeholder="Contoh: Proposal Seminar"
                className="flex-1 h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30"
              />
              <button onClick={addType} className="h-10 px-4 rounded-[10px] bg-[#0AB600] hover:bg-[#099800] text-white text-sm font-black inline-flex items-center gap-1.5">
                <Plus size={13} /> Tambah
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {types.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-2">
                  <span className="text-sm font-bold text-foreground">{item.label}</span>
                  <button onClick={() => void removeType(item)} className="w-7 h-7 rounded-[8px] border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground">Daftar Laporan Mahasiswa</h2>
            <p className="text-xs font-medium text-muted-foreground">{filtered.length} draft</p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Memuat draft...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada draft ditemukan.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  {[
                    "Mahasiswa",
                    "Judul",
                    "Jenis",
                    "Riset",
                    "Lampiran",
                    "Status",
                    "Aksi"
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-black text-foreground">{item.studentName}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-black text-foreground text-sm line-clamp-1">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">Upload: {item.uploadDate} • {item.version || "v1.0"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-muted-foreground">{item.type}</td>
                    <td className="px-5 py-3.5 text-xs font-bold text-muted-foreground">{item.riset}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {item.fileUrl ? (
                        <div className="flex flex-col gap-1">
                          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-bold">
                            <LinkIcon size={11} /> {item.fileName || "Lihat file"}
                          </a>
                          <span>{item.fileSize || "-"} {item.format ? `• ${item.format}` : ""}</span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="px-5 py-3.5"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status]}`}>{item.status}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelected(item); setReviewNote(item.comment || ""); }} className="h-7 px-3 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-black rounded-[8px] border border-green-200 flex items-center gap-1">
                          <Eye size={11} /> Review
                        </button>
                        {item.fileUrl && (
                          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="h-7 px-3 bg-slate-900 hover:bg-slate-700 text-white text-[10px] font-black rounded-[8px] flex items-center gap-1">
                            <Download size={11} /> File
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Review Laporan oleh Operator</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="p-4 bg-slate-50 border border-border rounded-[12px] text-xs">
                <p className="font-black text-foreground">{selected.title}</p>
                <p className="text-muted-foreground mt-1">{selected.studentName} • {selected.type} • {selected.riset}</p>
                {selected.fileUrl && (
                  <div className="mt-3 flex items-center gap-2">
                    <a href={selected.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-bold">
                      <LinkIcon size={11} /> {selected.fileName || "Buka lampiran"}
                    </a>
                    <span className="text-muted-foreground">{selected.fileSize || "-"} {selected.format ? `• ${selected.format}` : ""}</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Saat operator mereview, backend akan menerima nama reviewer dengan penanda <span className="font-black">(Operator)</span>.
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Catatan Review</label>
                <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={4} placeholder="Masukkan catatan review untuk mahasiswa..." className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button disabled={saving} onClick={() => submitReview("Dalam Review")} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                <Clock size={14} /> Dalam Review
              </button>
              <button disabled={saving} onClick={() => submitReview("Disetujui")} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 size={14} /> Setujui
              </button>
              <button disabled={saving} onClick={() => submitReview("Menunggu Review")} className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                <XCircle size={14} /> Kembalikan
              </button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
