import React from "react";
import {
  CalendarCheck,
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiGet } from "../../lib/api";

type StudentRow = {
  id: string;
  nim: string;
  name: string;
  initials: string;
  prodi: string;
  status: string;
  color: string;
};

type AttendanceMonitorToday = {
  date?: string;
  presentIds?: string[];
  leaveIds?: string[];
  absentIds?: string[];
};

type AttendanceDetail = {
  month?: string;
  chartData?: Array<{ name: string; value: number; color: string }>;
  today?: {
    checkIn?: string;
    checkOut?: string;
    status?: string;
  };
  history?: Array<{
    date: string;
    in: string;
    out: string;
    duration: string;
    status: string;
    statusColor: string;
  }>;
};

type AttendanceStatus = "Hadir" | "Cuti" | "Tidak Hadir";

const AVATAR_COLORS = [
  "bg-[#8B6FFF] text-white",
  "bg-emerald-500 text-white",
  "bg-blue-500 text-white",
  "bg-amber-500 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
];

function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function getStatusBadgeClasses(status: AttendanceStatus | string) {
  switch (status) {
    case "Hadir":
    case "Selesai":
    case "Berlangsung":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Cuti":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Tidak Hadir":
    case "Belum Check-in":
      return "bg-red-100 text-red-600 border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getHistoryBadgeClasses(statusColor?: string) {
  switch (statusColor) {
    case "green":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "amber":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "red":
      return "bg-red-100 text-red-600 border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export default function KehadiranMahasiswa() {
  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [monitor, setMonitor] = React.useState<AttendanceMonitorToday | null>(null);
  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthValue());
  const [detail, setDetail] = React.useState<AttendanceDetail | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"Semua" | AttendanceStatus>("Semua");
  const [overviewLoading, setOverviewLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadOverview = React.useCallback(async () => {
    setOverviewLoading(true);
    setError("");

    try {
      const [studentRows, monitorRows] = await Promise.all([
        apiGet<Array<any>>("/students"),
        apiGet<AttendanceMonitorToday>("/attendance/monitor/today"),
      ]);

      const mappedStudents = (studentRows || []).map((item: any, index: number) => ({
        id: String(item?.id || ""),
        nim: item?.nim || "-",
        name: item?.name || "Mahasiswa",
        initials:
          item?.initials ||
          String(item?.name || "M")
            .split(" ")
            .map((chunk: string) => chunk[0] || "")
            .join("")
            .slice(0, 2)
            .toUpperCase() ||
          "M",
        prodi: item?.prodi || "-",
        status: item?.status || "Aktif",
        color: AVATAR_COLORS[index % AVATAR_COLORS.length],
      }));

      setStudents(mappedStudents);
      setMonitor(monitorRows || null);
      setSelectedStudentId((current) => {
        if (current && mappedStudents.some((student) => student.id === current)) {
          return current;
        }
        return mappedStudents[0]?.id || "";
      });
    } catch (err: any) {
      setError(err?.message || "Gagal memuat monitor kehadiran mahasiswa.");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  React.useEffect(() => {
    const loadDetail = async () => {
      if (!selectedStudentId) {
        setDetail(null);
        return;
      }

      setDetailLoading(true);
      try {
        const response = await apiGet<AttendanceDetail>(
          `/attendance?studentId=${encodeURIComponent(selectedStudentId)}&month=${encodeURIComponent(selectedMonth)}`
        );
        setDetail(response);
      } catch (err: any) {
        setDetail(null);
        setError(err?.message || "Gagal memuat detail kehadiran mahasiswa.");
      } finally {
        setDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedMonth, selectedStudentId]);

  const presentSet = React.useMemo(() => new Set(monitor?.presentIds || []), [monitor?.presentIds]);
  const leaveSet = React.useMemo(() => new Set(monitor?.leaveIds || []), [monitor?.leaveIds]);

  const studentsWithStatus = React.useMemo(() => {
    return students.map((student) => {
      let todayStatus: AttendanceStatus = "Tidak Hadir";
      if (presentSet.has(student.id)) {
        todayStatus = "Hadir";
      } else if (leaveSet.has(student.id)) {
        todayStatus = "Cuti";
      }

      return {
        ...student,
        todayStatus,
      };
    });
  }, [leaveSet, presentSet, students]);

  const filteredStudents = React.useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return studentsWithStatus.filter((student) => {
      const matchesStatus = statusFilter === "Semua" || student.todayStatus === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.nim.toLowerCase().includes(normalizedQuery) ||
        student.prodi.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [search, statusFilter, studentsWithStatus]);

  const selectedStudent =
    studentsWithStatus.find((student) => student.id === selectedStudentId) || filteredStudents[0] || null;

  React.useEffect(() => {
    if (!selectedStudent && filteredStudents.length > 0) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudent]);

  const summary = React.useMemo(() => {
    const presentCount = monitor?.presentIds?.length || 0;
    const leaveCount = monitor?.leaveIds?.length || 0;
    const absentCount = monitor?.absentIds?.length || 0;
    const totalCount = students.length;
    return { presentCount, leaveCount, absentCount, totalCount };
  }, [monitor, students.length]);

  return (
    <OperatorLayout title="Kehadiran Mahasiswa">
      <div className="flex flex-col gap-6 pb-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Monitor Kehadiran Mahasiswa</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Pantau status hadir hari ini lalu lihat detail bulanan setiap mahasiswa.
            </p>
          </div>
          <button
            onClick={() => void loadOverview()}
            disabled={overviewLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {overviewLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Muat Ulang
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[16px] border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-blue-600">
              <Users size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Total Mahasiswa</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.totalCount}</p>
          </div>
          <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-emerald-600">
              <UserCheck size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Hadir Hari Ini</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.presentCount}</p>
          </div>
          <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-amber-600">
              <CalendarCheck size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Sedang Cuti</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.leaveCount}</p>
          </div>
          <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-red-600">
              <UserMinus size={18} />
              <span className="text-xs font-black uppercase tracking-wide">Tidak Hadir</span>
            </div>
            <p className="text-2xl font-black text-foreground">{summary.absentCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIM, atau prodi..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["Semua", "Hadir", "Cuti", "Tidak Hadir"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setStatusFilter(item)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
                      statusFilter === item
                        ? "border-[#0AB600] bg-[#0AB600] text-white"
                        : "border-border bg-slate-50 text-muted-foreground hover:bg-slate-100"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[720px] overflow-y-auto">
              {overviewLoading ? (
                <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /> Memuat daftar mahasiswa...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Tidak ada mahasiswa yang cocok dengan filter saat ini.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isActive = student.id === selectedStudent?.id;
                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`flex w-full items-center gap-3 border-b border-border/70 px-5 py-3.5 text-left transition-colors last:border-b-0 ${
                        isActive ? "bg-[#F0FFF0]" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${student.color}`}>
                        {student.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{student.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {student.nim} · {student.prodi}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusBadgeClasses(student.todayStatus)}`}>
                        {student.todayStatus}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    {monitor?.date ? `Status hari ini · ${monitor.date}` : "Status hari ini"}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-foreground">
                    {selectedStudent?.name || "Pilih mahasiswa"}
                  </h2>
                  {selectedStudent && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedStudent.nim} · {selectedStudent.prodi}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-muted-foreground" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-[#0AB600] focus:ring-2 focus:ring-green-200"
                  />
                </div>
              </div>

              {!selectedStudent ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Pilih salah satu mahasiswa di panel kiri untuk melihat detail kehadiran.
                </div>
              ) : detailLoading ? (
                <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /> Memuat detail kehadiran...
                </div>
              ) : !detail ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Detail kehadiran belum tersedia untuk mahasiswa ini.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-3">
                    <div className="rounded-[16px] border border-border bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Clock3 size={15} />
                        <span className="text-xs font-black uppercase tracking-wide">Check-In Hari Ini</span>
                      </div>
                      <p className="text-2xl font-black text-foreground">{detail.today?.checkIn || "--:--"}</p>
                    </div>
                    <div className="rounded-[16px] border border-border bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Clock3 size={15} />
                        <span className="text-xs font-black uppercase tracking-wide">Check-Out Hari Ini</span>
                      </div>
                      <p className="text-2xl font-black text-foreground">{detail.today?.checkOut || "--:--"}</p>
                    </div>
                    <div className="rounded-[16px] border border-border bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <MapPin size={15} />
                        <span className="text-xs font-black uppercase tracking-wide">Status Hari Ini</span>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${getStatusBadgeClasses(detail.today?.status)}`}>
                        {detail.today?.status || "Belum Check-in"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 px-5 pb-5 lg:grid-cols-4">
                    {(detail.chartData || []).map((item) => (
                      <div key={item.name} className="rounded-[16px] border border-border bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">{item.name}</span>
                        </div>
                        <p className="text-2xl font-black text-foreground">{item.value}</p>
                        <p className="text-[11px] text-muted-foreground">hari pada bulan ini</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border px-5 py-4">
                    <h3 className="text-sm font-black text-foreground">Riwayat Kehadiran</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-y border-border bg-slate-50">
                          <th className="px-5 py-3 font-black text-muted-foreground">Tanggal</th>
                          <th className="px-5 py-3 font-black text-muted-foreground">Check-In</th>
                          <th className="px-5 py-3 font-black text-muted-foreground">Check-Out</th>
                          <th className="px-5 py-3 font-black text-muted-foreground">Durasi</th>
                          <th className="px-5 py-3 text-right font-black text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(detail.history || []).map((row, index) => (
                          <tr key={`${row.date}-${index}`} className="hover:bg-slate-50">
                            <td className="px-5 py-3.5 font-medium text-foreground">{row.date}</td>
                            <td className="px-5 py-3.5 text-muted-foreground">{row.in}</td>
                            <td className="px-5 py-3.5 text-muted-foreground">{row.out}</td>
                            <td className="px-5 py-3.5 text-muted-foreground">{row.duration}</td>
                            <td className="px-5 py-3.5 text-right">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${getHistoryBadgeClasses(row.statusColor)}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {(detail.history || []).length === 0 && (
                      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                        Belum ada riwayat kehadiran untuk bulan yang dipilih.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
