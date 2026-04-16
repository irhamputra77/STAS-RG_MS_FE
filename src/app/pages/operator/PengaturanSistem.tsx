import React, { useState } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { Globe, MapPin, CalendarOff, Bell, Save, Check } from "lucide-react";
import { apiGet, apiPatch } from "../../lib/api";

const TABS = [
  { id: "umum", label: "Umum", icon: Globe },
  { id: "gps", label: "Absensi GPS", icon: MapPin },
  { id: "cuti", label: "Kuota Cuti", icon: CalendarOff },
  { id: "notif", label: "Notifikasi", icon: Bell },
];

const NOTIF_EVENTS = [
  { id: "logbook_reminder", label: "Pengingat Logbook Harian", enabled: true },
  { id: "cuti_request", label: "Pengajuan Cuti Masuk", enabled: true },
  { id: "surat_request", label: "Permintaan Surat Masuk", enabled: true },
  { id: "milestone_update", label: "Update Milestone Riset", enabled: false },
  { id: "low_attendance", label: "Kehadiran Rendah (< 75%)", enabled: true },
  { id: "logbook_missing", label: "Logbook Tidak Diisi 3+ Hari", enabled: true },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-[#0AB600]" : "bg-slate-200"}`}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all" style={{ left: enabled ? "calc(100% - 18px)" : "2px" }} />
    </button>
  );
}

