import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { MapPin, Clock, LogIn, LogOut, Search, Filter } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { apiGet, apiPost, getStoredUser } from "../lib/api";

export default function Attendance() {
  const user = getStoredUser();
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [monthLabel, setMonthLabel] = useState("");
  const [chartData, setChartData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [historyData, setHistoryData] = useState<Array<{ date: string; in: string; out: string; duration: string; status: string; statusColor: string }>>([]);
  const [todayData, setTodayData] = useState({ checkIn: "--:--", checkOut: "--:--", status: "Belum Check-in" });
  const [gpsInfo, setGpsInfo] = useState<{ latitude: number; longitude: number; radius: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadAttendance = async () => {
    if (!user?.id) return;
    try {
      const data = await apiGet<any>(`/attendance?studentId=${encodeURIComponent(user.id)}`);
      setMonthLabel(
        data?.month
          ? new Date(`${data.month}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
          : ""
      );
      setChartData(data.chartData || []);
      setHistoryData(data.history || []);
      setTodayData(data.today || { checkIn: "--:--", checkOut: "--:--", status: "Belum Check-in" });
      setGpsInfo(data.gps || null);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Gagal memuat data kehadiran");
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [user?.id]);

  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Browser tidak mendukung geolocation."));
        return;
      }

      if (!window.isSecureContext) {
        reject(new Error("Geolocation hanya berjalan di HTTPS atau localhost. Buka aplikasi via http://localhost:5173 atau gunakan HTTPS."));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

  const getLocationPermissionState = async (): Promise<"granted" | "denied" | "prompt" | "unknown"> => {
    try {
      if (!navigator.permissions?.query) return "unknown";
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return status.state;
    } catch {
      return "unknown";
    }
  };

  const handleAttendanceAction = async () => {
    if (!user?.id || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const permissionState = await getLocationPermissionState();
      if (permissionState === "denied") {
        throw new Error("Izin lokasi sedang diblokir browser. Buka ikon gembok di address bar > Site settings > Location > Allow, lalu refresh halaman.");
      }

      const position = await getCurrentPosition();
      const payload = {
        studentId: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      if (todayData.status === "Berlangsung") {
        await apiPost("/attendance/check-out", payload);
      } else {
        await apiPost("/attendance/check-in", payload);
      }

      await loadAttendance();
    } catch (err: any) {
      if (err?.code === 1) {
        setError("Izin lokasi ditolak. Klik ikon gembok di address bar, ubah Location menjadi Allow, lalu refresh halaman.");
      } else if (err?.code === 2) {
        setError("Lokasi tidak tersedia. Pastikan GPS/lokasi device aktif, lalu coba lagi.");
      } else if (err?.code === 3) {
        setError("Permintaan lokasi timeout. Coba lagi di area dengan sinyal GPS lebih stabil.");
      } else {
        setError(err?.message || "Gagal memproses absensi GPS");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalDays = chartData.reduce((acc, curr) => acc + curr.value, 0);
  const hadirPercentage = totalDays > 0
    ? Math.round(((chartData.find(d => d.name === "Hadir")?.value || 0) / totalDays) * 100)
    : 0;

  const filters = ["Semua", "Hadir", "Tidak Hadir", "Cuti"];

  const filteredData = historyData.filter((row) => {
    if (activeFilter === "Semua") return true;
    if (activeFilter === "Hadir") return row.status === "Hadir";
    if (activeFilter === "Tidak Hadir") return row.status === "Tidak Hadir";
    if (activeFilter === "Cuti") return row.status === "Cuti";
    return true;
  });

  const getBadgeStyle = (colorName: string) => {
    switch (colorName) {
      case "green":
        return "text-success bg-success/10 border-success/20";
      case "red":
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "amber":
        return "text-accent bg-accent/10 border-accent/20";
      case "gray":
        return "text-muted-foreground bg-muted border-border";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  const openGpsCoordinates = () => {
    if (!gpsInfo) return;
    const url = `https://www.google.com/maps?q=${gpsInfo.latitude},${gpsInfo.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Layout title="Kehadiran (GPS)">
      <div className="flex flex-col gap-6 w-full mx-auto pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        
        {/* Top Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Dark GPS Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[14px] p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between h-full border border-slate-800 min-h-[300px]">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
            
            <div className="relative z-10 flex flex-col gap-5 h-full">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/70 mb-1">Hari ini</p>
                  <h2 className="text-xl font-bold">Kehadiran Hari Ini</h2>
                </div>
              </div>

              {/* Time Boxes */}
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="bg-white/10 border border-white/10 rounded-[12px] p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/70 mb-2">
                    <LogIn size={16} />
                    <span className="text-sm font-medium">Waktu Check-In</span>
                  </div>
                  <p className="text-3xl font-bold font-mono tracking-tight">{todayData.checkIn}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-[12px] p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/50 mb-2">
                    <LogOut size={16} />
                    <span className="text-sm font-medium">Waktu Check-Out</span>
                  </div>
                  <p className="text-3xl font-bold font-mono tracking-tight text-white/50">{todayData.checkOut}</p>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between gap-6 pt-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-white/70 mb-2">
                    <span>Status: {todayData.status}</span>
                    {gpsInfo && <span>Radius: {gpsInfo.radius} m</span>}
                  </div>
                  {gpsInfo && (
                    <button
                      onClick={openGpsCoordinates}
                      type="button"
                      className="text-[11px] text-white/80 hover:text-white underline underline-offset-2 mb-2"
                    >
                      Lihat titik absensi ({gpsInfo.latitude.toFixed(5)}, {gpsInfo.longitude.toFixed(5)})
                    </button>
                  )}
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="bg-success h-1.5 rounded-full"
                      style={{ width: todayData.status === "Selesai" ? "100%" : todayData.status === "Berlangsung" ? "50%" : "0%" }}
                    ></div>
                  </div>
                </div>
                <button
                  onClick={handleAttendanceAction}
                  disabled={submitting || todayData.status === "Selesai"}
                  className="bg-primary hover:bg-primary-light disabled:bg-slate-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-[12px] font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {todayData.status === "Berlangsung" ? <LogOut size={18} /> : <MapPin size={18} />}
                  {todayData.status === "Selesai"
                    ? "Absensi Selesai"
                    : submitting
                      ? "Memproses..."
                      : todayData.status === "Berlangsung"
                        ? "Check-Out Sekarang"
                        : "Check-In Sekarang"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Attendance Donut Chart */}
          <div className="bg-card border border-border rounded-[14px] p-6 shadow-sm flex flex-col h-full min-h-[300px]">
            <h2 className="text-lg font-bold text-foreground mb-4">Rekap Kehadiran {monthLabel ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) : "Bulan Ini"}</h2>
            
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-8">
              {/* Chart */}
              <div className="relative w-48 h-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} Hari`, "Total"]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-foreground">{hadirPercentage}%</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hadir</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 flex flex-col gap-3 w-full">
                {chartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{item.value} <span className="text-xs font-medium text-muted-foreground ml-1">Hari</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Section: History Table */}
        <div className="bg-card border border-border rounded-[14px] shadow-sm flex flex-col overflow-hidden">
          {/* Table Header & Filters */}
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock size={20} className="text-primary" /> Riwayat Kehadiran
            </h2>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap border ${
                    activeFilter === filter
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Tanggal</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Check-In</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Check-Out</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Durasi</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{row.date}</td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {row.in === "-" ? "-" : <span className="font-mono text-sm bg-background border border-border px-2 py-1 rounded-md">{row.in}</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {row.out === "-" ? "-" : <span className="font-mono text-sm bg-background border border-border px-2 py-1 rounded-md">{row.out}</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{row.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getBadgeStyle(row.statusColor)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredData.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Search size={24} />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold">Tidak ada data</h3>
                  <p className="text-sm text-muted-foreground">Tidak ada riwayat kehadiran untuk filter "{activeFilter}".</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
