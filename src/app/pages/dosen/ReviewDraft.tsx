import React, { useEffect, useMemo, useState } from "react";
import { DosenLayout } from "../../components/DosenLayout";
import { apiGet, apiPatch, getStoredUser, resolveApiAssetUrl } from "../../lib/api";
import { Eye, CheckCircle2, Clock, XCircle, Search, X, Download, Link as LinkIcon } from "lucide-react";

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
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  format?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  "Menunggu Review": "bg-amber-100 text-amber-700 border border-amber-200",
  "Dalam Review": "bg-blue-100 text-blue-700 border border-blue-200",
  "Disetujui": "bg-emerald-100 text-emerald-700 border border-emerald-200"
};

export default function ReviewDraft() {
  const user = getStoredUser();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [selected, setSelected] = useState<DraftItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const students = await apiGet<Array<any>>("/students");
        const batches = await Promise.all(
          students.map((student) =>
            apiGet<Array<any>>(`/draft-reports?studentId=${student.id}`).then((rows) =>
              rows.map((row) => ({
                ...row,
                studentId: row.studentId || student.id,
                studentName: row.studentName || student.name,
                fileUrl: resolveApiAssetUrl(row.file_url || null),
                fileName: row.file_name || null,
                fileSize: row.fileSize || null,
                format: row.format || null,
                version: row.version || "v1.0"
              }))
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
      const matchQuery = !q || item.title.toLowerCase().includes(q) || item.studentName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "Semua" || item.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [drafts, search, statusFilter]);

  const submitReview = async (status: DraftStatus) => {
    if (!selected) return;

    try {
      setSaving(true);
      await apiPatch(`/draft-reports/${selected.id}/review`, {
        studentId: selected.studentId,
        status,
        note: reviewNote,
        reviewedBy: user?.id || "D001",
        reviewedByName: user?.name || "Dosen"
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

  return (
    <DosenLayout title="Review Draft Laporan">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[12px] w-72 focus-within:ring-2 focus-within:ring-green-300 transition-all">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari mahasiswa / judul draft..."
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
        </div>

        <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground">Daftar Draft Mahasiswa</h2>
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
                    "Judul Draft",
                    "Jenis",
                    "Riset",
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
                      {item.fileName && (
                        <p className="text-[10px] text-indigo-600 font-bold inline-flex items-center gap-1 mt-1">
                          <LinkIcon size={10} /> {item.fileName}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-muted-foreground">{item.type}</td>
                    <td className="px-5 py-3.5 text-xs font-bold text-muted-foreground">{item.riset}</td>
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
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[540px]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Review Draft</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="p-4 bg-slate-50 border border-border rounded-[12px] text-xs">
                <p className="font-black text-foreground">{selected.title}</p>
                <p className="text-muted-foreground mt-1">{selected.studentName} • {selected.type} • {selected.riset}</p>
                {(selected.fileName || selected.fileUrl) && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {selected.fileName && <span className="font-bold text-indigo-600 inline-flex items-center gap-1"><LinkIcon size={11} /> {selected.fileName}</span>}
                    {(selected.fileSize || selected.format) && <span className="text-muted-foreground">{selected.fileSize || "-"} {selected.format ? `• ${selected.format}` : ""}</span>}
                    {selected.fileUrl && (
                      <a href={selected.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-bold">
                        <Download size={11} /> Buka lampiran
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">Catatan Review</label>
                <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={4} placeholder="Masukkan catatan review untuk mahasiswa..." className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all resize-none" />
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
    </DosenLayout>
  );
}
