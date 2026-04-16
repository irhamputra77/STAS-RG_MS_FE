import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Filter, Search, UserX, X } from "lucide-react";
import { DosenLayout } from "../../components/DosenLayout";
import { apiGet, apiPatch, getStoredUser } from "../../lib/api";
import { formatDateYmd } from "../../lib/date";

type WithdrawalRow = {
  id: string;
  studentName: string;
  studentNim: string;
  reason: string;
  submittedAt: string;
  operatorNote?: string | null;
  finalStatus: "Menunggu" | "Ditolak Operator" | "Menunggu Dosen" | "Ditolak Dosen" | "Disetujui";
};

const FILTERS = ["Semua", "Menunggu Dosen", "Disetujui", "Ditolak"] as const;

function statusBadge(status: WithdrawalRow["finalStatus"]) {
  if (status === "Disetujui") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (status.includes("Ditolak")) return "bg-red-100 text-red-600 border border-red-200";
  if (status === "Menunggu Dosen") return "bg-blue-100 text-blue-700 border border-blue-200";
  return "bg-amber-100 text-amber-700 border border-amber-200";
}

export default function PengunduranDiriDosen() {
  const user = getStoredUser();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadRows = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError("");
      try {
        const data = await apiGet<Array<any>>(`/withdrawal-requests?advisorId=${encodeURIComponent(user.id)}`);
        setRows(
          (data || []).map((item) => ({
            id: item.id,
            studentName: item.student_name || "Mahasiswa",
            studentNim: item.student_nim || "-",
            reason: item.reason || "-",
            submittedAt: formatDateYmd(item.submitted_at),
            operatorNote: item.operator_note || null,
            finalStatus: item.final_status || "Menunggu",
          }))
        );
      } catch (err: any) {
        setError(err?.message || "Gagal memuat pengunduran diri.");
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, [user?.id]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.studentName.toLowerCase().includes(normalizedQuery) ||
        item.studentNim.toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        filter === "Semua" ||
        (filter === "Ditolak" ? item.finalStatus.includes("Ditolak") : item.finalStatus === filter);

      return matchesQuery && matchesFilter;
    });
  }, [filter, query, rows]);

  const handleReview = async (id: string, status: "Disetujui" | "Ditolak") => {
    try {
      await apiPatch(`/withdrawal-requests/${id}/advisor-review`, {
        status,
        reviewedById: user?.id,
        note: status === "Disetujui"
          ? "Pengajuan pengunduran diri disetujui dosen pembimbing."
          : "Pengajuan pengunduran diri ditolak dosen pembimbing.",
      });

      setRows((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, finalStatus: status === "Disetujui" ? "Disetujui" : "Ditolak Dosen" }
            : item
        )
      );
    } catch (err: any) {
      setError(err?.message || "Gagal memproses keputusan dosen.");
    }
  };

  return (
    <DosenLayout title="Persetujuan Pengunduran Diri">
      <div className="flex flex-col gap-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Dosen</p>
            <h1 className="text-2xl font-black text-foreground">Persetujuan Pengunduran Diri</h1>
            <p className="text-sm text-muted-foreground mt-1">Keputusan akhir setelah operator meneruskan pengajuan mahasiswa.</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
            {rows.filter((item) => item.finalStatus === "Menunggu Dosen").length} pengajuan menunggu keputusan dosen
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[12px] w-64">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari mahasiswa..." className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-border rounded-[12px] p-1 overflow-x-auto">
            <span className="px-2 text-muted-foreground"><Filter size={14} /></span>
            {FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-3 py-1.5 rounded-[10px] text-sm font-bold transition-colors ${filter === item ? "bg-[#0AB600] text-white" : "text-muted-foreground hover:bg-slate-50"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[16px] border border-border bg-white p-8 text-center text-sm text-muted-foreground">Memuat pengajuan pengunduran diri...</div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border bg-white p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <UserX size={22} />
            </div>
            <p className="text-sm font-black text-foreground">Tidak ada pengajuan yang cocok</p>
            <p className="text-xs text-muted-foreground mt-1">Coba ubah filter atau kata pencarian.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredRows.map((item) => (
              <div key={item.id} className="rounded-[16px] border border-border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-black text-foreground">{item.studentName}</p>
                      <span className="text-xs font-medium text-muted-foreground">{item.studentNim}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${statusBadge(item.finalStatus)}`}>{item.finalStatus}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Diajukan {item.submittedAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.finalStatus === "Menunggu Dosen" && (
                      <>
                        <button onClick={() => handleReview(item.id, "Disetujui")} className="flex items-center gap-1 rounded-[10px] bg-emerald-500 px-3 py-2 text-xs font-black text-white hover:bg-emerald-600 transition-colors">
                          <Check size={12} strokeWidth={3} /> Setujui
                        </button>
                        <button onClick={() => handleReview(item.id, "Ditolak")} className="flex items-center gap-1 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100 transition-colors">
                          <X size={12} strokeWidth={3} /> Tolak
                        </button>
                      </>
                    )}
                    {item.finalStatus !== "Menunggu Dosen" && (
                      <span className="rounded-[10px] bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                        Final: {item.finalStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Alasan</p>
                  <p className="text-sm text-foreground leading-relaxed">{item.reason}</p>
                </div>

                {item.operatorNote && (
                  <div className="mt-4 rounded-[12px] border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] text-blue-700">
                    <p className="font-black mb-1">Catatan Operator</p>
                    <p>{item.operatorNote}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1 rounded-[8px] bg-emerald-100 px-2 py-1 text-emerald-700 font-black">
                    <Check size={10} strokeWidth={3} /> Pengajuan
                  </div>
                  <div className="flex items-center gap-1 rounded-[8px] bg-emerald-100 px-2 py-1 text-emerald-700 font-black">
                    <Check size={10} strokeWidth={3} /> Operator
                  </div>
                  <div className={`flex items-center gap-1 rounded-[8px] px-2 py-1 font-black ${item.finalStatus === "Menunggu Dosen" ? "bg-blue-100 text-blue-700" : item.finalStatus === "Disetujui" ? "bg-emerald-100 text-emerald-700" : item.finalStatus.includes("Ditolak") ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                    {item.finalStatus === "Menunggu Dosen" ? <Clock size={10} /> : item.finalStatus === "Disetujui" ? <Check size={10} strokeWidth={3} /> : item.finalStatus.includes("Ditolak") ? <X size={10} strokeWidth={3} /> : <AlertTriangle size={10} />}
                    Dosen Pembimbing
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DosenLayout>
  );
}
