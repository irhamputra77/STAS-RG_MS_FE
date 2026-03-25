import React, { useState, useEffect, useMemo } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import { Search, Plus, X, Eye, Pencil, FlaskConical, Users } from "lucide-react";

interface DosenRecord {
  id: string; name: string; nip: string; email: string; departemen: string; jabatan: string;
  keahlian: string[]; status: string; bergabung: string; mahasiswaCount: number;
  risetDipimpin: number; risetDiikuti: number; color: string; initials: string;
}
const AVATAR_COLORS = ["bg-[#E74C3C] text-white", "bg-[#3498DB] text-white", "bg-[#2ECC71] text-white", "bg-[#F39C12] text-white", "bg-[#9B59B6] text-white"];
function toInitials(name: string) { return name?.split(" ")?.map(n => n[0])?.join("")?.toUpperCase()?.slice(0, 2) || "XX"; }

export default function DatabaseDosen() {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [selected, setSelected] = useState<DosenRecord | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<DosenRecord | null>(null);
  const [dosens, setDosens] = useState<DosenRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    nip: "",
    password: "",
    email: "",
    jabatan: "",
    departemen: "",
    keahlian: "",
    status: "Aktif"
  });

  const reloadDosens = async () => {
    const rows = await apiGet<Array<any>>("/lecturers");
    const mapped = rows.map((item, idx) => ({
      id: item.id, name: item.name, nip: item.nip, email: item.email,
      departemen: item.departemen || "Teknik Informatika", jabatan: item.jabatan || "Lektor",
      keahlian: Array.isArray(item.keahlian) ? item.keahlian : String(item.keahlian || "").split(",").map(k => k.trim()).filter(Boolean),
      status: item.status || "Aktif", bergabung: item.bergabung || "-",
      mahasiswaCount: item.mahasiswa_count || 0, risetDipimpin: item.riset_dipimpin || 0,
      risetDiikuti: item.riset_diikuti || 0, color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      initials: toInitials(item.name)
    }));
    setDosens(mapped);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await reloadDosens();
      } catch (err: any) { setError(err?.message || "Gagal memuat data dosen."); }
    };
    load();
  }, []);

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
        nip: form.nip.trim(),
        password: form.password.trim() || null,
        email: form.email.trim() || null,
        jabatan: form.jabatan.trim() || null,
        departemen: form.departemen.trim() || null,
        keahlian: form.keahlian.split(",").map((k) => k.trim()).filter(Boolean),
        status: form.status || "Aktif"
      };

      if (modal === "add") {
        await apiPost("/lecturers", payload);
      } else {
        await apiPut(`/lecturers/${payload.id}`, payload);
      }

      await reloadDosens();
      setModal(null);
      setEditTarget(null);
      setForm({ id: "", name: "", nip: "", password: "", email: "", jabatan: "", departemen: "", keahlian: "", status: "Aktif" });
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan data dosen.");
    } finally {
      setSaving(false);
    }
  };

  const depts = ["Semua", ...Array.from(new Set(dosens.map(d => d.departemen)))];

  const filtered = useMemo(() => dosens.filter(d => {
    const q = search.toLowerCase();
    const mq = !q || d.name.toLowerCase().includes(q) || d.nip.includes(q) || d.email.toLowerCase().includes(q);
    const md = filterDept === "Semua" || d.departemen === filterDept;
    const ms = filterStatus === "Semua" || d.status === filterStatus;
    return mq && md && ms;
  }), [search, filterDept, filterStatus, dosens]);

  return (
    <OperatorLayout title="Database Dosen">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[12px] w-60 focus-within:ring-2 focus-within:ring-amber-300 transition-all">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, NIP, email..." className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground" />
            </div>
            {[
              { value: filterDept, setter: setFilterDept, options: depts },
              { value: filterStatus, setter: setFilterStatus, options: ["Semua", "Aktif", "Pensiun"] },
            ].map((f, i) => (
              <select key={i} value={f.value} onChange={e => f.setter(e.target.value)} className="h-9 px-3 bg-white border border-border rounded-[10px] text-sm font-bold focus:outline-none cursor-pointer">
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
          </div>
          <button onClick={() => { setEditTarget(null); setForm({ id: "", name: "", nip: "", password: "", email: "", jabatan: "", departemen: "", keahlian: "", status: "Aktif" }); setModal("add"); }} className="flex items-center gap-2 h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-[10px] shadow-sm transition-colors">
            <Plus size={15} strokeWidth={3} /> Tambah Dosen
          </button>
        </div>

        <div className="flex gap-5 items-start">
          {/* Table */}
          <div className="flex-1 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead><tr className="bg-slate-50 border-b border-border">
                {["Dosen", "NIP", "Departemen", "Keahlian", "Riset Dipimpin", "Riset Diikuti", "Status", "Aksi"].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered.map(d => (
                  <tr key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)} className={`cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === d.id ? "bg-amber-50/30" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${d.color}`}>{d.initials}</div>
                        <div>
                          <p className="font-black text-foreground text-sm">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">{d.jabatan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{d.nip}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{d.departemen}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {d.keahlian.slice(0, 2).map(k => <span key={k} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{k}</span>)}
                        {d.keahlian.length > 2 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">+{d.keahlian.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-[#F8F5FF] text-[#6C47FF]">
                        <FlaskConical size={10} /> {d.risetDipimpin}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-muted-foreground">{d.risetDiikuti}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${d.status === "Aktif" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{d.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={e => { e.stopPropagation(); setSelected(d); }} className="w-7 h-7 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-[#F8F5FF] hover:text-[#6C47FF] transition-colors"><Eye size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); setEditTarget(d); setForm({ id: d.id, name: d.name, nip: d.nip, password: "", email: d.email, jabatan: d.jabatan, departemen: d.departemen, keahlian: d.keahlian.join(", "), status: d.status }); setModal("edit"); }} className="w-7 h-7 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"><Pencil size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-border bg-slate-50/50">
              <p className="text-xs font-medium text-muted-foreground">{filtered.length} dosen ditampilkan</p>
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-[280px] shrink-0 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
                <h3 className="text-sm font-black text-foreground">Profil Dosen</h3>
                <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={14} /></button>
              </div>
              <div className="p-5">
                <div className="flex flex-col items-center gap-2 mb-4 pb-4 border-b border-border">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-black ${selected.color}`}>{selected.initials}</div>
                  <div className="text-center">
                    <p className="font-black text-foreground">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.jabatan}</p>
                    <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${selected.status === "Aktif" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{selected.status}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-xs mb-4 pb-4 border-b border-border">
                  {[["NIP", selected.nip], ["Email", selected.email], ["Departemen", selected.departemen], ["Bergabung", selected.bergabung], ["Mahasiswa", `${selected.mahasiswaCount} aktif`]].map(([l, v]) => (
                    <div key={l} className="flex gap-2"><span className="font-black text-muted-foreground w-20 shrink-0">{l}</span><span className="font-bold text-foreground">{v}</span></div>
                  ))}
                </div>
                <div className="mb-4 pb-4 border-b border-border">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2">Keahlian</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.keahlian.map(k => <span key={k} className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">{k}</span>)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1"><FlaskConical size={10} /> Keanggotaan Riset</p>
                  <p className="text-xs text-muted-foreground italic">Data riset dimuat dari API /research</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => {
                  setEditTarget(selected);
                  setForm({
                    id: selected.id,
                    name: selected.name,
                    nip: selected.nip,
                    password: "",
                    email: selected.email,
                    jabatan: selected.jabatan,
                    departemen: selected.departemen,
                    keahlian: selected.keahlian.join(", "),
                    status: selected.status
                  });
                  setModal("edit");
                }} className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-[10px] transition-colors">Edit Data Dosen</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">{modal === "add" ? "Tambah Dosen" : "Edit Dosen"}</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { key: "name", label: "Nama Lengkap", placeholder: "Dr. / Prof. ...", val: form.name, col: "col-span-2" },
                { key: "nip", label: "NIP", placeholder: "Nomor Induk Pegawai", val: form.nip, col: "" },
                { key: "password", label: modal === "add" ? "Password" : "Password Baru (Opsional)", placeholder: modal === "add" ? "Minimal 6 karakter" : "Kosongkan jika tidak diubah", val: form.password, col: "" },
                { key: "email", label: "Email", placeholder: "nama@ac.id", val: form.email, col: "" },
                { key: "jabatan", label: "Jabatan", placeholder: "Lektor, Guru Besar...", val: form.jabatan, col: "" },
                { key: "departemen", label: "Departemen", placeholder: "Teknik Informatika", val: form.departemen, col: "" },
                { key: "keahlian", label: "Keahlian", placeholder: "ML, IoT, Cloud (pisah koma)", val: form.keahlian, col: "col-span-2" },
              ].map(f => (
                <div key={f.label} className={f.col}>
                  <label className="text-xs font-black text-foreground block mb-1.5">{f.label}</label>
                  <input type={f.key === "password" ? "password" : "text"} value={f.val} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-black text-foreground block mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none cursor-pointer">
                  <option>Aktif</option>
                  <option>Pensiun</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Batal</button>
              <button disabled={saving} onClick={handleSaveDosen} className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-black rounded-[10px] transition-colors">{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
