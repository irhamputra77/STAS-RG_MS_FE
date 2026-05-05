import React, { useEffect, useMemo, useRef, useState } from "react";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { useConfirmDialog } from "../../molecules/ConfirmDialog";
import { apiDelete, apiGet, apiPost, apiPut, resolveApiAssetUrl } from "../../../lib/api";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Filter,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";

type ActivityRecord = {
  id: string;
  activity_date: string;
  activity_type: "riset" | "abdimas" | "internal";
  activity_form: string;
  activity_name: string;
  agenda: string;
  goal: string;
  description_summary: string;
  activity_time: string;
  location: string;
  participants_count: number | null;
  participants_list: string;
  output: string;
  folder_bergkas_url: string;
  photo_url: string;
  notulensi_url: string;
  notulensi_name: string;
  surat_url: string;
  surat_name: string;
  pic_name: string;
};

type ActivityTypeFilter = "Semua" | ActivityRecord["activity_type"];

type ActivityFormState = {
  activityDate: string;
  activityType: ActivityRecord["activity_type"];
  activityForm: string;
  activityName: string;
  agenda: string;
  goal: string;
  descriptionSummary: string;
  activityTime: string;
  location: string;
  participantsCount: string;
  participantsList: string;
  output: string;
  folderBergkasUrl: string;
  picName: string;
};

const EMPTY_FORM: ActivityFormState = {
  activityDate: "",
  activityType: "riset",
  activityForm: "meeting",
  activityName: "",
  agenda: "",
  goal: "",
  descriptionSummary: "",
  activityTime: "",
  location: "",
  participantsCount: "",
  participantsList: "",
  output: "",
  folderBergkasUrl: "",
  picName: ""
};

const TYPE_LABELS_SHORT: Record<ActivityRecord["activity_type"], string> = {
  riset: "Riset",
  abdimas: "Abdimas",
  internal: "Internal"
};

const FORM_LABELS: Record<string, string> = {
  meeting: "Rapat",
  visit_internal: "Kunjungan Internal / Lab Visit",
  visit_external: "Kunjungan Eksternal",
  lab_test: "Pengujian Lab",
  other: "Lainnya"
};

const TYPE_BADGE: Record<ActivityRecord["activity_type"], string> = {
  riset: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  abdimas: "bg-sky-100 text-sky-700 border border-sky-200",
  internal: "bg-amber-100 text-amber-700 border border-amber-200"
};

const ALLOWED_DOC_TYPES = "image/png,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function safeText(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function formatTime(value: string) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function mapActivityRow(item: any): ActivityRecord {
  return {
    id: String(item?.id || ""),
    activity_date: String(item?.activity_date || ""),
    activity_type: (item?.activity_type || "riset") as ActivityRecord["activity_type"],
    activity_form: String(item?.activity_form || "meeting"),
    activity_name: item?.activity_name || "-",
    agenda: item?.agenda || "",
    goal: item?.goal || "",
    description_summary: item?.description_summary || "",
    activity_time: item?.activity_time || "",
    location: item?.location || "",
    participants_count: item?.participants_count != null ? Number(item.participants_count) : null,
    participants_list: item?.participants_list || "",
    output: item?.output || "",
    folder_bergkas_url: item?.folder_bergkas_url || "",
    photo_url: item?.photo_url || "",
    notulensi_url: item?.notulensi_url || "",
    notulensi_name: item?.notulensi_name || "",
    surat_url: item?.surat_url || "",
    surat_name: item?.surat_name || "",
    pic_name: item?.pic_name || ""
  };
}

type FileAttachment = { dataUrl: string; fileName: string };

