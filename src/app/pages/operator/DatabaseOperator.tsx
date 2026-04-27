import React, { useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Phone, Plus, Search, ShieldCheck, Trash2, UserCog, X } from "lucide-react";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiDelete, apiGet, apiPost, apiPut } from "../../lib/api";

interface OperatorRecord {
  id: string;
  name: string;
  initials: string;
  email: string;
  username: string;
  phone: string;
  status: string;
  createdAt: string;
  color: string;
}

const AVATAR_COLORS = [
  "bg-[#0AB600] text-white",
  "bg-[#2563EB] text-white",
  "bg-[#F59E0B] text-white",
  "bg-[#7C3AED] text-white",
  "bg-[#EF4444] text-white"
];

const EMPTY_FORM = {
  name: "",
  email: "",
  username: "",
  phone: "",
  password: "",
  status: "Aktif"
};

function toInitials(name: string) {
  return name
    ?.split(" ")
    ?.map((part) => part[0])
    ?.join("")
    ?.toUpperCase()
    ?.slice(0, 2) || "OP";
}

function firstValue(...values: unknown[]) {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim() !== "");
  return value === undefined || value === null ? "" : String(value);
}

function formatDate(value: string) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeOperator(item: any, idx: number): OperatorRecord {
  const name = firstValue(item.name, item.fullName, item.full_name, item.nama, item.displayName, "Admin");
  const status = firstValue(item.status, item.active === false ? "Nonaktif" : "Aktif");

  return {
    id: firstValue(item.id, item.userId, item.user_id, item.operatorId, item.operator_id),
    name,
    initials: firstValue(item.initials, item.inisial, toInitials(name)),
    email: firstValue(item.email, "-"),
    username: firstValue(item.username, item.login, item.userName, "-"),
    phone: firstValue(item.phone, item.telepon, item.no_hp, item.phoneNumber, "-"),
    status,
    createdAt: formatDate(firstValue(item.createdAt, item.created_at, item.bergabung, "-")),
    color: AVATAR_COLORS[idx % AVATAR_COLORS.length]
  };
}

function normalizeOperatorList(response: any): OperatorRecord[] {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.operators)
        ? response.operators
        : [];

  return rows.map(normalizeOperator).filter((item) => item.id);
}

