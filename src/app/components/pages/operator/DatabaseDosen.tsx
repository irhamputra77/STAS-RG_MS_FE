import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Eye, Pencil, FlaskConical, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "../../../lib/api";
import { useConfirmDialog } from "../../molecules/ConfirmDialog";
import { OperatorLayout } from "../../templates/OperatorLayout";

interface DosenRecord {
  id: string;
  name: string;
  kodeDosen: string;
  nip: string;
  nidn: string;
  email: string;
  phone: string;
  asalKampus: string;
  pendidikanTerakhir: string;
  kategoriDosen: string;
  tanggalPersetujuanAnggota: string;
  departemen: string;
  jfa: string;
  keahlian: string[];
  status: string;
  bergabung: string;
  mahasiswaCount: number;
  risetDipimpin: number;
  risetDiikuti: number;
  color: string;
  initials: string;
}

const AVATAR_COLORS = [
  "bg-[#E74C3C] text-white",
  "bg-[#3498DB] text-white",
  "bg-[#2ECC71] text-white",
  "bg-[#F39C12] text-white",
  "bg-[#9B59B6] text-white"
];

const EMPTY_FORM = {
  id: "",
  name: "",
  kodeDosen: "",
  nip: "",
  nidn: "",
  password: "",
  email: "",
  phone: "",
  asalKampus: "",
  pendidikanTerakhir: "",
  kategoriDosen: "",
  tanggalPersetujuanAnggota: "",
  jfa: "",
  departemen: "",
  keahlian: "",
  status: "Aktif"
};

function toInitials(name: string) {
  return name?.split(" ")?.map((part) => part[0])?.join("")?.toUpperCase()?.slice(0, 2) || "XX";
}

