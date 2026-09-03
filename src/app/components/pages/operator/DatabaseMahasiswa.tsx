import { ProfileAvatar } from "../../molecules/ProfileAvatar";
import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { StudentModal } from "../../organisms/StudentModal";
import { useConfirmDialog } from "../../molecules/ConfirmDialog";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { Search, Plus, Download, X, Pencil, BookOpen, UserCheck, FlaskConical, Trash2, FileText, Lock, UploadCloud, CheckCircle2, GraduationCap, Star, User } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut, resolveApiAssetUrl } from "../../../lib/api";
import { getWfhSourceMeta, getWfhSummary } from "../../../lib/wfh";

type MahasiswaRecord = any;

const STATUS_STYLE: Record<string, string> = {
  Aktif: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Cuti: "bg-amber-100 text-amber-700 border border-amber-200",
  Alumni: "bg-slate-100 text-slate-600 border border-slate-200",
  "Mengundurkan Diri": "bg-red-100 text-red-600 border border-red-200",
};

type ModalMode = "add" | "edit" | null;

type ResearchMembershipForm = {
  projectId: string;
  bergabung: string;
  selesai: string;
};

type StudentDocumentForm = {
  type: string;
  label: string;
  requiresAlumni: boolean;
  locked: boolean;
  lockReason: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
};

const STUDENT_DOCUMENT_DEFINITIONS = [
  { type: "surat_pengantar", label: "Surat pengantar mahasiswa riset dan magang CoE STAS-RG", requiresAlumni: false },
  { type: "surat_penerimaan", label: "Surat Penerimaan mahasiswa riset dan magang CoE STAS-RG", requiresAlumni: false },
  { type: "surat_keterangan_selesai", label: "Surat Keterangan Selesai mahasiswa riset dan magang CoE STAS-RG", requiresAlumni: true },
  { type: "sertifikat", label: "Sertifikat", requiresAlumni: true },
];

const STUDENT_DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
const MAX_STUDENT_DOCUMENT_BYTES = 10 * 1024 * 1024;

const AVATAR_COLORS = [
  "bg-[#8B6FFF] text-white",
  "bg-emerald-500 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
  "bg-violet-500 text-white",
  "bg-blue-500 text-white",
  "bg-amber-500 text-white",
];

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === "-") return "-";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toISOString().split("T")[0];
  } catch {
    return "-";
  }
}

function getFacultyLabel(item: any): string {
  return item?.fakultas || item?.faculty || item?.facultyName || item?.fakultas_nama || item?.faculty_name || "-";
}

function getFallbackWfhQuota(...sources: any[]) {
  for (const source of sources) {
    const rawValue = source?.manualWfhQuota ?? source?.manual_wfh_quota;

    if (rawValue === null || rawValue === undefined || rawValue === "") continue;

    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) return parsed;
  }

  const summary = getWfhSummary(...sources);
  return summary.wfhQuotaSource === "mentor" ? 0 : summary.wfhQuota;
}

