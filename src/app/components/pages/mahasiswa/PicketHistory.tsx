import React from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, History, ImageIcon, Loader2, RefreshCw, Search, Users, XCircle } from "lucide-react";
import { Link } from "react-router";
import { Layout } from "../../templates/Layout";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { apiGet, getStoredUser } from "../../../lib/api";
import { PicketAssignment, mapPicketAssignment } from "../../../lib/picket";

type PicketHistoryProps = {
  management?: boolean;
};

type StudentOption = {
  id: string;
  name: string;
  nim?: string | null;
};

const statusStyle: Record<string, string> = {
  Terkirim: "border-blue-200 bg-blue-50 text-blue-700",
  Valid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Bermasalah: "border-red-200 bg-red-50 text-red-600",
  Ditugaskan: "border-slate-200 bg-slate-50 text-slate-600",
  Dijadwalkan: "border-slate-200 bg-slate-50 text-slate-600",
};

function Badge({ status }: { status?: string | null }) {
  const label = status || "-";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyle[label] || statusStyle.Dijadwalkan}`}>
      {label}
    </span>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSubmissionStatus(item: PicketAssignment) {
  return item.submissionStatus || (item.submitted ? "Terkirim" : item.status) || "Dijadwalkan";
}

function normalizeStudent(row: any): StudentOption {
  const name = row?.name || row?.student_name || row?.studentName || "Mahasiswa";
  return {
    id: String(row?.id || row?.student_id || row?.studentId || ""),
    name,
    nim: row?.nim || row?.student_nim || row?.studentNim || null,
  };
}

export default function PicketHistory({ management = false }: PicketHistoryProps) {
  const user = getStoredUser();
  const [history, setHistory] = React.useState<PicketAssignment[]>([]);
  const [students, setStudents] = React.useState<StudentOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [studentFilter, setStudentFilter] = React.useState("all");

  const isOperatorShell = management && user?.role === "operator";
  const Shell = isOperatorShell ? OperatorLayout : Layout;
  const backPath = management ? (user?.role === "operator" ? "/operator/piket" : "/picket/manage") : "/picket";
  const pageTitle = management ? "Riwayat Submit Piket" : "Riwayat Submit Piket Saya";

  const loadData = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError("");
      if (management) {
        if (user?.role === "mahasiswa") {
          const managerCheck = await apiGet<any>("/picket/managers/me");
          if (!Boolean(managerCheck?.isManager ?? managerCheck?.manager ?? managerCheck?.allowed)) {
            setStudents([]);
            setHistory([]);
            setError("Anda bukan PIC piket.");
            return;
          }
        }

        const studentsResponse = await apiGet<any>("/picket/students");
        const studentRows = Array.isArray(studentsResponse) ? studentsResponse : studentsResponse?.students || studentsResponse?.items || [];
        const normalizedStudents = studentRows.map(normalizeStudent).filter((item: StudentOption) => item.id);
        setStudents(normalizedStudents);

        const histories = await Promise.allSettled(
          normalizedStudents.map((student: StudentOption) =>
            apiGet<any>(`/picket/history?studentId=${encodeURIComponent(student.id)}&_=${Date.now()}`)
              .then((response) => {
                const rows = Array.isArray(response) ? response : response?.history || response?.assignments || response?.items || [];
                return rows.map((row: any) => mapPicketAssignment({
                  ...row,
                  student_id: row?.student_id || row?.studentId || student.id,
                  student_name: row?.student_name || row?.studentName || student.name,
                  nim: row?.nim || student.nim || null,
                }));
              })
          )
        );
        setHistory(histories
          .flatMap((result) => result.status === "fulfilled" ? result.value : [])
          .sort((a, b) => {
            const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
            if (dateCompare !== 0) return dateCompare;
            return String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""));
          }));
      } else {
        const response = await apiGet<any>(`/picket/history?studentId=${encodeURIComponent(user.id)}&_=${Date.now()}`);
        const rows = Array.isArray(response) ? response : response?.history || response?.assignments || response?.items || [];
        setHistory(rows.map(mapPicketAssignment));
      }
    } catch (err: any) {
      setError(err?.message || "Gagal memuat riwayat submit piket.");
    } finally {
      setLoading(false);
    }
  }, [management, user?.id, user?.role]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const submittedHistory = history.filter((item) => item.submitted || item.submissionId || item.photoUrl || item.submittedAt);
  const filteredHistory = submittedHistory.filter((item) => {
    const status = getSubmissionStatus(item);
    const haystack = `${item.studentName} ${item.nim || ""} ${item.taskName} ${item.taskDescription || ""} ${item.date} ${status}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const matchesStudent = !management || studentFilter === "all" || item.studentId === studentFilter;
    return matchesQuery && matchesStatus && matchesStudent;
  });

  const summary = {
    total: submittedHistory.length,
    valid: submittedHistory.filter((item) => getSubmissionStatus(item) === "Valid").length,
    pending: submittedHistory.filter((item) => getSubmissionStatus(item) === "Terkirim").length,
    problem: submittedHistory.filter((item) => getSubmissionStatus(item) === "Bermasalah").length,
  };

  return (
    <Shell title={pageTitle}>
      <div className="flex flex-col gap-5 pb-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link to={backPath} className="mb-3 inline-flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-foreground">
              <ArrowLeft size={14} /> Kembali ke Piket
            </Link>
            <h1 className="text-2xl font-black text-foreground">{pageTitle}</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {management ? "Pantau bukti piket seluruh mahasiswa beserta status validasinya." : "Pantau semua bukti piket yang pernah Anda kirim beserta status validasinya."}
            </p>
          </div>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-[10px] bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>

        <div className={`grid grid-cols-2 gap-4 ${management ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
          {[
            { label: "Total Submit", value: summary.total, icon: <History size={18} />, tone: "bg-slate-100 text-slate-700" },
            { label: "Valid", value: summary.valid, icon: <CheckCircle2 size={18} />, tone: "bg-emerald-100 text-emerald-700" },
            { label: "Menunggu", value: summary.pending, icon: <ImageIcon size={18} />, tone: "bg-blue-100 text-blue-700" },
            { label: "Bermasalah", value: summary.problem, icon: <XCircle size={18} />, tone: "bg-red-100 text-red-700" },
            ...(management ? [{ label: "Mahasiswa", value: students.length, icon: <Users size={18} />, tone: "bg-amber-100 text-amber-700" }] : []),
          ].map((item) => (
            <div key={item.label} className="rounded-[16px] border border-border bg-white p-4 shadow-sm">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] ${item.tone}`}>{item.icon}</div>
              <p className="text-2xl font-black text-foreground">{item.value}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wide text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <section className="rounded-[18px] border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border bg-white px-3 lg:max-w-md">
              <Search size={15} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari tugas, tanggal, atau status..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm font-bold outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Valid">Valid</option>
              <option value="Bermasalah">Bermasalah</option>
            </select>
            {management && (
              <select
                value={studentFilter}
                onChange={(event) => setStudentFilter(event.target.value)}
                className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm font-bold outline-none"
              >
                <option value="all">Semua Mahasiswa</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}{student.nim ? ` - ${student.nim}` : ""}</option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Memuat riwayat submit...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-10 text-center">
              <History className="mx-auto mb-3 text-muted-foreground" size={34} />
              <p className="font-black text-foreground">Belum ada riwayat submit</p>
              <p className="mt-1 text-sm text-muted-foreground">Bukti piket yang sudah dikirim akan tampil di sini.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredHistory.map((item) => (
                <div key={item.submissionId || item.id} className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_180px_130px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-foreground">{item.taskName}</p>
                      <Badge status={getSubmissionStatus(item)} />
                    </div>
                    {management && <p className="mt-1 text-xs font-black text-slate-700">{item.studentName} {item.nim ? `- ${item.nim}` : ""}</p>}
                    {item.taskDescription && <p className="mt-1 text-sm text-muted-foreground">{item.taskDescription}</p>}
                    <p className="mt-2 text-xs font-bold text-muted-foreground">Jadwal: {item.date}</p>
                    <p className="mt-1 text-xs font-bold text-emerald-700">Submit: {formatDateTime(item.submittedAt)}</p>
                    <p className="mt-1 text-xs font-bold text-blue-700">
                      {item.reviewedAt ? `Direview: ${formatDateTime(item.reviewedAt)}${item.reviewedBy ? ` oleh ${item.reviewedBy}` : ""}` : "Menunggu review operator"}
                    </p>
                    {item.reviewNote && (
                      <div className="mt-3 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-relaxed text-slate-700">
                        <span className="font-black text-slate-900">Catatan review:</span> {item.reviewNote}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    <p>ID Submission</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-foreground">{item.submissionId || "-"}</p>
                  </div>
                  {item.photoUrl ? (
                    <a
                      href={item.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-[10px] border border-border bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink size={14} /> Lihat Foto
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">Foto tidak tersedia</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