function withFallback(value?: string | null, fallback = "-") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function formatDateDisplay(value?: string | null) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "-") return "-";

  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default function DatabaseDosen() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [filterCampus, setFilterCampus] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [selected, setSelected] = useState<DosenRecord | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [dosens, setDosens] = useState<DosenRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const reloadDosens = async () => {
    const rows = await apiGet<Array<any>>("/lecturers");
    const mapped = rows.map((item, idx) => ({
      id: item.id,
      name: item.name,
      kodeDosen: withFallback(item.kode_dosen || item.kodeDosen || item.id),
      nip: withFallback(item.nip),
      nidn: withFallback(item.nidn),
      email: withFallback(item.email),
      phone: withFallback(item.phone),
      asalKampus: withFallback(item.asal_kampus || item.asalKampus),
      pendidikanTerakhir: withFallback(item.pendidikan_terakhir || item.pendidikanTerakhir),
      kategoriDosen: withFallback(item.kategori_dosen || item.kategoriDosen),
      tanggalPersetujuanAnggota: withFallback(item.tanggal_persetujuan_anggota || item.tanggalPersetujuanAnggota),
      departemen: withFallback(item.departemen),
      jfa: withFallback(item.jfa || item.jabatan),
      keahlian: Array.isArray(item.keahlian)
        ? item.keahlian
        : String(item.keahlian || "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
      status: item.status || "Aktif",
      bergabung: item.bergabung || "-",
      mahasiswaCount: item.mahasiswa_count || item.mahasiswaCount || 0,
      risetDipimpin: item.riset_dipimpin || item.risetDipimpin || 0,
      risetDiikuti: item.riset_diikuti || item.risetDiikuti || 0,
      color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      initials: toInitials(item.name)
    }));
    setDosens(mapped);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await reloadDosens();
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data dosen.");
      }
    };

    load();
  }, []);

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setModal("add");
  };

  const openEditModal = (dosen: DosenRecord) => {
    setForm({
      id: dosen.id,
      name: dosen.name,
      kodeDosen: dosen.kodeDosen === dosen.id ? "" : dosen.kodeDosen,
      nip: dosen.nip === "-" ? "" : dosen.nip,
      nidn: dosen.nidn === "-" ? "" : dosen.nidn,
      password: "",
      email: dosen.email === "-" ? "" : dosen.email,
      phone: dosen.phone === "-" ? "" : dosen.phone,
      asalKampus: dosen.asalKampus === "-" ? "" : dosen.asalKampus,
      pendidikanTerakhir: dosen.pendidikanTerakhir === "-" ? "" : dosen.pendidikanTerakhir,
      kategoriDosen: dosen.kategoriDosen === "-" ? "" : dosen.kategoriDosen,
      tanggalPersetujuanAnggota: dosen.tanggalPersetujuanAnggota === "-" ? "" : dosen.tanggalPersetujuanAnggota,
      jfa: dosen.jfa === "-" ? "" : dosen.jfa,
      departemen: dosen.departemen === "-" ? "" : dosen.departemen,
      keahlian: dosen.keahlian.join(", "),
      status: dosen.status
    });
    setModal("edit");
  };

  const handleSaveDosen = async () => {
    if (!form.name.trim() || !form.nip.trim()) {
      setError("Nama dan NIP wajib diisi.");
      return;
    }

    if (modal === "add" && !form.password.trim()) {
      setError("Password wajib diisi saat membuat akun dosen baru.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        id: form.id || `D${Date.now()}`,
        name: form.name.trim(),
        initials: toInitials(form.name),
        kode_dosen: form.kodeDosen.trim() || null,
        nip: form.nip.trim(),
        nidn: form.nidn.trim() || null,
        password: form.password.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        asal_kampus: form.asalKampus.trim() || null,
        pendidikan_terakhir: form.pendidikanTerakhir.trim() || null,
        kategori_dosen: form.kategoriDosen.trim() || null,
        tanggal_persetujuan_anggota: form.tanggalPersetujuanAnggota || null,
        jfa: form.jfa.trim() || null,
        jabatan: form.jfa.trim() || null,
        departemen: form.departemen.trim() || null,
        keahlian: form.keahlian
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        status: form.status || "Aktif"
      };

      if (modal === "add") {
        await apiPost("/lecturers", payload);
      } else {
        await apiPut(`/lecturers/${payload.id}`, payload);
      }

      await reloadDosens();
      setModal(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan data dosen.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDosen = async (dosen: DosenRecord, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const confirmed = await confirm({
      title: "Hapus data dosen?",
      description: `Data dosen "${dosen.name}" akan dihapus dari database.`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger"
    });

    if (!confirmed) return;

    try {
      setDeletingId(dosen.id);
      setError("");
      await apiDelete(`/lecturers/${dosen.id}`);
      if (selected?.id === dosen.id) setSelected(null);
      await reloadDosens();
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus data dosen.");
    } finally {
      setDeletingId(null);
    }
  };

  const campuses = [
    "Semua",
    ...Array.from(new Set(dosens.map((dosen) => dosen.asalKampus).filter((value) => value && value !== "-")))
  ];

  const filtered = useMemo(() => {
    return dosens.filter((dosen) => {
      const q = search.toLowerCase();
      const matchesQuery =
        !q ||
        dosen.name.toLowerCase().includes(q) ||
        dosen.kodeDosen.toLowerCase().includes(q) ||
        dosen.nip.toLowerCase().includes(q) ||
        dosen.nidn.toLowerCase().includes(q) ||
        dosen.email.toLowerCase().includes(q) ||
        dosen.phone.toLowerCase().includes(q) ||
        dosen.asalKampus.toLowerCase().includes(q);
      const matchesCampus = filterCampus === "Semua" || dosen.asalKampus === filterCampus;
      const matchesStatus = filterStatus === "Semua" || dosen.status === filterStatus;
      return matchesQuery && matchesCampus && matchesStatus;
    });
  }, [dosens, filterCampus, filterStatus, search]);

  return (
    <OperatorLayout title="Database Dosen">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="flex w-72 items-center gap-2 rounded-[12px] border border-border bg-white px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-green-300">
              <Search size={15} className="shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, kode dosen, NIP, HP..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={filterCampus}
              onChange={(event) => setFilterCampus(event.target.value)}
              className="h-9 rounded-[10px] border border-border bg-white px-3 text-sm font-bold focus:outline-none"
            >
              {campuses.map((campus) => (
                <option key={campus}>{campus}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-9 rounded-[10px] border border-border bg-white px-3 text-sm font-bold focus:outline-none"
            >
              {["Semua", "Aktif", "Pensiun"].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <button
            onClick={openAddModal}
            className="flex h-9 items-center gap-2 rounded-[10px] bg-[#0AB600] px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#099800]"
          >
            <Plus size={15} strokeWidth={3} /> Tambah Dosen
          </button>
        </div>

        <div className="flex items-start gap-5">
          <div className="flex-1 overflow-x-auto rounded-[14px] border border-border bg-white shadow-sm">
            <table className="min-w-[1320px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  {[
                    "Dosen",
                    "NIP / NIDN",
                    "Kontak HP",
                    "Asal Kampus",
                    "Persetujuan Anggota",
                    "Pendidikan",
                    "Kategori",
                    "Riset Dipimpin",
                    "Riset Diikuti",
                    "Status",
                    "Aksi"
                  ].map((header) => (
                    <th key={header} className="px-5 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((dosen) => (
                  <tr
                    key={dosen.id}
                    onClick={() => setSelected(selected?.id === dosen.id ? null : dosen)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${selected?.id === dosen.id ? "bg-green-50/30" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${dosen.color}`}>
                          {dosen.initials}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-foreground">{dosen.name}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                              {dosen.kodeDosen}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{dosen.jfa}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono">NIP: {dosen.nip}</span>
                        <span className="font-mono">NIDN: {dosen.nidn}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{dosen.phone}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{dosen.asalKampus}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDateDisplay(dosen.tanggalPersetujuanAnggota)}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{dosen.pendidikanTerakhir}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{dosen.kategoriDosen}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F5FF] px-2 py-0.5 text-xs font-black text-[#6C47FF]">
                        <FlaskConical size={10} /> {dosen.risetDipimpin}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-muted-foreground">{dosen.risetDiikuti}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${dosen.status === "Aktif" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                        {dosen.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(dosen);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-[#F8F5FF] hover:text-[#6C47FF]"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(dosen);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-green-50 hover:text-green-600"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(event) => handleDeleteDosen(dosen, event)}
                          disabled={deletingId === dosen.id}
                          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border bg-slate-50/50 px-5 py-3">
              <p className="text-xs font-medium text-muted-foreground">{filtered.length} dosen ditampilkan</p>
            </div>
          </div>

          {selected && (
            <div className="w-[320px] shrink-0 overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-green-50 to-white px-5 py-4">
                <h3 className="text-sm font-black text-foreground">Profil Dosen</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-5">
                <div className="mb-4 flex flex-col items-center gap-2 border-b border-border pb-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-black ${selected.color}`}>
                    {selected.initials}
                  </div>
                  <div className="text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <p className="font-black text-foreground">{selected.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                        {selected.kodeDosen}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{selected.jfa}</p>
                    <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-black ${selected.status === "Aktif" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                      {selected.status}
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-2 border-b border-border pb-4 text-xs">
                  {[
                    ["NIP", selected.nip],
                    ["NIDN", selected.nidn],
                    ["Email", selected.email],
                    ["Kontak HP", selected.phone],
                    ["Asal Kampus", selected.asalKampus],
                    ["Pendidikan", selected.pendidikanTerakhir],
                    ["Kategori", selected.kategoriDosen],
                    ["Persetujuan", formatDateDisplay(selected.tanggalPersetujuanAnggota)],
                    ["JFA", selected.jfa],
                    ["Departemen", selected.departemen],
                    ["Bergabung", selected.bergabung],
                    ["Mahasiswa", `${selected.mahasiswaCount} aktif`]
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <span className="w-24 shrink-0 font-black text-muted-foreground">{label}</span>
                      <span className="font-bold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4 border-b border-border pb-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Keahlian</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.keahlian.length > 0 ? (
                      selected.keahlian.map((keahlian) => (
                        <span key={keahlian} className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                          {keahlian}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs italic text-muted-foreground">Belum ada keahlian yang diisi.</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                    <FlaskConical size={10} /> Keanggotaan Riset
                  </p>
                  <p className="text-xs italic text-muted-foreground">Data riset dimuat dari API /research</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(selected)}
                    className="flex-1 rounded-[10px] bg-[#0AB600] py-2 text-xs font-black text-white transition-colors hover:bg-[#099800]"
                  >
                    Edit Data Dosen
                  </button>
                  <button
                    onClick={() => handleDeleteDosen(selected)}
                    disabled={deletingId === selected.id}
                    className="flex-1 rounded-[10px] bg-red-500 py-2 text-xs font-black text-white transition-colors hover:bg-red-600 disabled:bg-red-300"
                  >
                    {deletingId === selected.id ? "Menghapus..." : "Hapus Data"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div className="w-full max-w-[760px] rounded-[20px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h3 className="font-black text-foreground">{modal === "add" ? "Tambah Dosen" : "Edit Dosen"}</h3>
              <button
                onClick={() => setModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              {[
                { key: "name", label: "Nama Lengkap", placeholder: "Dr. / Prof. ...", col: "col-span-2" },
                { key: "kodeDosen", label: "Kode Dosen", placeholder: "KDS-001", col: "" },
                { key: "password", label: modal === "add" ? "Password" : "Password Baru (Opsional)", placeholder: modal === "add" ? "Minimal 6 karakter" : "Kosongkan jika tidak diubah", col: "", type: "password" },
                { key: "nip", label: "NIP", placeholder: "Nomor Induk Pegawai", col: "" },
                { key: "nidn", label: "NIDN", placeholder: "Nomor Induk Dosen Nasional", col: "" },
                { key: "email", label: "Email", placeholder: "nama@ac.id", col: "" },
                { key: "phone", label: "Kontak HP", placeholder: "08xxxxxxxxxx", col: "" },
                { key: "asalKampus", label: "Asal Kampus", placeholder: "Telkom University", col: "" },
                { key: "pendidikanTerakhir", label: "Pendidikan Terakhir", placeholder: "S2 / S3", col: "" },
                { key: "kategoriDosen", label: "Kategori Dosen", placeholder: "Tetap / Tidak Tetap", col: "" },
                { key: "tanggalPersetujuanAnggota", label: "Tanggal Persetujuan Anggota", placeholder: "", col: "", type: "date" },
                { key: "jfa", label: "JFA", placeholder: "Asisten Ahli, Lektor...", col: "" },
                { key: "departemen", label: "Departemen", placeholder: "Teknik Informatika", col: "" },
                { key: "keahlian", label: "Keahlian", placeholder: "ML, IoT, Cloud (pisah koma)", col: "col-span-2" }
              ].map((field) => (
                <div key={field.key} className={field.col}>
                  <label className="mb-1.5 block text-xs font-black text-foreground">{field.label}</label>
                  <input
                    type={field.type || "text"}
                    value={(form as any)[field.key]}
                    onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="h-10 w-full rounded-[10px] border border-border px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-black text-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="h-10 w-full rounded-[10px] border border-border px-3 text-sm focus:outline-none"
                >
                  <option>Aktif</option>
                  <option>Pensiun</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-[10px] border border-border py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={handleSaveDosen}
                className="flex-1 rounded-[10px] bg-[#0AB600] py-2 text-sm font-black text-white transition-colors hover:bg-[#099800] disabled:bg-green-400"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog}
    </OperatorLayout>
  );
}