function getWfhSourceBadgeClasses(source: string) {
  if (source === "mentor") {
    return "bg-sky-100 text-sky-700 border border-sky-200";
  }

  if (source === "student") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function formatWfhDays(value: unknown) {
  const parsed = Number(value);
  return `${Number.isFinite(parsed) ? parsed : 0} hari`;
}

function resolveResearchIdsFromNames(
  researchNames: string[],
  options: Array<{ id: string; short: string; full: string }>
) {
  const lookup = new Map<string, string>();

  options.forEach((option) => {
    lookup.set(option.id, option.id);
    lookup.set(option.full, option.id);
    lookup.set(option.short, option.id);
  });

  const resolved: string[] = [];

  (researchNames || []).forEach((name) => {
    const projectId = lookup.get(name);
    if (projectId && !resolved.includes(projectId)) {
      resolved.push(projectId);
    }
  });

  return resolved;
}

function getResearchOptionLabel(option: { short: string; full: string }) {
  return option.short && option.short !== option.full ? `${option.short} - ${option.full}` : option.full;
}

function toDateInputValue(value: unknown) {
  if (!value || value === "-") return "";

  const normalized = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function normalizeStudentDocuments(source: any, fallbackStatus?: string | null): StudentDocumentForm[] {
  const rawDocuments = source?.student_documents ?? source?.studentDocuments ?? source?.documents;
  const documents = Array.isArray(rawDocuments) ? rawDocuments : [];
  const status = String(source?.status || source?.studentStatus || fallbackStatus || "").toLowerCase();
  const isAlumni = status === "alumni";
  const byType = new Map(documents.map((doc: any) => [String(doc?.type || doc?.documentType || doc?.document_type || ""), doc]));

  return STUDENT_DOCUMENT_DEFINITIONS.map((definition) => {
    const doc: any = byType.get(definition.type) || {};
    const locked = Boolean(definition.requiresAlumni && !isAlumni);

    return {
      type: definition.type,
      label: doc.label || definition.label,
      requiresAlumni: Boolean(doc.requiresAlumni ?? doc.requires_alumni ?? definition.requiresAlumni),
      locked: Boolean(doc.locked ?? locked),
      lockReason: doc.lockReason || doc.lock_reason || (locked ? "Terbuka setelah mahasiswa berstatus Alumni." : null),
      fileUrl: doc.fileUrl || doc.file_url || null,
      fileName: doc.fileName || doc.file_name || null,
      fileSize: Number.isFinite(Number(doc.fileSize ?? doc.file_size)) ? Number(doc.fileSize ?? doc.file_size) : null,
    };
  });
}

function formatFileSize(value?: number | null) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function validateStudentDocumentFile(file: File) {
  const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (!allowedExtensions.includes(extension)) {
    return "Format file harus PDF, DOC, DOCX, JPG, JPEG, atau PNG.";
  }

  if (file.size > MAX_STUDENT_DOCUMENT_BYTES) {
    return "Ukuran file maksimal 10 MB.";
  }

  return null;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file dokumen."));
    reader.readAsDataURL(file);
  });
}
function normalizeResearchMembershipForms(source: any, fallbackIds: string[] = [], fallbackBergabung?: string | null): ResearchMembershipForm[] {
  const rawMemberships = source?.research_memberships ?? source?.researchMemberships;
  const memberships = Array.isArray(rawMemberships) ? rawMemberships : [];
  const forms = memberships
    .map((membership: any) => {
      const projectId = String(membership?.project_id || membership?.projectId || membership?.id || "").trim();
      if (!projectId) return null;

      return {
        projectId,
        bergabung: toDateInputValue(membership?.bergabung || fallbackBergabung),
        selesai: toDateInputValue(membership?.selesai),
      };
    })
    .filter(Boolean) as ResearchMembershipForm[];

  const existingIds = new Set(forms.map((membership) => membership.projectId));

  fallbackIds.forEach((projectId) => {
    const normalizedId = String(projectId || "").trim();
    if (!normalizedId || existingIds.has(normalizedId)) return;

    forms.push({
      projectId: normalizedId,
      bergabung: toDateInputValue(fallbackBergabung),
      selesai: "",
    });
    existingIds.add(normalizedId);
  });

  return forms;
}