function FileUploadZone({
  label,
  hint,
  accept,
  attachment,
  existingUrl,
  existingName,
  onPick,
  onClear
}: {
  label: string;
  hint: string;
  accept: string;
  attachment: FileAttachment | null;
  existingUrl: string;
  existingName: string;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFile = Boolean(attachment || existingUrl);

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">{label}</p>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 transition-colors hover:bg-white">
        <Upload size={16} className="shrink-0 text-[#0AB600]" />
        <span className="text-sm font-medium text-muted-foreground">{hint}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </label>
      {hasFile && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText size={14} className="shrink-0 text-emerald-600" />
            {attachment ? (
              <span className="truncate text-xs font-semibold text-emerald-700">{attachment.fileName}</span>
            ) : (
              <a
                href={resolveApiAssetUrl(existingUrl) || existingUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-xs font-semibold text-emerald-700 hover:underline"
              >
                {existingName || "Lihat file tersimpan"}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="ml-2 shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyNotice({ message }: { message: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

type DocLink = { label: string; url: string; external?: boolean; color: string };

function DetailPanel({ activity, onClose, onEdit, onDelete, deleting }: {
  activity: ActivityRecord;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const docs: DocLink[] = [];

  if (activity.folder_bergkas_url) {
    docs.push({ label: "Folder Bergkas / Drive", url: activity.folder_bergkas_url, external: true, color: "text-[#0AB600]" });
  }
  if (activity.notulensi_url) {
    docs.push({ label: activity.notulensi_name || "Notulensi Kegiatan", url: resolveApiAssetUrl(activity.notulensi_url) || activity.notulensi_url, color: "text-blue-600" });
  }
  if (activity.surat_url) {
    docs.push({ label: activity.surat_name || "Berkas Surat", url: resolveApiAssetUrl(activity.surat_url) || activity.surat_url, color: "text-violet-600" });
  }
  if (activity.photo_url) {
    docs.push({ label: "Foto Dokumentasi", url: resolveApiAssetUrl(activity.photo_url) || activity.photo_url, color: "text-rose-600" });
  }

  return (
    <div className="fixed inset-0 z-[480] flex justify-end bg-slate-950/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black ${TYPE_BADGE[activity.activity_type]}`}>
                {TYPE_LABELS_SHORT[activity.activity_type]}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                {FORM_LABELS[activity.activity_form] || activity.activity_form}
              </span>
            </div>
            <h3 className="mt-2 font-black text-foreground leading-snug">{activity.activity_name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(activity.activity_date)}{activity.activity_time ? ` · ${formatTime(activity.activity_time)} WIB` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl border border-border bg-slate-50 p-2 text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Download dokumen */}
        <div className="border-b border-border px-5 py-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-muted-foreground">Unduh Dokumen</p>
          {docs.length === 0 ? (
            <p className="text-xs font-medium text-muted-foreground">Tidak ada berkas yang dilampirkan.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map((doc) => (
                <a
                  key={doc.url}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  download={!doc.external || undefined}
                  className={`flex items-center gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 transition-colors hover:bg-white ${doc.color}`}
                >
                  <Download size={15} className="shrink-0" />
                  <span className="min-w-0 truncate text-sm font-bold">{doc.label}</span>
                  {doc.external && <ExternalLink size={13} className="ml-auto shrink-0 opacity-60" />}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Detail info */}
        <div className="flex-1 space-y-4 px-5 py-4">
          {activity.goal && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Tujuan</p>
              <p className="mt-1 text-sm font-medium text-foreground leading-relaxed">{activity.goal}</p>
            </div>
          )}
          {activity.description_summary && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Deskripsi</p>
              <p className="mt-1 text-sm font-medium text-foreground leading-relaxed">{activity.description_summary}</p>
            </div>
          )}
          {activity.agenda && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Agenda</p>
              <p className="mt-1 text-sm font-medium text-foreground leading-relaxed">{activity.agenda}</p>
            </div>
          )}
          {activity.output && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Output / Hasil</p>
              <p className="mt-1 text-sm font-medium text-foreground leading-relaxed">{activity.output}</p>
            </div>
          )}
          {activity.location && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Lokasi</p>
              <p className="mt-1 text-sm font-medium text-foreground">{activity.location}</p>
            </div>
          )}
          {(activity.participants_count != null || activity.participants_list) && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                Peserta{activity.participants_count != null ? ` (${activity.participants_count} orang)` : ""}
              </p>
              {activity.participants_list && (
                <p className="mt-1 text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{activity.participants_list}</p>
              )}
            </div>
          )}
          {activity.pic_name && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">PIC</p>
              <p className="mt-1 text-sm font-medium text-foreground">{activity.pic_name}</p>
            </div>
          )}
          {activity.photo_url && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground mb-2">Foto Dokumentasi</p>
              <img
                src={resolveApiAssetUrl(activity.photo_url) || undefined}
                alt="Dokumentasi"
                className="w-full rounded-[16px] border border-border object-cover"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={onDelete} disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60">
            <Trash2 size={14} /> Hapus
          </button>
          <button type="button" onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0AB600] px-4 py-2.5 text-sm font-black text-white hover:bg-[#089c00]">
            <Pencil size={14} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseKegiatan() {
  const { confirm, confirmDialog } = useConfirmDialog();

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ActivityTypeFilter>("Semua");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailActivity, setDetailActivity] = useState<ActivityRecord | null>(null);

  const [form, setForm] = useState<ActivityFormState>(EMPTY_FORM);
  const [photoAttachment, setPhotoAttachment] = useState<FileAttachment | null>(null);
  const [notulensiAttachment, setNotulensiAttachment] = useState<FileAttachment | null>(null);
  const [suratAttachment, setSuratAttachment] = useState<FileAttachment | null>(null);

  const loadActivities = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await apiGet<any[]>("/activities");
      setActivities((rows || []).map(mapActivityRow));
    } catch (err: any) {
      setError(err?.message || "Gagal memuat database kegiatan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((item) => {
      const matchesType = filterType === "Semua" || item.activity_type === filterType;
      const matchesDateFrom = !filterDateFrom || item.activity_date >= filterDateFrom;
      const matchesDateTo = !filterDateTo || item.activity_date <= filterDateTo;
      const matchesSearch =
        !q ||
        [
          item.activity_name,
          item.agenda,
          item.goal,
          item.description_summary,
          item.location,
          item.participants_list,
          item.output,
          item.pic_name
        ]
          .filter(Boolean)
          .some((value) => safeText(value).toLowerCase().includes(q));
      return matchesType && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [activities, filterDateFrom, filterDateTo, filterType, search]);

  const stats = useMemo(() => ({
    total: activities.length,
    riset: activities.filter((item) => item.activity_type === "riset").length,
    abdimas: activities.filter((item) => item.activity_type === "abdimas").length,
    internal: activities.filter((item) => item.activity_type === "internal").length
  }), [activities]);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePickFile(
    file: File,
    maxMb: number,
    setter: (att: FileAttachment) => void
  ) {
    if (file.size > maxMb * 1024 * 1024) {
      setError(`Ukuran file maksimal ${maxMb} MB.`);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setter({ dataUrl, fileName: file.name });
    } catch {
      setError("Gagal membaca file.");
    }
  }

  const editingActivity = editingId ? activities.find((a) => a.id === editingId) : null;

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPhotoAttachment(null);
    setNotulensiAttachment(null);
    setSuratAttachment(null);
    setModalOpen(true);
  };

  const openEditModal = (activity: ActivityRecord) => {
    setEditingId(activity.id);
    setForm({
      activityDate: activity.activity_date,
      activityType: activity.activity_type,
      activityForm: activity.activity_form,
      activityName: activity.activity_name,
      agenda: activity.agenda,
      goal: activity.goal,
      descriptionSummary: activity.description_summary,
      activityTime: activity.activity_time,
      location: activity.location,
      participantsCount: activity.participants_count != null ? String(activity.participants_count) : "",
      participantsList: activity.participants_list,
      output: activity.output,
      folderBergkasUrl: activity.folder_bergkas_url,
      picName: activity.pic_name
    });
    setPhotoAttachment(null);
    setNotulensiAttachment(null);
    setSuratAttachment(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPhotoAttachment(null);
    setNotulensiAttachment(null);
    setSuratAttachment(null);
  };

  const saveActivity = async () => {
    setError("");
    setSuccess("");

    if (!form.activityDate || !form.activityName.trim()) {
      setError("Tanggal dan nama kegiatan wajib diisi.");
      return;
    }

    const payload: Record<string, unknown> = {
      activityDate: form.activityDate,
      activityType: form.activityType,
      activityForm: form.activityForm,
      activityName: form.activityName.trim(),
      agenda: form.agenda.trim() || null,
      goal: form.goal.trim() || null,
      descriptionSummary: form.descriptionSummary.trim() || null,
      activityTime: form.activityTime || null,
      location: form.location.trim() || null,
      participantsCount: form.participantsCount.trim() ? Number(form.participantsCount) : null,
      participantsList: form.participantsList.trim() || null,
      output: form.output.trim() || null,
      folderBergkasUrl: form.folderBergkasUrl.trim() || null,
      picName: form.picName.trim() || null,
      photoDataUrl: photoAttachment?.dataUrl || null,
      photoFileName: photoAttachment?.fileName || null,
      notulensiDataUrl: notulensiAttachment?.dataUrl || null,
      notulensiFileName: notulensiAttachment?.fileName || null,
      suratDataUrl: suratAttachment?.dataUrl || null,
      suratFileName: suratAttachment?.fileName || null
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiPut<any>(`/activities/${encodeURIComponent(editingId)}`, payload);
        setSuccess("Kegiatan berhasil diperbarui.");
      } else {
        await apiPost<any>("/activities", payload);
        setSuccess("Kegiatan berhasil ditambahkan.");
      }
      await loadActivities();
      closeModal();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan kegiatan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activity: ActivityRecord) => {
    const confirmed = await confirm({
      title: "Hapus kegiatan?",
      description: `Kegiatan "${activity.activity_name}" akan dihapus permanen dari database kegiatan.`,
      confirmLabel: "Hapus",
      variant: "danger"
    });
    if (!confirmed) return;

    setDeletingId(activity.id);
    try {
      await apiDelete(`/activities/${encodeURIComponent(activity.id)}`);
      setActivities((prev) => prev.filter((item) => item.id !== activity.id));
      setSuccess("Kegiatan berhasil dihapus.");
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus kegiatan.");
    } finally {
      setDeletingId(null);
    }
  };

  const photoPreview = photoAttachment?.dataUrl || (editingActivity?.photo_url ? resolveApiAssetUrl(editingActivity.photo_url) : "");

  return (
    <OperatorLayout title="Database Kegiatan">
      <div className="flex flex-col gap-5 pb-6">
        {error && (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[18px] border border-border bg-white p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Total Kegiatan</div>
            <div className="mt-2 text-2xl font-black text-foreground">{stats.total}</div>
          </div>
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Riset</div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{stats.riset}</div>
          </div>
          <div className="rounded-[18px] border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-wide text-sky-700">Abdimas</div>
            <div className="mt-2 text-2xl font-black text-sky-700">{stats.abdimas}</div>
          </div>
          <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-wide text-amber-700">Internal</div>
            <div className="mt-2 text-2xl font-black text-amber-700">{stats.internal}</div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="rounded-[22px] border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">Kegiatan Harian STAS-RG</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Simpan catatan kegiatan riset, abdimas, dan internal beserta dokumentasinya.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0AB600] px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-[#089c00]"
            >
              <Plus size={16} />
              Tambah Kegiatan
            </button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2.5">
              <Search size={16} className="text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, agenda, lokasi, PIC..."
                className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2.5">
              <Filter size={16} className="text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ActivityTypeFilter)}
                className="w-full bg-transparent text-sm font-medium outline-none"
              >
                <option value="Semua">Semua jenis</option>
                <option value="riset">Riset</option>
                <option value="abdimas">Abdimas</option>
                <option value="internal">Internal</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2.5">
              <CalendarDays size={16} className="text-muted-foreground" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2.5">
              <CalendarDays size={16} className="text-muted-foreground" />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-[22px] border border-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Jenis / Bentuk</th>
                  <th className="px-4 py-3">Nama Kegiatan</th>
                  <th className="px-4 py-3">Lokasi / Peserta</th>
                  <th className="px-4 py-3">Output</th>
                  <th className="px-4 py-3">Berkas</th>
                  <th className="px-4 py-3">PIC</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
                      Memuat data kegiatan...
                    </td>
                  </tr>
                ) : filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8">
                      <EmptyNotice message="Belum ada kegiatan yang cocok dengan filter saat ini." />
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((activity) => {
                    const hasDocs = Boolean(
                      activity.folder_bergkas_url || activity.notulensi_url ||
                      activity.surat_url || activity.photo_url
                    );
                    return (
                      <tr
                        key={activity.id}
                        className="cursor-pointer border-t border-border align-top hover:bg-slate-50/70"
                        onClick={() => setDetailActivity(activity)}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-foreground whitespace-nowrap">
                          <div>{formatDate(activity.activity_date)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{formatTime(activity.activity_time)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ${TYPE_BADGE[activity.activity_type]}`}>
                              {TYPE_LABELS_SHORT[activity.activity_type]}
                            </span>
                            <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                              {FORM_LABELS[activity.activity_form] || activity.activity_form}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[260px]">
                            <div className="font-black text-foreground line-clamp-2">{activity.activity_name}</div>
                            {activity.agenda && (
                              <div className="mt-1 text-xs font-medium text-muted-foreground line-clamp-2">
                                {activity.agenda}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-700">
                          <div className="max-w-[200px]">
                            <div className="line-clamp-1">{activity.location || "-"}</div>
                            {activity.participants_count != null && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {activity.participants_count} peserta
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-700">
                          <div className="max-w-[200px] line-clamp-2">{activity.output || "-"}</div>
                        </td>
                        <td className="px-4 py-4">
                          {hasDocs ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDetailActivity(activity); }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0AB600]/30 bg-green-50 px-2.5 py-1.5 text-xs font-black text-[#0AB600] hover:bg-green-100"
                            >
                              <Download size={12} />
                              {[
                                activity.notulensi_url && "Notulensi",
                                activity.surat_url && "Surat",
                                activity.photo_url && "Foto",
                                activity.folder_bergkas_url && "Folder"
                              ].filter(Boolean).join(", ")}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-700">
                          <div className="max-w-[140px] line-clamp-2">{activity.pic_name || "-"}</div>
                        </td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <button type="button" onClick={() => openEditModal(activity)}
                              className="inline-flex items-center justify-center rounded-xl border border-border bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0AB600]">
                              <Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => void handleDelete(activity)}
                              disabled={deletingId === activity.id}
                              className="inline-flex items-center justify-center rounded-xl border border-border bg-white p-2 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-[500] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="mx-auto my-6 w-full max-w-5xl rounded-[24px] border border-border bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    {editingId ? "Ubah Kegiatan" : "Tambah Kegiatan"}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    Lengkapi data kegiatan CoE STAS-RG sesuai format pelaporan.
                  </p>
                </div>
                <button type="button" onClick={closeModal}
                  className="rounded-xl border border-border bg-white p-2 text-slate-500 hover:bg-slate-50">
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.3fr_0.9fr]">
                {/* Left column — main fields */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-bold text-foreground">
                      <span>Tanggal Kegiatan <span className="text-red-500">*</span></span>
                      <input type="date" value={form.activityDate}
                        onChange={(e) => setForm((p) => ({ ...p, activityDate: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]" />
                    </label>
                    <label className="space-y-1.5 text-sm font-bold text-foreground">
                      <span>Waktu Kegiatan</span>
                      <input type="time" value={form.activityTime}
                        onChange={(e) => setForm((p) => ({ ...p, activityTime: e.target.value }))}
                        placeholder="09:00"
                        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]" />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-bold text-foreground">
                      <span>Jenis Kegiatan <span className="text-red-500">*</span></span>
                      <select value={form.activityType}
                        onChange={(e) => setForm((p) => ({ ...p, activityType: e.target.value as ActivityRecord["activity_type"] }))}
                        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]">
                        <option value="riset">Riset/Penelitian/Proyek</option>
                        <option value="abdimas">Pengabdian Masyarakat</option>
                        <option value="internal">Internal CoE STAS-RG</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 text-sm font-bold text-foreground">
                      <span>Bentuk Kegiatan <span className="text-red-500">*</span></span>
                      <select value={form.activityForm}
                        onChange={(e) => setForm((p) => ({ ...p, activityForm: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]">
                        <option value="meeting">Rapat</option>
                        <option value="visit_internal">Kunjungan Internal / Lab Visit</option>
                        <option value="visit_external">Kunjungan Eksternal</option>
                        <option value="lab_test">Pengujian Lab</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-1.5 text-sm font-bold text-foreground">
                    <span>Nama Riset/Penelitian/Abdimas/Internal CoE <span className="text-red-500">*</span></span>
                    <input value={form.activityName}
                      onChange={(e) => setForm((p) => ({ ...p, activityName: e.target.value }))}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                      placeholder="Nama kegiatan / agenda" />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-1.5 text-sm font-bold text-foreground">
                      <span>Lokasi Kegiatan</span>
                      <input value={form.location}
                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                        placeholder="Ruang rapat / lab / lapangan" />
                    </label>
                    <label className="block space-y-1.5 text-sm font-bold text-foreground">
                      <span>Jumlah Peserta</span>
                      <input type="number" min={0} value={form.participantsCount}
                        onChange={(e) => setForm((p) => ({ ...p, participantsCount: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                        placeholder="0" />
                    </label>
                  </div>

                  <label className="block space-y-1.5 text-sm font-bold text-foreground">
                    <span>Judul Kegiatan</span>
                    <textarea value={form.goal}
                      onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
                      rows={2}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                      placeholder="Judul Kegiatan" />
                  </label>

                  <label className="block space-y-1.5 text-sm font-bold text-foreground">
                    <span>Deskripsi Singkat / Ringkasan Kegiatan</span>
                    <textarea value={form.descriptionSummary}
                      onChange={(e) => setForm((p) => ({ ...p, descriptionSummary: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                      placeholder="Ringkasan singkat kegiatan" />
                  </label>

                  <label className="block space-y-1.5 text-sm font-bold text-foreground">
                    <span>Daftar Nama Peserta</span>
                    <textarea value={form.participantsList}
                      onChange={(e) => setForm((p) => ({ ...p, participantsList: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                      placeholder="Nama lengkap beserta gelar, pisahkan dengan koma atau baris baru" />
                  </label>

                  <label className="block space-y-1.5 text-sm font-bold text-foreground">
                    <span>Output / Hasil Kegiatan</span>
                    <textarea value={form.output}
                      onChange={(e) => setForm((p) => ({ ...p, output: e.target.value }))}
                      rows={2}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                      placeholder="Output yang dihasilkan" />
                  </label>

                  <label className="block space-y-1.5 text-sm font-bold text-foreground">
                    <span>Link Berkas / Dokumentasi (Folder Drive)</span>
                    <input value={form.folderBergkasUrl}
                      onChange={(e) => setForm((p) => ({ ...p, folderBergkasUrl: e.target.value }))}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                      placeholder="https://drive.google.com/..." />
                  </label>

                  <label className="block space-y-1.5 text-sm font-bold text-foreground">
                    <span>Nama PIC Input Kegiatan</span>
                    <input value={form.picName}
                      onChange={(e) => setForm((p) => ({ ...p, picName: e.target.value }))}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-[#0AB600]"
                      placeholder="Nama PIC yang menginput kegiatan ini" />
                  </label>
                </div>

                {/* Right column — uploads */}
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-4 space-y-5">
                    <div>
                      <h4 className="text-sm font-black text-foreground">Dokumentasi & Berkas</h4>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Upload foto, notulensi, dan berkas surat terkait kegiatan.
                      </p>
                    </div>

                    {/* Foto dokumentasi */}
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-foreground">Foto Dokumentasi</p>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 transition-colors hover:bg-slate-50">
                        <ImageIcon size={16} className="shrink-0 text-[#0AB600]" />
                        <span className="text-sm font-medium text-muted-foreground">
                          PNG / JPG — maks. 5 MB
                        </span>
                        <input type="file" accept="image/png,image/jpeg" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handlePickFile(file, 5, setPhotoAttachment);
                          }} />
                      </label>
                      {photoAttachment && (
                        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <span className="truncate text-xs font-semibold text-emerald-700">{photoAttachment.fileName}</span>
                          <button type="button" onClick={() => setPhotoAttachment(null)}
                            className="ml-2 shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100">
                            <X size={13} />
                          </button>
                        </div>
                      )}
                      {photoPreview ? (
                        <img src={photoPreview || undefined} alt="Preview"
                          className="h-40 w-full rounded-[16px] border border-border object-cover bg-white" />
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-white text-center text-sm font-semibold text-muted-foreground">
                          <div>
                            <FileImage size={22} className="mx-auto mb-1 text-slate-400" />
                            Pratinjau foto
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notulensi */}
                    <FileUploadZone
                      label="Berkas Notulensi"
                      hint="PDF / DOC / DOCX / Gambar — maks. 10 MB"
                      accept={ALLOWED_DOC_TYPES}
                      attachment={notulensiAttachment}
                      existingUrl={editingActivity?.notulensi_url || ""}
                      existingName={editingActivity?.notulensi_name || ""}
                      onPick={(file) => void handlePickFile(file, 10, setNotulensiAttachment)}
                      onClear={() => setNotulensiAttachment(null)}
                    />

                    {/* Surat */}
                    <FileUploadZone
                      label="Berkas Surat"
                      hint="PDF / DOC / DOCX / Gambar — maks. 10 MB"
                      accept={ALLOWED_DOC_TYPES}
                      attachment={suratAttachment}
                      existingUrl={editingActivity?.surat_url || ""}
                      existingName={editingActivity?.surat_name || ""}
                      onPick={(file) => void handlePickFile(file, 10, setSuratAttachment)}
                      onClear={() => setSuratAttachment(null)}
                    />

                    <div className="rounded-[14px] border border-slate-200 bg-white p-3 text-xs font-medium leading-5 text-slate-600">
                      <p className="font-black text-foreground">Catatan</p>
                      <p className="mt-1">File yang tidak diganti saat edit akan tetap menggunakan file lama.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={closeModal}
                      className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">
                      Batal
                    </button>
                    <button type="button" onClick={() => void saveActivity()} disabled={saving}
                      className="rounded-xl bg-[#0AB600] px-4 py-2.5 text-sm font-black text-white hover:bg-[#089c00] disabled:cursor-not-allowed disabled:opacity-60">
                      {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Kegiatan"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailActivity && (
          <DetailPanel
            activity={detailActivity}
            onClose={() => setDetailActivity(null)}
            onEdit={() => {
              setDetailActivity(null);
              openEditModal(detailActivity);
            }}
            onDelete={() => {
              const target = detailActivity;
              setDetailActivity(null);
              void handleDelete(target);
            }}
            deleting={deletingId === detailActivity.id}
          />
        )}

        {confirmDialog}
      </div>
    </OperatorLayout>
  );
}
