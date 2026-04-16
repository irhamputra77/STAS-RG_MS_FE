import React, { useEffect, useMemo, useState } from "react";
import { Check, Clock, Filter, Search, UserX, X } from "lucide-react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiGet, apiPatch, getStoredUser } from "../../lib/api";
import { formatDateYmd } from "../../lib/date";

type WithdrawalRow = {
  id: string;
  studentName: string;
  studentNim: string;
  advisorName: string;
  reason: string;
  submittedAt: string;
  statusOperator: "Menunggu" | "Diteruskan" | "Ditolak";
  statusDosen: "Menunggu" | "Disetujui" | "Ditolak" | null;
  finalStatus: "Menunggu" | "Ditolak Operator" | "Menunggu Dosen" | "Ditolak Dosen" | "Disetujui";
  operatorNote?: string | null;
  advisorNote?: string | null;
};

const FILTERS = ["Semua", "Menunggu", "Menunggu Dosen", "Disetujui", "Ditolak"] as const;

function statusBadge(status: WithdrawalRow["finalStatus"]) {
  if (status === "Disetujui") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (status.includes("Ditolak")) return "bg-red-100 text-red-600 border border-red-200";
  if (status === "Menunggu Dosen") return "bg-blue-100 text-blue-700 border border-blue-200";
  return "bg-amber-100 text-amber-700 border border-amber-200";
}

export default function PengunduranDiriOperator() {
  const user = getStoredUser();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadRows = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiGet<Array<any>>("/withdrawal-requests");
        setRows(
          (data || []).map((item) => ({
            id: item.id,
            studentName: item.student_name || "Mahasiswa",
            studentNim: item.student_nim || "-",
            advisorName: item.advisor_name || "-",
            reason: item.reason || "-",
            submittedAt: formatDateYmd(item.submitted_at),
            statusOperator: item.status_operator || "Menunggu",
            statusDosen: item.status_dosen ?? null,
            finalStatus: item.final_status || "Menunggu",
            operatorNote: item.operator_note || null,
            advisorNote: item.advisor_note || null,
          }))
        );
      } catch (err: any) {
        setError(err?.message || "Gagal memuat pengunduran diri.");
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.studentName.toLowerCase().includes(normalizedQuery) ||
        item.studentNim.toLowerCase().includes(normalizedQuery) ||
        item.advisorName.toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        filter === "Semua" ||
        (filter === "Ditolak" ? item.finalStatus.includes("Ditolak") : item.finalStatus === filter);

      return matchesQuery && matchesFilter;
    });
  }, [filter, query, rows]);

  const handleReview = async (id: string, status: "Diteruskan" | "Ditolak") => {
    try {
      const note = status === "Diteruskan"
        ? "Data lengkap, diteruskan ke dosen pembimbing."
        : "Pengajuan ditolak oleh operator.";

      await apiPatch(`/withdrawal-requests/${id}/operator-review`, {
        status,
        reviewedById: user?.id,
        note,
      });

      setRows((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                statusOperator: status,
                finalStatus: status === "Diteruskan" ? "Menunggu Dosen" : "Ditolak Operator",
                operatorNote: note,
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err?.message || "Gagal memproses pengajuan.");
    }
  };

  return (
    <OperatorLayout title="Pengunduran Diri Mahasiswa">
      <div className="flex flex-col gap-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Operator</p>
            <h1 className="text-2xl font-black text-foreground">Pengunduran Diri</h1>
            <p className="text-sm text-muted-foreground mt-1">Review tahap pertama sebelum permintaan diteruskan ke dosen pembimbing.</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
            {rows.filter((item) => item.statusOperator === "Menunggu").length} pengajuan menunggu review operator
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[12px] w-64">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari mahasiswa atau dosen..." className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground" />
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
                    <p className="text-xs text-muted-foreground mt-1">Dosen pembimbing: {item.advisorName}</p>
                    <p className="text-xs text-muted-foreground">Diajukan {item.submittedAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.statusOperator === "Menunggu" && (
                      <>
                        <button onClick={() => handleReview(item.id, "Diteruskan")} className="flex items-center gap-1 rounded-[10px] bg-emerald-500 px-3 py-2 text-xs font-black text-white hover:bg-emerald-600 transition-colors">
                          <Check size={12} strokeWidth={3} /> Teruskan ke Dosen
                        </button>
                        <button onClick={() => handleReview(item.id, "Ditolak")} className="flex items-center gap-1 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100 transition-colors">
                          <X size={12} strokeWidth={3} /> Tolak
                        </button>
                      </>
                    )}
                    {item.statusOperator !== "Menunggu" && (
                      <span className="rounded-[10px] bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                        Operator: {item.statusOperator}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Alasan</p>
                  <p className="text-sm text-foreground leading-relaxed">{item.reason}</p>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-muted-foreground">
                  <div className="rounded-[12px] border border-border bg-white px-3 py-3">
                    <p className="font-black text-foreground mb-1">Review Operator</p>
                    <p>Status: {item.statusOperator}</p>
                    {item.operatorNote && <p className="mt-1">{item.operatorNote}</p>}
                  </div>
                  <div className="rounded-[12px] border border-border bg-white px-3 py-3">
                    <p className="font-black text-foreground mb-1">Review Dosen</p>
                    <p>Status: {item.statusDosen || "Menunggu"}</p>
                    {item.advisorNote && <p className="mt-1">{item.advisorNote}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OperatorLayout>
  );
}