function SaveRow({ onSave }: { onSave: () => Promise<void> }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const handle = async () => {
    setStatus("saving");
    try {
      await onSave();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  const buttonClass =
    status === "saved"
      ? "bg-emerald-500 text-white"
      : status === "error"
        ? "bg-red-500 text-white"
        : "bg-[#0AB600] hover:bg-[#099800] text-white";

  return (
    <button disabled={status === "saving"} onClick={handle} className={`flex items-center gap-2 h-10 px-5 text-sm font-black rounded-[12px] transition-all disabled:opacity-70 ${buttonClass}`}>
      {status === "saved" ? <><Check size={15} strokeWidth={3} /> Tersimpan!</> : status === "error" ? <><Save size={15} /> Gagal Simpan</> : <><Save size={15} /> {status === "saving" ? "Menyimpan..." : "Simpan Perubahan"}</>}
    </button>
  );
}

export default function PengaturanSistem() {
  const [tab, setTab] = useState("umum");
  const [health, setHealth] = useState<{
    ok: boolean;
    service: string;
    time: string;
  } | null>(null);
  const [umum, setUmum] = useState({
    appName: "STAS-RG MS",
    universityName: "Telkom University",
    academicYear: "2025/2026",
    semester: "Genap",
    logoDataUrl: "" as string | null
  });
  const [gps, setGps] = useState({
    latitude: -7.5571,
    longitude: 110.8316,
    radius: 15
  });
  const [cuti, setCuti] = useState({
    maxSemesterDays: 3,
    maxMonthDays: 2,
    minAttendancePct: 80,
    period: "Genap 2025/2026"
  });
  const [events, setEvents] = useState(NOTIF_EVENTS);
  const [notifReminder, setNotifReminder] = useState({
    firstTime: "09:00",
    secondTime: "15:00",
    deadlineTime: "23:59",
    toleranceDays: 1
  });
  const [attendanceRules, setAttendanceRules] = useState({
    risetMinWeeklyHours: 4,
    risetTargetWeeklyHours: 6,
    magangDailyHours: 9,
    magangWorkDays: "5",
    earlyCheckoutWarning: true
  });
  const [error, setError] = useState("");
  const [gpsUpdating, setGpsUpdating] = useState(false);
  const [liveCalibrating, setLiveCalibrating] = useState(false);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<Date | null>(null);
  const gpsRef = React.useRef(gps);
  const liveTimerRef = React.useRef<number | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const [data, healthData] = await Promise.all([
          apiGet<any>("/system-settings"),
          apiGet<any>("/health").catch(() => null),
        ]);
        setUmum({
          appName: data?.umum?.appName || "STAS-RG MS",
          universityName: data?.umum?.universityName || "Telkom University",
          academicYear: data?.umum?.academicYear || "2025/2026",
          semester: data?.umum?.semester || "Genap",
          logoDataUrl: data?.umum?.logoDataUrl || null
        });
        setGps({
          latitude: Number(data?.gps?.latitude) || -7.5571,
          longitude: Number(data?.gps?.longitude) || 110.8316,
          radius: Number(data?.gps?.radius) || 15
        });
        setCuti({
          maxSemesterDays: Number(data?.cuti?.maxSemesterDays) || 3,
          maxMonthDays: Number(data?.cuti?.maxMonthDays) || 2,
          minAttendancePct: Number(data?.cuti?.minAttendancePct) || 80,
          period: data?.cuti?.period || "Genap 2025/2026"
        });
        if (Array.isArray(data?.notif?.events)) {
          setEvents(data.notif.events);
        }
        setNotifReminder({
          firstTime: data?.notif?.reminder?.firstTime || "09:00",
          secondTime: data?.notif?.reminder?.secondTime || "15:00",
          deadlineTime: data?.notif?.reminder?.deadlineTime || "23:59",
          toleranceDays: Number(data?.notif?.reminder?.toleranceDays) || 1
        });
        setAttendanceRules({
          risetMinWeeklyHours: Number(data?.attendanceRules?.risetMinWeeklyHours) || 4,
          risetTargetWeeklyHours: Number(data?.attendanceRules?.risetTargetWeeklyHours) || 6,
          magangDailyHours: Number(data?.attendanceRules?.magangDailyHours) || 9,
          magangWorkDays: String(data?.attendanceRules?.magangWorkDays || "5"),
          earlyCheckoutWarning: Boolean(data?.attendanceRules?.earlyCheckoutWarning ?? true)
        });
        if (healthData?.ok) {
          setHealth({
            ok: true,
            service: healthData.service || "backend",
            time: healthData.time || "",
          });
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuat pengaturan sistem");
      }
    };

    loadSettings();
  }, []);

  React.useEffect(() => {
    gpsRef.current = gps;
  }, [gps]);

  React.useEffect(() => {
    return () => {
      if (liveTimerRef.current != null) {
        window.clearInterval(liveTimerRef.current);
      }
    };
  }, []);

  const toggleEvent = (id: string) => setEvents(p => p.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));

  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Browser tidak mendukung geolocation."));
        return;
      }

      if (!window.isSecureContext) {
        reject(new Error("Geolocation hanya berjalan di HTTPS atau localhost."));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

  const syncCurrentLocationToSettings = async () => {
    const position = await getCurrentPosition();
    const nextGps = {
      latitude: Number(position.coords.latitude),
      longitude: Number(position.coords.longitude),
      radius: gpsRef.current.radius
    };

    await apiPatch<any>("/system-settings", {
      gps: nextGps
    });

    setGps((prev) => ({ ...prev, latitude: nextGps.latitude, longitude: nextGps.longitude }));
    setLiveUpdatedAt(new Date());
  };

  const handleUseCurrentLocation = async () => {
    setError("");
    setGpsUpdating(true);

    try {
      await syncCurrentLocationToSettings();
    } catch (err: any) {
      if (err?.code === 1) {
        setError("Izin lokasi ditolak. Buka Site settings browser dan ubah Location menjadi Allow.");
      } else if (err?.code === 2) {
        setError("Lokasi tidak tersedia. Pastikan GPS/lokasi device aktif.");
      } else if (err?.code === 3) {
        setError("Permintaan lokasi timeout. Coba lagi di area dengan sinyal GPS stabil.");
      } else {
        setError(err?.message || "Gagal mengambil lokasi saat ini.");
      }
    } finally {
      setGpsUpdating(false);
    }
  };

  const stopLiveCalibration = () => {
    if (liveTimerRef.current != null) {
      window.clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    setLiveCalibrating(false);
  };

  const startLiveCalibration = async () => {
    setError("");
    setGpsUpdating(true);

    try {
      await syncCurrentLocationToSettings();

      liveTimerRef.current = window.setInterval(async () => {
        try {
          await syncCurrentLocationToSettings();
        } catch (err: any) {
          if (err?.code === 1) {
            setError("Izin lokasi ditolak. Live kalibrasi dihentikan.");
          } else if (err?.code === 2) {
            setError("Lokasi tidak tersedia. Live kalibrasi dihentikan.");
          } else if (err?.code === 3) {
            setError("Permintaan lokasi timeout saat live kalibrasi.");
          } else {
            setError(err?.message || "Gagal sinkronisasi live kalibrasi.");
          }
          stopLiveCalibration();
        }
      }, 10000);

      setLiveCalibrating(true);
    } catch (err: any) {
      if (err?.code === 1) {
        setError("Izin lokasi ditolak. Buka Site settings browser dan ubah Location menjadi Allow.");
      } else if (err?.code === 2) {
        setError("Lokasi tidak tersedia. Pastikan GPS/lokasi device aktif.");
      } else if (err?.code === 3) {
        setError("Permintaan lokasi timeout. Coba lagi di area dengan sinyal GPS stabil.");
      } else {
        setError(err?.message || "Gagal memulai live kalibrasi lokasi.");
      }
      stopLiveCalibration();
    } finally {
      setGpsUpdating(false);
    }
  };

  const saveSystemSettings = async () => {
    setError("");
    try {
      const result = await apiPatch<any>("/system-settings", {
        umum,
        gps,
        cuti,
        notif: {
          events,
          reminder: notifReminder
        },
        attendanceRules
      });

      const latest = result?.settings;
      if (latest) {
        setUmum({
          appName: latest?.umum?.appName || umum.appName,
          universityName: latest?.umum?.universityName || umum.universityName,
          academicYear: latest?.umum?.academicYear || umum.academicYear,
          semester: latest?.umum?.semester || umum.semester,
          logoDataUrl: latest?.umum?.logoDataUrl ?? umum.logoDataUrl
        });
        setGps({
          latitude: Number(latest?.gps?.latitude) || gps.latitude,
          longitude: Number(latest?.gps?.longitude) || gps.longitude,
          radius: Number(latest?.gps?.radius) || gps.radius
        });
        setCuti({
          maxSemesterDays: Number(latest?.cuti?.maxSemesterDays) || cuti.maxSemesterDays,
          maxMonthDays: Number(latest?.cuti?.maxMonthDays) || cuti.maxMonthDays,
          minAttendancePct: Number(latest?.cuti?.minAttendancePct) || cuti.minAttendancePct,
          period: latest?.cuti?.period || cuti.period
        });
        if (Array.isArray(latest?.notif?.events)) {
          setEvents(latest.notif.events);
        }
        window.dispatchEvent(new CustomEvent("stas:settings-updated", { detail: latest }));
      }
    } catch (err: any) {
      const message = err?.message || "Gagal menyimpan pengaturan sistem";
      setError(message);
      throw err;
    }
  };

  const handleLogoPick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/svg+xml"];
    const maxBytes = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setError("Format logo harus PNG atau SVG.");
      event.target.value = "";
      return;
    }

    if (file.size > maxBytes) {
      setError("Ukuran logo maksimal 2 MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Gagal membaca file logo."));
        reader.readAsDataURL(file);
      });

      setError("");
      setUmum((prev) => ({ ...prev, logoDataUrl: dataUrl }));
    } catch (err: any) {
      setError(err?.message || "Gagal memuat file logo.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setUmum((prev) => ({ ...prev, logoDataUrl: null }));
  };

  const openCoordinateMap = () => {
    const url = `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <OperatorLayout title="Pengaturan Sistem">
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex gap-6 items-start">
          {error && (
            <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}
          <div className="w-[200px] shrink-0 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pengaturan</p></div>
            <nav className="p-2 flex flex-col gap-0.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-bold transition-colors text-left ${tab === t.id ? "bg-[#0AB600] text-white" : "text-muted-foreground hover:bg-green-50 hover:text-[#0AB600]"}`}>
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">

            {/* Umum */}
            {tab === "umum" && (
              <div className="p-6 flex flex-col gap-5 max-w-[560px]">
                <div><h2 className="font-black text-foreground mb-1">Pengaturan Umum</h2><p className="text-xs text-muted-foreground">Informasi dasar sistem dan institusi.</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Nama Aplikasi</label><input value={umum.appName} onChange={(e) => setUmum((prev) => ({ ...prev, appName: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Nama Universitas</label><input value={umum.universityName} onChange={(e) => setUmum((prev) => ({ ...prev, universityName: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Tahun Akademik</label><input value={umum.academicYear} onChange={(e) => setUmum((prev) => ({ ...prev, academicYear: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Semester</label><input value={umum.semester} onChange={(e) => setUmum((prev) => ({ ...prev, semester: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div className="col-span-2">
                    <label className="text-xs font-black text-foreground block mb-1.5">Logo Aplikasi</label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                    <div onClick={handleLogoPick} className="border-2 border-dashed border-green-200 rounded-[12px] p-6 text-center hover:bg-green-50 transition-colors cursor-pointer flex flex-col items-center gap-2">
                      {umum.logoDataUrl ? (
                        <img src={umum.logoDataUrl} alt="Logo aplikasi" className="w-12 h-12 rounded-[10px] object-contain bg-white border border-green-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-[10px] bg-[#0AB600] flex items-center justify-center text-white font-black text-lg">SR</div>
                      )}
                      <p className="text-xs font-bold text-muted-foreground">Klik untuk ganti logo</p>
                      <p className="text-[10px] text-muted-foreground">PNG, SVG maks. 2 MB</p>
                    </div>
                    {umum.logoDataUrl && (
                      <button onClick={handleRemoveLogo} className="mt-2 h-8 px-3 rounded-[8px] text-xs font-black border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                        Hapus Logo
                      </button>
                    )}
                  </div>
                </div>
                <SaveRow onSave={saveSystemSettings} />
              </div>
            )}

            {/* GPS */}
            {tab === "gps" && (
              <div className="p-6 flex flex-col gap-5 max-w-[500px]">
                <div><h2 className="font-black text-foreground mb-1">Pengaturan Absensi GPS</h2><p className="text-xs text-muted-foreground">Koordinat titik lokasi dan radius valid untuk check-in.</p></div>
                {/* Map placeholder */}
                <button type="button" onClick={openCoordinateMap} className="h-48 w-full bg-slate-100 rounded-[14px] border border-border flex flex-col items-center justify-center gap-2 relative overflow-hidden hover:bg-slate-200/70 transition-colors text-left" title="Buka koordinat di Google Maps">
                  <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(#0AB600 1px, transparent 1px), linear-gradient(90deg, #0AB600 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                  <MapPin size={32} className="text-[#0AB600]" />
                  <p className="text-sm font-black text-foreground">Peta Lokasi Lab</p>
                  <p className="text-xs text-muted-foreground">Klik untuk melihat koordinat</p>
                  <div className="absolute bottom-3 right-3 bg-white border border-border rounded-[8px] px-3 py-1.5 text-xs font-bold text-muted-foreground">📍 {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}</div>
                </button>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={handleUseCurrentLocation}
                    disabled={gpsUpdating || liveCalibrating}
                    className="h-9 px-4 rounded-[10px] border border-[#0AB600]/30 bg-green-50 text-[#0AB600] text-xs font-black hover:bg-green-100 transition-colors disabled:opacity-60"
                  >
                    {gpsUpdating ? "Mengambil Lokasi..." : "Gunakan Posisi Saya Saat Ini"}
                  </button>
                  <span className="text-[11px] text-muted-foreground">Pusat radius akan dipindah, radius tetap.</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={liveCalibrating ? stopLiveCalibration : startLiveCalibration}
                    disabled={gpsUpdating}
                    className={`h-9 px-4 rounded-[10px] text-xs font-black transition-colors disabled:opacity-60 ${liveCalibrating ? "border border-red-300 bg-red-50 text-red-600 hover:bg-red-100" : "border border-[#0AB600]/30 bg-[#0AB600] text-white hover:bg-[#099800]"}`}
                  >
                    {liveCalibrating ? "Stop Live Kalibrasi" : "Mulai Live Kalibrasi (10 detik)"}
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {liveUpdatedAt ? `Sinkron terakhir: ${liveUpdatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}` : "Belum ada sinkron live"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Latitude</label><input value={gps.latitude} onChange={(e) => setGps((prev) => ({ ...prev, latitude: Number(e.target.value) || 0 }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Longitude</label><input value={gps.longitude} onChange={(e) => setGps((prev) => ({ ...prev, longitude: Number(e.target.value) || 0 }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-foreground">Radius Check-in</label>
                    <span className="text-sm font-black text-[#0AB600]">{gps.radius} meter</span>
                  </div>
                  <input type="range" min={5} max={100} step={5} value={gps.radius} onChange={e => setGps((prev) => ({ ...prev, radius: +e.target.value }))} className="w-full accent-[#0AB600] cursor-pointer" />
                  <p className="text-[10px] text-muted-foreground mt-1">Mahasiswa harus dalam radius {gps.radius}m dari koordinat.</p>
                </div>
                <SaveRow onSave={saveSystemSettings} />
              </div>
            )}

            {/* Cuti */}
            {tab === "cuti" && (
              <div className="p-6 flex flex-col gap-5 max-w-[500px]">
                <div><h2 className="font-black text-foreground mb-1">Kuota Cuti</h2><p className="text-xs text-muted-foreground">Atur batas maksimum hari cuti per mahasiswa per semester.</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Maks. Cuti per Semester (hari)</label><input type="number" value={cuti.maxSemesterDays} onChange={(e) => setCuti((prev) => ({ ...prev, maxSemesterDays: Number(e.target.value) || 0 }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Maks. Cuti per Bulan (hari)</label><input type="number" value={cuti.maxMonthDays} onChange={(e) => setCuti((prev) => ({ ...prev, maxMonthDays: Number(e.target.value) || 0 }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Minimal Kehadiran (%)</label><input type="number" value={cuti.minAttendancePct} onChange={(e) => setCuti((prev) => ({ ...prev, minAttendancePct: Number(e.target.value) || 0 }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" /></div>
                  <div><label className="text-xs font-black text-foreground block mb-1.5">Periode Akademik</label><input value={cuti.period} onChange={(e) => setCuti((prev) => ({ ...prev, period: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none transition-all" /></div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4 text-xs text-amber-700"><p className="font-black mb-1">⚠️ Catatan</p><p>Perubahan kuota hanya berlaku untuk pengajuan baru. Pengajuan yang sudah disetujui tidak terpengaruh.</p></div>
                <SaveRow onSave={saveSystemSettings} />
              </div>
            )}

            {/* Notifikasi */}
            {tab === "notif" && (
              <div className="p-6 flex flex-col gap-5 max-w-[600px]">
                <div><h2 className="font-black text-foreground mb-1">Pengaturan Notifikasi</h2><p className="text-xs text-muted-foreground">Atur jenis notifikasi dan pengingat otomatis.</p></div>
                <div>
                  <p className="text-xs font-black text-foreground mb-3">Event Notifikasi Email</p>
                  <div className="flex flex-col gap-1">
                    {events.map(e => (
                      <div key={e.id} className="flex items-center justify-between p-3.5 rounded-[10px] border border-border hover:bg-slate-50 transition-colors">
                        <p className="text-sm font-bold text-foreground">{e.label}</p>
                        <Toggle enabled={e.enabled} onChange={() => toggleEvent(e.id)} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Logbook warning time settings */}
                <div className="border-t border-border pt-5">
                  <p className="text-xs font-black text-foreground mb-1">⏰ Waktu Peringatan Logbook</p>
                  <p className="text-[11px] text-muted-foreground mb-4">Atur kapan pengingat dikirim ke mahasiswa yang belum mengisi logbook.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[["Peringatan Pertama", "09:00", "Pengingat pagi"], ["Peringatan Kedua", "15:00", "Pengingat sore"], ["Batas Akhir Pengisian", "23:59", "Deadline harian"], ["Toleransi Tidak Isi (hari)", null, "0 = tanpa toleransi"]].map(([l, v, hint], i) => (
                      <div key={String(l)}>
                        <label className="text-xs font-black text-foreground block mb-1.5">{l}</label>
                        {i === 0 && <input type="time" value={notifReminder.firstTime} onChange={(e) => setNotifReminder((prev) => ({ ...prev, firstTime: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" />}
                        {i === 1 && <input type="time" value={notifReminder.secondTime} onChange={(e) => setNotifReminder((prev) => ({ ...prev, secondTime: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" />}
                        {i === 2 && <input type="time" value={notifReminder.deadlineTime} onChange={(e) => setNotifReminder((prev) => ({ ...prev, deadlineTime: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" />}
                        {i === 3 && <input type="number" value={notifReminder.toleranceDays} min={0} max={7} onChange={(e) => setNotifReminder((prev) => ({ ...prev, toleranceDays: Number(e.target.value) || 0 }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 transition-all" />}
                        <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Mahasiswa hour rules */}
                <div className="border-t border-border pt-5">
                  <p className="text-xs font-black text-foreground mb-1">🕐 Aturan Jam Kehadiran Mahasiswa</p>
                  <p className="text-[11px] text-muted-foreground mb-4">Target jam minimum per minggu untuk setiap tipe mahasiswa.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-[12px]">
                      <p className="text-xs font-black text-[#0AB600] mb-3">Mahasiswa Riset</p>
                      <div className="flex flex-col gap-2">
                        <div><label className="text-[10px] font-black text-muted-foreground block mb-1">Min. Jam/Minggu</label><input type="number" value={attendanceRules.risetMinWeeklyHours} onChange={(e) => setAttendanceRules((prev) => ({ ...prev, risetMinWeeklyHours: Number(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-[8px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/20 transition-all" /></div>
                        <div><label className="text-[10px] font-black text-muted-foreground block mb-1">Target Jam/Minggu</label><input type="number" value={attendanceRules.risetTargetWeeklyHours} onChange={(e) => setAttendanceRules((prev) => ({ ...prev, risetTargetWeeklyHours: Number(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-[8px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/20 transition-all" /></div>
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[12px]">
                      <p className="text-xs font-black text-emerald-700 mb-3">Mahasiswa Magang</p>
                      <div className="flex flex-col gap-2">
                        <div><label className="text-[10px] font-black text-muted-foreground block mb-1">Jam Kerja/Hari</label><input type="number" value={attendanceRules.magangDailyHours} onChange={(e) => setAttendanceRules((prev) => ({ ...prev, magangDailyHours: Number(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-[8px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all" /></div>
                        <div><label className="text-[10px] font-black text-muted-foreground block mb-1">Hari Kerja</label><select value={attendanceRules.magangWorkDays} onChange={(e) => setAttendanceRules((prev) => ({ ...prev, magangWorkDays: e.target.value }))} className="w-full h-9 px-3 rounded-[8px] border border-border text-xs focus:outline-none cursor-pointer"><option value="5">Senin – Jumat (5 hari)</option><option value="6">Senin – Sabtu (6 hari)</option></select></div>
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer"><input type="checkbox" checked={attendanceRules.earlyCheckoutWarning} onChange={(e) => setAttendanceRules((prev) => ({ ...prev, earlyCheckoutWarning: e.target.checked }))} className="accent-[#0AB600]" /><span className="text-xs font-bold text-foreground">Aktifkan peringatan check-out dini untuk mahasiswa magang</span></label>
                </div>
                <SaveRow onSave={saveSystemSettings} />
              </div>
            )}
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