export default function DatabaseOperator() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [selected, setSelected] = useState<OperatorRecord | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<OperatorRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reloadOperators = async () => {
    const rows = await apiGet<any>("/operators");
    setOperators(normalizeOperatorList(rows));
  };

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        await reloadOperators();
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data admin.");
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operators.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q);
      const matchStatus = filterStatus === "Semua" || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [filterStatus, operators, search]);

  const openAddModal = () => {
    setError("");
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModal("add");
  };

  const openEditModal = (operator: OperatorRecord, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setError("");
    setEditTarget(operator);
    setForm({
      name: operator.name,
      email: operator.email === "-" ? "" : operator.email,
      username: operator.username === "-" ? "" : operator.username,
      phone: operator.phone === "-" ? "" : operator.phone,
      password: "",
      status: operator.status || "Aktif"
    });
    setModal("edit");
  };

  const resetForm = () => {
    setModal(null);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Nama dan email admin wajib diisi.");
      return;
    }

    if (modal === "add" && !form.password.trim()) {
      setError("Password wajib diisi saat membuat admin baru.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        initials: toInitials(form.name),
        email: form.email.trim(),
        username: form.username.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status || "Aktif",
        role: "operator"
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (modal === "add") {
        await apiPost("/operators", payload);
      } else if (editTarget) {
        await apiPut(`/operators/${editTarget.id}`, payload);
      }

      await reloadOperators();
      resetForm();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan data admin.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (operator: OperatorRecord, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const confirmed = await confirm({
      title: "Hapus data admin?",
      description: `Akun admin "${operator.name}" akan dihapus dari database.`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger"
    });
    if (!confirmed) return;

    try {
      setDeletingId(operator.id);
      setError("");
      await apiDelete(`/operators/${operator.id}`);
      if (selected?.id === operator.id) setSelected(null);
      if (editTarget?.id === operator.id) resetForm();
      await reloadOperators();
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus data admin.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <OperatorLayout title="Database Admin">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="flex h-9 w-72 items-center gap-2 rounded-[12px] border border-border bg-white px-3 transition-all focus-within:ring-2 focus-within:ring-green-300">
              <Search size={15} className="shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, email, username..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-9 cursor-pointer rounded-[10px] border border-border bg-white px-3 text-sm font-bold focus:outline-none"
            >
              <option>Semua</option>
              <option>Aktif</option>
              <option>Nonaktif</option>
            </select>
          </div>

          <button
            onClick={openAddModal}
            className="flex h-9 items-center gap-2 rounded-[10px] bg-[#0AB600] px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#099800]"
          >
            <Plus size={15} strokeWidth={3} />
            Tambah Admin
          </button>
        </div>

        <div className="flex items-start gap-5">
          <div className="min-w-0 flex-1 overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50">
                    {["Admin", "Email", "Username", "Telepon", "Bergabung", "Status", "Aksi"].map((header) => (
                      <th key={header} className="px-5 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((operator) => (
                    <tr
                      key={operator.id}
                      onClick={() => setSelected(selected?.id === operator.id ? null : operator)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${selected?.id === operator.id ? "bg-green-50/40" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${operator.color}`}>
                            {operator.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-foreground">{operator.name}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">Admin Sistem</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">{operator.email}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">{operator.username}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">{operator.phone}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">{operator.createdAt}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                            operator.status === "Aktif"
                              ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          {operator.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(event) => openEditModal(operator, event)}
                            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-green-50 hover:text-green-600"
                            title="Edit admin"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={(event) => handleDelete(operator, event)}
                            disabled={deletingId === operator.id}
                            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Hapus admin"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
                        Tidak ada data admin yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-slate-50/50 px-5 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                Menampilkan {filtered.length} dari {operators.length} admin
              </p>
            </div>
          </div>

          {selected && (
            <div className="w-[300px] shrink-0 overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-green-50 to-white px-5 py-4">
                <h3 className="text-sm font-black text-foreground">Profil Admin</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-5">
                <div className="mb-4 flex flex-col items-center gap-2 border-b border-border pb-4 text-center">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-black ${selected.color}`}>
                    {selected.initials}
                  </div>
                  <div>
                    <p className="font-black text-foreground">{selected.name}</p>
                    <p className="text-xs font-semibold text-muted-foreground">Admin Sistem</p>
                    <span
                      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-black ${
                        selected.status === "Aktif"
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {selected.status}
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 text-xs">
                  <div className="flex items-start gap-2">
                    <Mail size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words font-bold text-foreground">{selected.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserCog size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words font-bold text-foreground">{selected.username}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words font-bold text-foreground">{selected.phone}</span>
                  </div>
                </div>

                <div className="mb-5 rounded-[12px] border border-green-100 bg-green-50 px-3 py-3">
                  <div className="flex items-center gap-2 text-xs font-black text-green-700">
                    <ShieldCheck size={15} />
                    Akses Admin
                  </div>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-green-700/80">
                    Akun ini memiliki akses ke panel admin sesuai hak akses backend.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(selected)}
                    className="h-9 flex-1 rounded-[10px] bg-[#0AB600] text-xs font-black text-white transition-colors hover:bg-[#099800]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    disabled={deletingId === selected.id}
                    className="h-9 flex-1 rounded-[10px] bg-red-500 text-xs font-black text-white transition-colors hover:bg-red-600 disabled:bg-red-300"
                  >
                    {deletingId === selected.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={resetForm}>
          <div className="w-full max-w-[520px] rounded-[20px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h3 className="font-black text-foreground">{modal === "add" ? "Tambah Admin" : "Edit Admin"}</h3>
              <button
                onClick={resetForm}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-black text-foreground">Nama Lengkap</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nama admin"
                  className="h-10 w-full rounded-[10px] border border-border px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black text-foreground">Email</label>
                <input
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="admin@stas-rg.com"
                  className="h-10 w-full rounded-[10px] border border-border px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black text-foreground">Username</label>
                <input
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="username login"
                  className="h-10 w-full rounded-[10px] border border-border px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black text-foreground">Telepon</label>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="08..."
                  className="h-10 w-full rounded-[10px] border border-border px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black text-foreground">
                  {modal === "add" ? "Password" : "Password Baru"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={modal === "add" ? "Password awal" : "Kosongkan jika tidak diubah"}
                  className="h-10 w-full rounded-[10px] border border-border px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-black text-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="h-10 w-full cursor-pointer rounded-[10px] border border-border px-3 text-sm focus:outline-none"
                >
                  <option>Aktif</option>
                  <option>Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={resetForm}
                className="h-10 flex-1 rounded-[10px] border border-border text-sm font-bold text-muted-foreground transition-colors hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-10 flex-1 rounded-[10px] bg-[#0AB600] text-sm font-black text-white transition-colors hover:bg-[#099800] disabled:bg-green-400"
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