export default function DatabaseMahasiswa() {
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [mahasiswaList, setMahasiswaList] = useState<MahasiswaRecord[]>([]);
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [risetOptions, setRisetOptions] = useState<Array<{ id: string; short: string; full: string }>>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterRiset, setFilterRiset] = useState("Semua");
  const [filterAngkatan, setFilterAngkatan] = useState("Semua");
  const [filterFakultas, setFilterFakultas] = useState("Semua");
  const [filterTipe, setFilterTipe] = useState("Semua");
  const [selected, setSelected] = useState<MahasiswaRecord | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MahasiswaRecord | null>(null);
  const [infoModal, setInfoModal] = useState<{ label: string; value: string } | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingDocumentKey, setUploadingDocumentKey] = useState<string | null>(null);
  const [selectedRisetId, setSelectedRisetId] = useState('');

  const [form, setForm] = useState({
    id: "",
    nim: "",
    name: "",
    password: "",
    angkatan: "",
    email: "",
    phone: "",
    prodi: "",
    fakultas: "",
    pembimbing: "",
    bergabung: "",
    wfhQuota: "",
    status: "Aktif" as MahasiswaRecord["status"],
    tipe: "Riset" as MahasiswaRecord["tipe"],
    risetMemberships: [] as ResearchMembershipForm[],
  });

  const PER_PAGE = 6;

  const loadStudents = async () => {
    setError("");

    try {
      const cacheKey = Date.now();

      const rows = await apiGet<Array<any>>(`/students?_=${cacheKey}`);
      const logRows = await apiGet<Array<any>>(`/logbooks?_=${cacheKey}`);
      const researches = await apiGet<Array<any>>(`/research?_=${cacheKey}`);

      const risetNames = researches.reduce<Array<{ id: string; short: string; full: string }>>((acc, r: any) => {
        const id = String(r?.id || r?.project_id || r?.title || r?.short_title || "").trim();
        const shortName = String(r?.short_title || r?.title || "Riset").trim();
        const fullName = String(r?.title || r?.short_title || "Riset").trim();

        if (!id || !shortName || !fullName || acc.some((option) => option.id === id)) {
          return acc;
        }

        acc.push({
          id,
          short: shortName,
          full: fullName,
        });

        return acc;
      }, []);

      setRisetOptions(risetNames);

      const mapped: MahasiswaRecord[] = rows.map((item, index) => {
        const wfh = getWfhSummary(item);
        const photoUrl = item?.photoUrl || item?.photo_url || null;

        return {
          id: item.id,
          userId: item.userId || item.user_id || null,
          user_id: item.user_id || item.userId || null,
          nim: item.nim,
          name: item.name,
          initials: item.initials || toInitials(item.name || "Mahasiswa"),
          photoUrl,
          photo_url: photoUrl,
          color: AVATAR_COLORS[index % AVATAR_COLORS.length],
          prodi: item.prodi || "-",
          fakultas: getFacultyLabel(item),
          angkatan: String(item.angkatan || "-"),
          email: item.email || "-",
          phone: item.phone || "-",
          status: item.status,
          tipe: item.tipe,
          riset: Array.isArray(item.research_projects) ? item.research_projects : [],
          risetIds: Array.isArray(item.research_project_ids) ? item.research_project_ids : [],
          risetMemberships: normalizeResearchMembershipForms(
            item,
            Array.isArray(item.research_project_ids) ? item.research_project_ids : [],
            item.bergabung
          ),
          studentDocuments: normalizeStudentDocuments(item, item.status),
          bergabung: formatDateOnly(item.bergabung),
          pembimbing: item.pembimbing || "-",
          wfhFallbackQuota: getFallbackWfhQuota(item),
          ...wfh,
          kehadiran: Number(item.kehadiran) || 0,
          totalHari: Number(item.total_hari) || 0,
          logbookCount: Number(item.logbook_count) || 0,
          jamMingguIni: Number(item.jam_minggu_ini) || 0,
          jamMingguTarget: Number(item.jam_minggu_target) || 0,
        };
      });

      setMahasiswaList(mapped);
      setLogEntries(logRows || []);
    } catch (err: any) {
      console.error("[ERROR] Failed to load students:", err);
      setError(err?.message || "Gagal memuat data mahasiswa.");
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (mahasiswaList.length > 0 && location.state?.openStudentId) {
      const studentId = location.state.openStudentId;
      const targetStudent = mahasiswaList.find(s => s.id === studentId);
      if (targetStudent) {
        openEdit(targetStudent);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [mahasiswaList, location.state]);

  useEffect(() => {
    const loadStudentDetail = async () => {
      if (!selected?.id) {
        setSelectedDetail(null);
        return;
      }

      try {
        const detail = await apiGet<any>(`/students/${selected.id}?_=${Date.now()}`);
        const detailFakultas = getFacultyLabel(detail);
        const wfh = getWfhSummary(detail, selected);
        const photoUrl = detail?.photoUrl || detail?.photo_url || selected.photoUrl || selected.photo_url || null;

        setSelectedDetail({
          ...selected,
          userId: detail?.userId || detail?.user_id || selected.userId || selected.user_id || null,
          user_id: detail?.user_id || detail?.userId || selected.user_id || selected.userId || null,
          nim: detail?.nim || selected.nim,
          name: detail?.name || selected.name,
          initials: detail?.initials || selected.initials,
          photoUrl,
          photo_url: photoUrl,
          prodi: detail?.prodi || selected.prodi,
          fakultas: detailFakultas !== "-" ? detailFakultas : selected.fakultas || "-",
          angkatan: String(detail?.angkatan || selected.angkatan || "-"),
          email: detail?.email || selected.email,
          phone: detail?.phone || selected.phone,
          status: detail?.status || selected.status,
          tipe: detail?.tipe || selected.tipe,
          riset: Array.isArray(detail?.research_projects) ? detail.research_projects : selected.riset,
          risetIds: Array.isArray(detail?.research_project_ids) ? detail.research_project_ids : selected.risetIds || [],
          risetMemberships: normalizeResearchMembershipForms(
            detail,
            Array.isArray(detail?.research_project_ids) ? detail.research_project_ids : selected.risetIds || [],
            detail?.bergabung || selected.bergabung
          ),
          studentDocuments: normalizeStudentDocuments(detail, detail?.status || selected.status),
          bergabung: formatDateOnly(detail?.bergabung || selected.bergabung),
          pembimbing: detail?.pembimbing || selected.pembimbing,
          wfhFallbackQuota: getFallbackWfhQuota(detail, selected),
          ...wfh,
          kehadiran: Number(detail?.kehadiran) || selected.kehadiran || 0,
          totalHari: Number(detail?.total_hari) || selected.totalHari || 0,
          logbookCount: Number(detail?.logbook_count) || selected.logbookCount || 0,
          jamMingguIni: Number(detail?.jam_minggu_ini) || selected.jamMingguIni || 0,
          jamMingguTarget: Number(detail?.jam_minggu_target) || selected.jamMingguTarget || 0,
        });
      } catch (err: any) {
        setSelectedDetail(selected);
        setError(err?.message || "Gagal memuat detail mahasiswa.");
      }
    };

    void loadStudentDetail();
  }, [selected?.id]);

  const filtered = useMemo(
    () =>
      mahasiswaList.filter((m) => {
        const q = search.toLowerCase();
        const matchQ = !q || m.name.toLowerCase().includes(q) || m.nim.includes(q) || m.email.toLowerCase().includes(q);
        const matchS = filterStatus === "Semua" || m.status === filterStatus;
        const matchF = filterFakultas === "Semua" || m.fakultas === filterFakultas;
        const matchT = filterTipe === "Semua" || m.tipe === filterTipe;
        const matchR =
          filterRiset === "Semua" ||
          m.riset.some((r: string) => {
            const matchedRiset = risetOptions.find((opt) => opt.short === filterRiset || opt.full === filterRiset);

            if (!matchedRiset) return false;

            return r === matchedRiset.full || r === matchedRiset.short;
          });
        const matchA = filterAngkatan === "Semua" || m.angkatan === filterAngkatan;

        return matchQ && matchS && matchR && matchA && matchF && matchT;
      }),
    [mahasiswaList, search, filterStatus, filterRiset, filterAngkatan, filterFakultas, filterTipe, risetOptions]
  );

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const activeStudent = selectedDetail || selected;

  const selectedRisetOptions = useMemo(
    () =>
      form.risetMemberships
        .map((membership) => ({
          membership,
          option: risetOptions.find((option) => option.id === membership.projectId),
        }))
        .filter((item) => item.option) as Array<{ membership: ResearchMembershipForm; option: { id: string; short: string; full: string } }>,
    [form.risetMemberships, risetOptions]
  );

  const availableRisetOptions = useMemo(
    () => risetOptions.filter((option) => !form.risetMemberships.some((membership) => membership.projectId === option.id)),
    [form.risetMemberships, risetOptions]
  );

  const angkatanOptions = useMemo(
    () => Array.from(new Set(mahasiswaList.map((item) => item.angkatan).filter((item) => item && item !== "-"))).sort(),
    [mahasiswaList]
  );

  const fakultasOptions = useMemo(
    () => Array.from(new Set(mahasiswaList.map((item) => item.fakultas).filter((item) => item && item !== "-"))).sort(),
    [mahasiswaList]
  );

  const tipeOptions = useMemo(
    () => Array.from(new Set(mahasiswaList.map((item) => item.tipe).filter(Boolean))).sort(),
    [mahasiswaList]
  );

  const studentLogs = activeStudent
    ? logEntries
        .filter((l: any) => l.student_id === activeStudent.id)
        .slice(0, 3)
        .map((l: any) => ({
          id: l.id || `${l.date}-${l.title}`,
          title: l.title,
          date: l.date,
          riset: l.project_name || l.projectName || "Logbook Umum",
          output: l.output || "-",
        }))
    : [];

  const openEdit = async (m: MahasiswaRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();

    let target = m;

    try {
      const detail = await apiGet<any>(`/students/${m.id}?_=${Date.now()}`);
      const detailFakultas = getFacultyLabel(detail);
      const wfh = getWfhSummary(detail, m);
      const photoUrl = detail?.photoUrl || detail?.photo_url || m.photoUrl || m.photo_url || null;

      target = {
        ...m,
        userId: detail?.userId || detail?.user_id || m.userId || m.user_id || null,
        user_id: detail?.user_id || detail?.userId || m.user_id || m.userId || null,
        nim: detail?.nim || m.nim,
        name: detail?.name || m.name,
        initials: detail?.initials || m.initials,
        photoUrl,
        photo_url: photoUrl,
        angkatan: String(detail?.angkatan || m.angkatan || ""),
        email: detail?.email || m.email,
        phone: detail?.phone || m.phone,
        prodi: detail?.prodi || m.prodi,
        fakultas: detailFakultas !== "-" ? detailFakultas : m.fakultas || "",
        pembimbing: detail?.pembimbing || m.pembimbing,
        bergabung: formatDateOnly(detail?.bergabung || m.bergabung),
        wfhFallbackQuota: getFallbackWfhQuota(detail, m),
        ...wfh,
        status: detail?.status || m.status,
        tipe: detail?.tipe || m.tipe,
        riset: Array.isArray(detail?.research_projects) ? detail.research_projects : m.riset || [],
        risetIds: Array.isArray(detail?.research_project_ids) ? detail.research_project_ids : m.risetIds || [],
        risetMemberships: normalizeResearchMembershipForms(
          detail,
          Array.isArray(detail?.research_project_ids) ? detail.research_project_ids : m.risetIds || [],
          detail?.bergabung || m.bergabung
        ),
        studentDocuments: normalizeStudentDocuments(detail, detail?.status || m.status),
      };
    } catch {
      target = m;
    }

    setForm({
      id: target.id,
      nim: target.nim,
      name: target.name,
      password: "",
      angkatan: target.angkatan === "-" ? "" : target.angkatan,
      email: target.email === "-" ? "" : target.email,
      phone: target.phone === "-" ? "" : target.phone,
      prodi: target.prodi === "-" ? "" : target.prodi,
      fakultas: target.fakultas === "-" ? "" : target.fakultas || "",
      pembimbing: target.pembimbing === "-" ? "" : target.pembimbing,
      bergabung: target.bergabung === "-" ? "" : target.bergabung,
      wfhQuota: String(target.wfhFallbackQuota ?? 0),
      status: target.status,
      tipe: target.tipe,
      risetMemberships: Array.isArray(target.risetMemberships) && target.risetMemberships.length > 0
        ? target.risetMemberships
        : normalizeResearchMembershipForms(
            target,
            Array.isArray(target.risetIds) && target.risetIds.length > 0
              ? target.risetIds
              : resolveResearchIdsFromNames(target.riset || [], risetOptions),
            target.bergabung
          ),
    });

    setSelectedRisetId("");
    setModal("edit");
  };

  const handleStudentDocumentUpload = async (student: MahasiswaRecord, documentType: string, file?: File | null) => {
    if (!student?.id || !file) return;

    const validationMessage = validateStudentDocumentFile(file);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const uploadKey = `${student.id}-${documentType}`;
    setUploadingDocumentKey(uploadKey);
    setError("");

    try {
      const fileDataUrl = await fileToDataUrl(file);
      const result = await apiPut<any>(`/students/${encodeURIComponent(student.id)}/documents/${encodeURIComponent(documentType)}`, {
        fileDataUrl,
        fileName: file.name,
      });
      const nextDocuments = normalizeStudentDocuments({
        status: student.status,
        student_documents: result?.documents || [],
      }, student.status);

      const applyDocuments = (item: MahasiswaRecord | null) => item && item.id === student.id
        ? { ...item, studentDocuments: nextDocuments, student_documents: nextDocuments }
        : item;

      setMahasiswaList((prev) => prev.map((item) => applyDocuments(item) || item));
      setSelected((prev) => applyDocuments(prev));
      setSelectedDetail((prev) => applyDocuments(prev));
    } catch (err: any) {
      setError(err?.message || "Gagal mengunggah dokumen mahasiswa.");
    } finally {
      setUploadingDocumentKey(null);
    }
  };
  const handleSave = async () => {
    if (!form.nim.trim() || !form.name.trim()) {
      setError("NIM dan Nama Lengkap wajib diisi.");
      return;
    }

    if (modal === "add" && !form.password.trim()) {
      setError("Password wajib diisi saat membuat akun mahasiswa baru.");
      return;
    }

    const invalidMembership = form.risetMemberships.find(
      (membership) => membership.bergabung && membership.selesai && membership.selesai < membership.bergabung
    );

    if (invalidMembership) {
      setError("Tanggal selesai riset tidak boleh sebelum tanggal bergabung.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        nim: form.nim.trim(),
        name: form.name.trim(),
        initials: toInitials(form.name),
        prodi: form.prodi.trim(),
        fakultas: form.fakultas.trim() || null,
        password: form.password.trim() || null,
        angkatan: form.angkatan.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status,
        tipe: form.tipe,
        pembimbing: form.pembimbing.trim(),
        bergabung: form.bergabung || null,
        wfhQuota: form.wfhQuota === "" ? 0 : Number(form.wfhQuota) || 0,
        riset: form.risetMemberships.map((membership) => ({
          projectId: membership.projectId,
          bergabung: membership.bergabung || form.bergabung || null,
          selesai: membership.selesai || null,
        })),
      };

      let result;

      if (modal === "add") {
        result = await apiPost<{ message: string }>("/students", payload);
      } else {
        result = await apiPut<{ message: string }>(`/students/${form.id}`, payload);
      }

      await confirm({
        title: "Data berhasil disimpan",
        description: result?.message || "Data tersimpan.",
        confirmLabel: "Mengerti",
        variant: "primary",
        hideCancel: true,
      });

      await loadStudents();
      setModal(null);
      setSelected(null);
    } catch (err: any) {
      console.error("[ERROR] Failed to save student:", err);
      setError(err?.message || "Gagal menyimpan data mahasiswa.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: MahasiswaRecord, event?: React.MouseEvent) => {
    event?.stopPropagation();

    const confirmed = await confirm({
      title: "Hapus data mahasiswa?",
      description: `Data mahasiswa "${student.name}" akan dihapus dari database.`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (!confirmed) return;

    setDeletingId(student.id);
    setError("");

    try {
      await apiDelete(`/students/${student.id}`);
      await loadStudents();

      if (selected?.id === student.id) setSelected(null);
      if (modal === "edit" && form.id === student.id) setModal(null);
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus data mahasiswa.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <OperatorLayout title="Database Mahasiswa">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[12px] w-60 focus-within:ring-2 focus-within:ring-amber-300 focus-within:border-amber-400 transition-all">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama, NIM, email..."
                className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={13} className="text-muted-foreground" />
                </button>
              )}
            </div>

            {[
              {
                label: "Status",
                value: filterStatus,
                setter: setFilterStatus,
                options: ["Semua", "Aktif", "Cuti", "Alumni", "Mengundurkan Diri"],
              },
              {
                label: "Riset",
                value: filterRiset,
                setter: setFilterRiset,
                options: ["Semua", ...risetOptions.map((r) => r.short)],
              },
              {
                label: "Angkatan",
                value: filterAngkatan,
                setter: setFilterAngkatan,
                options: ["Semua", ...angkatanOptions],
              },
              {
                label: "Fakultas",
                value: filterFakultas,
                setter: setFilterFakultas,
                options: ["Semua", ...fakultasOptions],
              },
              {
                label: "Tipe",
                value: filterTipe,
                setter: setFilterTipe,
                options: ["Semua", ...tipeOptions],
              },
            ].map((filter) => (
              <select
                key={filter.label}
                value={filter.value}
                onChange={(event) => {
                  filter.setter(event.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 bg-white border border-border rounded-[10px] text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
              >
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option === "Semua" ? `Semua ${filter.label}` : option}
                  </option>
                ))}
              </select>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 h-9 px-4 bg-white border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">
              <Download size={15} /> Ekspor
            </button>

            <button
              onClick={() => {
                setForm({
                  id: "",
                  nim: "",
                  name: "",
                  password: "",
                  angkatan: "",
                  email: "",
                  phone: "",
                  prodi: "",
                  fakultas: "",
                  pembimbing: "",
                  bergabung: "",
                  wfhQuota: "0",
                  status: "Aktif",
                  tipe: "Riset",
                  risetMemberships: [],
                });
                setSelectedRisetId("");
                setModal("add");
              }}
              className="flex items-center gap-2 h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-[10px] transition-colors shadow-sm shadow-amber-200"
            >
              <Plus size={15} strokeWidth={3} /> Tambah Mahasiswa
            </button>
          </div>
        </div>

        <div className="flex gap-5 items-start">
          <div className={`flex-1 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden transition-all min-w-0`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1480px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-border">
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Mahasiswa</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">NIM</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Angkatan</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Tipe</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Program Studi</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Fakultas</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Pembimbing</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Jatah WFH</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">WFH Terpakai</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Sisa WFH</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Riset</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide">Bergabung</th>
                    <th className="px-5 py-3 font-black text-muted-foreground text-xs uppercase tracking-wide text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {paged.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(selected?.id === m.id ? null : m)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected?.id === m.id ? "bg-amber-50/50" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar
                            name={m.name}
                            photoUrl={m.photoUrl || m.photo_url}
                            className="size-7"
                            fallbackClassName={`${m.color} text-[10px] font-black`}
                          />

                          <div className="min-w-0">
                            <p className="font-black text-foreground text-sm">{m.name}</p>
                            <p className="max-w-[240px] truncate text-[11px] text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-sm text-foreground">{m.nim}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-foreground">{m.angkatan}</td>

                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${m.tipe === "Magang" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                          {m.tipe || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{m.prodi}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{m.fakultas || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{m.pembimbing || "-"}</td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-foreground">{formatWfhDays(m.wfhQuota)}</span>
                          <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black ${getWfhSourceBadgeClasses(m.wfhQuotaSource)}`}>
                            {getWfhSourceMeta(m.wfhQuotaSource).label}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-sm font-bold text-foreground">{formatWfhDays(m.wfhUsed)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-foreground">{formatWfhDays(m.wfhRemaining)}</td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {m.riset.map((r: string) => (
                            <span
                              key={r}
                              className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                r === "Riset A"
                                  ? "bg-[#F8F5FF] text-[#6C47FF]"
                                  : r === "Riset B"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {r}
                            </span>
                          ))}

                          {m.riset.length === 0 && <span className="text-[11px] text-muted-foreground">–</span>}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[m.status]}`}>
                          {m.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{m.bergabung}</td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(event) => openEdit(m, event)}
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={(event) => handleDelete(m, event)}
                            disabled={deletingId === m.id}
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-slate-50/50">
              <p className="text-xs font-medium text-muted-foreground">
                Menampilkan {paged.length} dari {filtered.length} mahasiswa
              </p>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setPage(index + 1)}
                    className={`w-7 h-7 rounded-[8px] text-xs font-black transition-colors ${
                      page === index + 1 ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-slate-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeStudent && (
            <div
              className="fixed inset-0 z-[180] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setSelected(null)}
            >
              <div
                className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto bg-white border border-border rounded-[18px] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
                  <h3 className="text-sm font-black text-foreground">Profil Mahasiswa</h3>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-5">
                  <div className="flex flex-col items-center gap-3 mb-5 pb-5 border-b border-border">
                    <ProfileAvatar
                      name={activeStudent.name}
                      photoUrl={activeStudent.photoUrl || activeStudent.photo_url}
                      className="size-20"
                      fallbackClassName={`${activeStudent.color} text-white text-lg font-black`}
                    />

                    <div className="text-center">
                      <p className="font-black text-foreground">{activeStudent.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{activeStudent.nim}</p>
                      <span className={`inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[activeStudent.status]}`}>
                        {activeStudent.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs mb-5 pb-5 border-b border-border">
                    {[
                      { label: "Program Studi", value: activeStudent.prodi },
                      { label: "Fakultas", value: activeStudent.fakultas || "-" },
                      { label: "Angkatan", value: activeStudent.angkatan },
                      { label: "Tipe Mahasiswa", value: activeStudent.tipe || "-" },
                      { label: "Email", value: activeStudent.email },
                      { label: "Telepon", value: activeStudent.phone },
                      { label: "Pembimbing", value: activeStudent.pembimbing },
                      { label: "Bergabung", value: activeStudent.bergabung },
                      { label: "Jatah WFH", value: formatWfhDays(activeStudent.wfhQuota) },
                      { label: "WFH Terpakai", value: formatWfhDays(activeStudent.wfhUsed) },
                      { label: "Sisa WFH", value: formatWfhDays(activeStudent.wfhRemaining) },
                      { label: "Sumber Jatah WFH", value: getWfhSourceMeta(activeStudent.wfhQuotaSource).label },
                      { label: "Kuota Mentor", value: formatWfhDays(activeStudent.mentorWfhQuota) },
                      { label: "Fallback Mahasiswa", value: formatWfhDays(activeStudent.manualWfhQuota) },
                    ].map((field) => (
                      <div key={field.label} className="flex justify-between gap-2">
                        <span className="font-black text-muted-foreground">{field.label}</span>
                        <span className={`font-bold text-foreground text-right ${field.label === "Email" ? "max-w-[360px] break-all" : ""}`}>
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {getWfhSourceMeta(activeStudent.wfhQuotaSource).helperText && (
                    <div className="mb-5 rounded-[12px] border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-700">
                      {getWfhSourceMeta(activeStudent.wfhQuotaSource).helperText}
                    </div>
                  )}

                  <div className="mb-5 pb-5 border-b border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <UserCheck size={11} /> Kehadiran Bulan Ini
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{
                            width: `${
                              activeStudent.totalHari
                                ? Math.round((activeStudent.kehadiran / activeStudent.totalHari) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-black text-emerald-600">
                        {activeStudent.kehadiran}/{activeStudent.totalHari}
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 pb-5 border-b border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <FlaskConical size={11} /> Keanggotaan Riset
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeStudent.riset.length > 0 ? (
                        activeStudent.riset.map((r: string) => (
                          <span
                            key={r}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              r === "Riset A"
                                ? "bg-[#F8F5FF] text-[#6C47FF]"
                                : r === "Riset B"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum bergabung riset</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-5 pb-5 border-b border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <FileText size={11} /> Berkas Mahasiswa
                    </p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {normalizeStudentDocuments(activeStudent, activeStudent.status).map((doc) => {
                        const uploadKey = `${activeStudent.id}-${doc.type}`;
                        const isUploading = uploadingDocumentKey === uploadKey;
                        const resolvedUrl = resolveApiAssetUrl(doc.fileUrl);

                        return (
                          <div key={doc.type} className={`rounded-[12px] border px-3 py-3 ${doc.locked ? "border-slate-200 bg-slate-50" : "border-amber-100 bg-amber-50/40"}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-foreground">{doc.label}</p>
                                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                                  {doc.fileName
                                    ? `${doc.fileName}${doc.fileSize ? ` • ${formatFileSize(doc.fileSize)}` : ""}`
                                    : doc.locked
                                      ? doc.lockReason || "Terbuka setelah status Alumni."
                                      : "Belum ada file. Admin bisa upload dokumen ini."}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {resolvedUrl && (
                                  <a
                                    href={resolvedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-emerald-500 px-3 text-[11px] font-black text-white hover:bg-emerald-600"
                                  >
                                    <Download size={12} /> Unduh
                                  </a>
                                )}
                                <label
                                  className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[11px] font-black transition-colors ${
                                    doc.locked || isUploading
                                      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                                      : "cursor-pointer border border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
                                  }`}
                                >
                                  {doc.locked ? <Lock size={12} /> : isUploading ? <CheckCircle2 size={12} /> : <UploadCloud size={12} />}
                                  {doc.locked ? "Terkunci" : isUploading ? "Upload..." : doc.fileName ? "Ganti" : "Upload"}
                                  <input
                                    type="file"
                                    accept={STUDENT_DOCUMENT_ACCEPT}
                                    disabled={doc.locked || isUploading}
                                    className="hidden"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0] || null;
                                      event.currentTarget.value = "";
                                      void handleStudentDocumentUpload(activeStudent, doc.type, file);
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <BookOpen size={11} /> Logbook Terbaru
                    </p>

                    {studentLogs.length > 0 ? (
                      studentLogs.map((log: any) => (
                        <div key={log.id} className="mb-2">
                          <p className="text-[10px] font-black text-muted-foreground">{log.date}</p>
                          <p className="text-[11px] font-bold text-foreground line-clamp-2">{log.title}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Belum ada entri logbook.</p>
                    )}

                    <p className="text-[10px] font-black text-amber-600 mt-1">
                      Total: {activeStudent.logbookCount} entri
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={async (event) => {
                        await openEdit(activeStudent, event);
                        setSelected(null);
                      }}
                      className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-[10px] transition-colors"
                    >
                      Edit Data Mahasiswa
                    </button>

                    <button
                      onClick={() => handleDelete(activeStudent)}
                      disabled={deletingId === activeStudent.id}
                      className="flex-1 h-9 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs font-black rounded-[10px] transition-colors"
                    >
                      {deletingId === activeStudent.id ? "Menghapus..." : "Hapus Data"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      
      <StudentModal
        isOpen={modal !== null}
        mode={modal || "add"}
        studentId={selectedDetail?.id}
        onClose={() => setModal(null)}
        onSaveSuccess={() => {
          setModal(null);
          loadStudents();
        }}
        risetOptions={risetOptions}
      />

      {infoModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setInfoModal(null)}>
          <div className="w-full max-w-[420px] rounded-[18px] border border-border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-black text-foreground">{infoModal.label}</h3>
              <button onClick={() => setInfoModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100">
                <X size={15} />
              </button>
            </div>

            <div className="p-5">
              <p className="break-all rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-foreground">
                {infoModal.value}
              </p>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </OperatorLayout>
  );
}
