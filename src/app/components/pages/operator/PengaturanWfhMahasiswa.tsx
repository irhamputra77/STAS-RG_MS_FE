import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCcw, Save, Search, Settings2, Users, X } from "lucide-react";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { apiGet, apiPatch } from "../../../lib/api";

// Data row for student WFH settings
export type StudentSettingRow = {
  studentName: string;
  nim: string;
  wfhQuota: number;
  hasSetting: boolean;
  draftQuota: string;
};

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeQuotaInput(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function mapStudentRow(item: any): StudentSettingRow {
  const studentName = String(item?.studentName || item?.student_name || item?.nama || item?.name || "").trim();
  const nim = String(item?.nim || item?.studentNim || item?.student_nim || "").trim();
  const wfhQuota = readNumber(item?.wfhQuota, item?.wfh_quota);
  const hasSetting = Boolean(item?.hasSetting ?? item?.has_setting);
  return {
    studentName,
    nim,
    wfhQuota,
    hasSetting,
    draftQuota: String(wfhQuota),
  };
}


export default function PengaturanWfhMahasiswa() {
  const [rows, setRows] = useState<StudentSettingRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStudentSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const settingsResponse = await apiGet<any>("/wfh-settings/students");
      const settingsItems = Array.isArray(settingsResponse?.items) ? settingsResponse.items : Array.isArray(settingsResponse) ? settingsResponse : [];
      const rows = settingsItems.map((item: any) => mapStudentRow(item));
      setRows(rows);
      setMessage("");
    } catch (err: any) {
      setRows([]);
      setError(err?.message || "Gagal memuat pengaturan WFH mahasiswa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudentSettings();
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;
    return rows.filter((item) => item.studentName.toLowerCase().includes(normalizedQuery) || item.nim.includes(normalizedQuery));
  }, [rows, query]);

  const dirtyCount = useMemo(() => (
    rows.filter((item) => normalizeQuotaInput(item.draftQuota) !== item.wfhQuota).length
  ), [rows]);

  const summary = useMemo(() => ({
    studentCount: rows.length,
    activeCount: rows.filter((item) => item.hasSetting).length,
    pendingCount: rows.filter((item) => !item.hasSetting).length,
  }), [rows]);

  const handleQuotaChange = (nim: string, value: string) => {
    setMessage("");
    setRows((prev) => prev.map((item) => (
      item.nim === nim
        ? { ...item, draftQuota: value }
        : item
    )));
  };

  const handleSave = async () => {
    const changedItems = rows
      .filter((item) => normalizeQuotaInput(item.draftQuota) !== item.wfhQuota)
      .map((item) => ({
        nim: item.nim,
        wfhQuota: normalizeQuotaInput(item.draftQuota),
      }));
    if (changedItems.length === 0) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await apiPatch<any>("/wfh-settings/students", {
        items: changedItems,
      });
      setMessage(response?.message || "Pengaturan WFH per mahasiswa berhasil diperbarui.");
      await loadStudentSettings();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan pengaturan WFH mahasiswa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OperatorLayout title="Pengaturan WFH Mahasiswa">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Total Mahasiswa", value: summary.studentCount, icon: <Users size={20} className="text-blue-600" />, color: "bg-blue-100" },
            { label: "Setting Aktif", value: summary.activeCount, icon: <Save size={20} className="text-emerald-600" />, color: "bg-emerald-100" },
            { label: "Belum Disetting", value: summary.pendingCount, icon: <AlertTriangle size={20} className="text-amber-600" />, color: "bg-amber-100" },
          ].map((item) => (
            <div key={item.label} className="rounded-[14px] border border-border bg-white p-4 shadow-sm flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{item.value}</p>
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-[16px] border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-black text-foreground">Daftar Mahasiswa & Jatah WFH per Minggu</h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {dirtyCount > 0 ? `${dirtyCount} perubahan belum disimpan.` : "Semua pengaturan mahasiswa sudah sinkron."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-[12px] border border-border bg-white px-3 py-2 sm:w-72">
                <Search size={15} className="shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama mahasiswa atau NIM..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={() => void loadStudentSettings()}
                disabled={loading || saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-border bg-white px-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
                Muat Ulang
              </button>
              <button
                onClick={handleSave}
                disabled={saving || dirtyCount === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0AB600] px-4 text-sm font-black text-white transition-colors hover:bg-[#099800] disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
              <Loader2 size={22} className="animate-spin text-[#0AB600]" />
              <div>
                <p className="text-sm font-black text-foreground">Memuat daftar mahasiswa...</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Mengambil data mahasiswa dan pengaturan WFH.</p>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-slate-100 text-slate-500">
                <Users size={22} />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">
                  {rows.length === 0 ? "Belum ada mahasiswa yang bisa diatur." : "Tidak ada mahasiswa yang cocok."}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {rows.length === 0
                    ? "Pastikan data mahasiswa sudah tersedia agar pengaturan WFH dapat dilakukan."
                    : "Coba ubah kata kunci pencarian atau muat ulang data."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50">
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">Nama Mahasiswa</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">NIM</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">Jatah WFH / Minggu</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">Status Setting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((item) => {
                    const isDirty = normalizeQuotaInput(item.draftQuota) !== item.wfhQuota;
                    return (
                      <tr key={item.nim} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <p className="font-black text-foreground">{item.studentName}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-foreground">{item.nim}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={0}
                              value={item.draftQuota}
                              onChange={(event) => handleQuotaChange(item.nim, event.target.value)}
                              className={`h-10 w-28 rounded-[10px] border px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 transition-all ${isDirty
                                  ? "border-amber-300 bg-amber-50 focus:ring-amber-300"
                                  : "border-border bg-white focus:ring-[#0AB600]/20"
                                }`}
                            />
                            <span className="text-xs font-semibold text-muted-foreground">hari / minggu</span>
                            {isDirty && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                Belum disimpan
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${item.hasSetting
                              ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                              : "border border-amber-200 bg-amber-100 text-amber-700"
                            }`}>
                            {item.hasSetting ? "Aktif" : "Belum disetting"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </OperatorLayout>
  );
}
