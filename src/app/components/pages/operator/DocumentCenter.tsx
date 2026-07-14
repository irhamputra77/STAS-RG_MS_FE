import React, { useEffect, useState } from "react";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { Badge } from "../../atoms/badge";
import { Button } from "../../atoms/button";
import { useConfirmDialog } from "../../molecules/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../atoms/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../atoms/table";
import {
  ApiError,
  apiGet,
  apiGetBlob,
  apiPost,
  buildQueryPath,
  downloadBlob,
  encodePathSegment,
} from "../../../lib/api";
import { formatDateReadable } from "../../../lib/date";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Link,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type Participant = {
  name?: string;
  nim?: string;
  projectName?: string | null;
  period?: string | null;
  participantRole?: string | null;
};

type DocumentItem = {
  id: string;
  title: string;
  documentNumber: string | null;
  status: string;
  statusLabel?: string;
  documentPurpose: string;
  typeCode: string;
  typeName: string;
  activityOutcome?: string | null;
  createdAt?: string | null;
  issuedAt?: string | null;
  currentVersionNumber?: number | null;
  canDownload: boolean;
  participants?: Participant[];
};

type PublishResponse = {
  id: string;
  status: string;
  documentNumber: string;
  issuedAt: string;
  currentVersionNumber: number;
  canDownload: boolean;
};

type ListResponse = {
  items: DocumentItem[];
  pagination: { limit: number; offset: number; total: number };
};

type Definition = {
  id: string;
  name: string;
  typeName: string;
  typeCode?: string | null;
  requestMode: string;
  canBeCollective: boolean;
  requiresProject: boolean;
  requiresPeriod: boolean;
};

type Student = {
  id: string;
  name: string;
  nim: string;
  prodi: string | null;
  activityType: string | null;
};

type Period = {
  id: string;
  activityType: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

type Project = {
  id: string;
  title: string;
  shortTitle: string | null;
  projectStatus: string | null;
};

type UploadParticipant = {
  search: string;
  results: Student[];
  student: Student | null;
  periods: Period[];
  selectedPeriod: string;
  manualType: string;
  manualStart: string;
  manualEnd: string;
  projects: Project[];
  projectId: string;
  loading: boolean;
};

type RequestPeriod = {
  source?: string | null;
  activityType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

type RequestProject = {
  title?: string | null;
  shortTitle?: string | null;
  projectStatus?: string | null;
  role?: string | null;
  membershipStatus?: string | null;
  joinedAt?: string | null;
  completedAt?: string | null;
};

type RequestOfficialDocument = {
  id: string;
  title?: string | null;
  documentNumber?: string | null;
  status?: string | null;
  currentVersionNumber?: number | null;
  canDownload: boolean;
  issuedAt?: string | null;
};

type OperatorRequest = {
  id: string;
  definition: {
    id: string;
    name: string;
    typeCode?: string | null;
    documentPurpose?: string | null;
  };
  student: {
    name?: string | null;
    nim?: string | null;
    prodi?: string | null;
    activityType?: string | null;
  };
  subject: string;
  status: string;
  statusLabel?: string;
  activityType?: string | null;
  period?: RequestPeriod | null;
  project?: RequestProject | null;
  studentNote?: string | null;
  operatorNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedByName?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  canRequestRevision: boolean;
  canApprove: boolean;
  canReject: boolean;
  officialDocument?: RequestOfficialDocument | null;
};

type RequestListResponse = {
  items: OperatorRequest[];
  pagination: { limit: number; offset: number; total: number };
};

type DocumentCandidate = {
  id: string;
  title: string;
  definition: {
    id: string;
    name: string;
    typeCode?: string | null;
  };
  status: string;
  currentVersionNumber?: number | null;
  createdAt?: string | null;
  canDownload: boolean;
};

type ReviewAction = "revision" | "approve" | "reject";

const emptyParticipant = (): UploadParticipant => ({
  search: "",
  results: [],
  student: null,
  periods: [],
  selectedPeriod: "",
  manualType: "Magang",
  manualStart: "",
  manualEnd: "",
  projects: [],
  projectId: "",
  loading: false,
});

const purposeLabels: Record<string, string> = {
  introductory_letter: "Surat Pengantar",
  acceptance_letter: "Surat Penerimaan",
  completion_letter: "Surat Keterangan",
  certificate: "Sertifikat",
  general: "Umum",
};

const requestStatuses = [
  { value: "", label: "Semua status" },
  { value: "submitted", label: "Diajukan" },
  { value: "revision_required", label: "Perlu Diperbaiki" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "completed", label: "Selesai" },
];

const statusVariant = (status: string) =>
  status === "dicabut" || status === "gagal_dibuat" || status === "rejected"
    ? "destructive"
    : status === "terbit" || status === "diarsipkan" || status === "approved" || status === "completed"
      ? "default"
      : "secondary";

const periodText = (period?: RequestPeriod | null, fallbackActivityType?: string | null) => {
  if (!period && !fallbackActivityType) return "-";
  const activity = period?.activityType || fallbackActivityType || "";
  const range = [formatDateReadable(period?.startDate), formatDateReadable(period?.endDate)]
    .filter((value) => value && value !== "-")
    .join(" - ");
  const description = period?.description || "";
  return [activity, range, description].filter(Boolean).join(" | ") || "-";
};

const projectText = (project?: RequestProject | null) => {
  if (!project) return "-";
  return [project.title || project.shortTitle, project.role, project.membershipStatus].filter(Boolean).join(" | ") || "-";
};

const errorMessage = (err: any) => {
  if (err instanceof ApiError) {
    if (err.status === 400) return err.message || "Input tidak valid.";
    if (err.status === 403) return "Anda tidak memiliki akses untuk aksi ini.";
    if (err.status === 404) return "Data tidak ditemukan atau sudah tidak tersedia.";
    if (err.status === 409) return "Data atau status telah berubah. Muat ulang dan periksa kembali.";
    if (err.status === 410) return "File dokumen tidak tersedia. Periksa kembali draft sebelum menerbitkan.";
    if (err.status >= 500) return "Permintaan belum dapat diproses. Coba lagi nanti.";
  }
  return err?.message || "Permintaan belum dapat diproses.";
};

const actionTitle = (action: ReviewAction) =>
  action === "revision" ? "Minta Perbaikan" : action === "approve" ? "Setujui Permintaan" : "Tolak Permintaan";

export default function DocumentCenter() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<"requests" | "archive">("requests");

  const [data, setData] = useState<ListResponse>({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<DocumentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [requests, setRequests] = useState<RequestListResponse>({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<OperatorRequest | null>(null);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [candidates, setCandidates] = useState<DocumentCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [linkingDocumentId, setLinkingDocumentId] = useState<string | null>(null);

  const [reviewAction, setReviewAction] = useState<{ action: ReviewAction; request: OperatorRequest } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(false);
  const [definitionId, setDefinitionId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [participants, setParticipants] = useState<UploadParticipant[]>([emptyParticipant()]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const current = data.pagination;
  const currentRequests = requests.pagination;
  const definition = definitions.find((item) => item.id === definitionId) || null;
  const shouldShowCandidates = selectedRequest?.status === "approved" && !selectedRequest.officialDocument;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const load = async (offset = data.pagination.offset) => {
    setLoading(true);
    setError("");
    try {
      const result = await apiGet<ListResponse>(
        buildQueryPath("/document-center/operator/documents", {
          limit: 20,
          offset,
          status: status || null,
          title: keyword || null,
          documentNumber: keyword || null,
        }),
      );
      setData(result);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async (offset = requests.pagination.offset) => {
    setRequestsLoading(true);
    setError("");
    try {
      const result = await apiGet<RequestListResponse>(
        buildQueryPath("/document-center/operator/requests", {
          limit: 20,
          offset,
          status: requestStatus || null,
          search: requestSearch || null,
        }),
      );
      setRequests(result);
      setRequestsLoaded(true);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadCandidates = async (requestId: string) => {
    setCandidatesLoading(true);
    try {
      const result = await apiGet<{ items: DocumentCandidate[] }>(
        `/document-center/operator/requests/${encodePathSegment(requestId)}/document-candidates`,
      );
      setCandidates(result.items || []);
    } catch (err: any) {
      setCandidates([]);
      if (err?.status !== 409 && err?.status !== 404) setError(errorMessage(err));
    } finally {
      setCandidatesLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setError("");
    try {
      setSelected(await apiGet<DocumentItem>(`/document-center/operator/documents/${encodePathSegment(id)}`));
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const openRequestDetail = async (id: string) => {
    setRequestDetailLoading(true);
    setError("");
    setCandidates([]);
    try {
      const detail = await apiGet<OperatorRequest>(`/document-center/operator/requests/${encodePathSegment(id)}`);
      setSelectedRequest(detail);
      if (detail.status === "approved" && !detail.officialDocument) {
        await loadCandidates(detail.id);
      }
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setRequestDetailLoading(false);
    }
  };

  const refreshSelectedRequest = async (id = selectedRequest?.id || "") => {
    if (!id) return null;
    try {
      const detail = await apiGet<OperatorRequest>(`/document-center/operator/requests/${encodePathSegment(id)}`);
      setSelectedRequest(detail);
      if (detail.status === "approved" && !detail.officialDocument) {
        await loadCandidates(detail.id);
      } else {
        setCandidates([]);
      }
      return detail;
    } catch (err: any) {
      if (err?.status === 404) setSelectedRequest(null);
      throw err;
    }
  };

  const download = async (document: { id: string; canDownload: boolean }) => {
    if (!document.canDownload || downloadingId) return;
    setDownloadingId(document.id);
    setError("");
    try {
      const file = await apiGetBlob(`/document-center/documents/${encodePathSegment(document.id)}/download`);
      downloadBlob(file.blob, file.fileName || `dokumen-${document.id}.pdf`);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  const canPublish = (document: { status?: string | null; currentVersionNumber?: number | null; id: string }) =>
    document.status === "draft" && Number(document.currentVersionNumber) > 0 && publishingId !== document.id;

  const publish = async (document: DocumentItem) => {
    if (!canPublish(document)) return;
    const confirmed = await confirm({
      title: "Terbitkan dokumen?",
      description: `Judul: ${document.title}\nJenis: ${document.typeName}\nPeserta: ${document.participants?.length || 0}\nStatus: ${document.statusLabel || document.status}\n\nSistem akan membuat nomor resmi secara otomatis. Pastikan file dan data peserta sudah benar; nomor yang telah dialokasikan tidak dapat digunakan ulang.`,
      confirmLabel: "Terbitkan",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;
    setPublishingId(document.id);
    setError("");
    try {
      const result = await apiPost<PublishResponse>(`/document-center/operator/documents/${encodePathSegment(document.id)}/publish`);
      showToast(`Dokumen berhasil diterbitkan: ${result.documentNumber}`);
      await load();
      if (selected?.id === document.id) await openDetail(document.id);
    } catch (err: any) {
      setError(errorMessage(err));
      if (err?.status === 409) {
        await load();
        if (selected?.id === document.id) await openDetail(document.id);
      }
    } finally {
      setPublishingId(null);
    }
  };

  const publishLinkedDocument = async (document: RequestOfficialDocument) => {
    if (!canPublish(document)) return;
    const confirmed = await confirm({
      title: "Terbitkan dokumen ini?",
      description: "Nomor resmi akan dibuat otomatis dan request mahasiswa akan diselesaikan.",
      confirmLabel: "Terbitkan",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;
    setPublishingId(document.id);
    setError("");
    try {
      const result = await apiPost<PublishResponse>(`/document-center/operator/documents/${encodePathSegment(document.id)}/publish`);
      showToast(`Dokumen berhasil diterbitkan: ${result.documentNumber}`);
      await Promise.all([load(), loadRequests()]);
      if (selectedRequest) await refreshSelectedRequest(selectedRequest.id);
    } catch (err: any) {
      setError(errorMessage(err));
      if ([409, 410].includes(err?.status)) {
        await loadRequests();
        if (selectedRequest) await refreshSelectedRequest(selectedRequest.id).catch(() => {});
      }
    } finally {
      setPublishingId(null);
    }
  };

  useEffect(() => {
    void load(0);
  }, [status]);

  useEffect(() => {
    if (activeTab === "requests" && !requestsLoaded) {
      void loadRequests(0);
    }
  }, [activeTab, requestsLoaded]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void load(0);
  };

  const submitRequestSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void loadRequests(0);
  };

  const resetUpload = () => {
    setDefinitionId("");
    setUploadTitle("");
    setUploadFile(null);
    const fileInput = document.querySelector<HTMLInputElement>("input[type='file']");
    if (fileInput) fileInput.value = "";
    setParticipants([emptyParticipant()]);
    setOutcome(null);
    setSubmitError("");
  };

  const openUpload = async () => {
    setUploadOpen(true);
    setSubmitError("");
    if (definitions.length) return;
    setDefinitionsLoading(true);
    try {
      const result = await apiGet<{ items: Definition[] }>("/document-center/operator/definitions");
      setDefinitions(result.items.filter((item) => item));
    } catch (err: any) {
      setSubmitError(errorMessage(err));
    } finally {
      setDefinitionsLoading(false);
    }
  };

  const updateParticipant = (index: number, patch: Partial<UploadParticipant>) =>
    setParticipants((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));

  const searchStudent = async (index: number) => {
    const term = participants[index]?.search.trim();
    if (!term) return updateParticipant(index, { results: [] });
    updateParticipant(index, { loading: true });
    try {
      const result = await apiGet<{ items: Student[] }>(
        buildQueryPath("/document-center/operator/students", { search: term, limit: 20, offset: 0 }),
      );
      updateParticipant(index, { results: result.items });
    } catch (err: any) {
      setSubmitError(errorMessage(err));
    } finally {
      updateParticipant(index, { loading: false });
    }
  };

  const selectStudent = async (index: number, student: Student) => {
    updateParticipant(index, {
      student,
      results: [],
      periods: [],
      projects: [],
      selectedPeriod: "",
      projectId: "",
      loading: true,
    });
    try {
      const periods = await apiGet<{ items: Period[] }>(
        `/document-center/operator/students/${encodePathSegment(student.id)}/periods`,
      );
      const projects = definition?.requiresProject
        ? await apiGet<{ items: Project[] }>(`/document-center/operator/students/${encodePathSegment(student.id)}/projects`)
        : { items: [] };
      updateParticipant(index, { periods: periods.items, projects: projects.items });
    } catch (err: any) {
      setSubmitError(errorMessage(err));
    } finally {
      updateParticipant(index, { loading: false });
    }
  };

  const submitUpload = async () => {
    if (!definition || !uploadTitle.trim() || !uploadFile || submitting) {
      return setSubmitError("Lengkapi data dokumen terlebih dahulu.");
    }
    if (uploadFile.type !== "application/pdf" || !/\.pdf$/i.test(uploadFile.name) || uploadFile.size === 0 || uploadFile.size > 8 * 1024 * 1024) {
      return setSubmitError("File harus PDF dan maksimal 8 MB.");
    }
    const activityOutcome =
      definition.requestMode === "alumni_sync" ? "completed" : definition.requestMode === "early_exit_review" ? outcome : null;
    if (definition.requestMode === "early_exit_review" && !activityOutcome) {
      return setSubmitError("Pilih outcome kegiatan.");
    }

    const payloadParticipants: any[] = [];
    for (const participant of participants) {
      if (!participant.student) return setSubmitError("Pilih mahasiswa untuk setiap peserta.");
      if (participants.filter((item) => item.student?.id === participant.student?.id).length > 1) {
        return setSubmitError("Mahasiswa tidak boleh duplikat.");
      }
      if (definition.requiresProject && !participant.projectId) return setSubmitError("Pilih proyek peserta.");
      let period: any = undefined;
      if (definition.requiresPeriod && participant.periods.length === 0) {
        if (!participant.manualStart || !participant.manualEnd || participant.manualStart > participant.manualEnd) {
          return setSubmitError("Periode manual tidak valid.");
        }
        period = { activityType: participant.manualType, startDate: participant.manualStart, endDate: participant.manualEnd };
      } else if (participant.periods.length > 1) {
        const selected = participant.periods.find((item) => item.id === participant.selectedPeriod);
        if (!selected) return setSubmitError("Pilih periode peserta.");
        period = { activityType: selected.activityType, startDate: selected.startDate, endDate: selected.endDate };
      }
      payloadParticipants.push({
        legacyStudentId: participant.student.id,
        ...(definition.requiresProject ? { legacyProjectId: participant.projectId } : {}),
        ...(period ? { period } : {}),
      });
    }

    const types = payloadParticipants
      .map((_, index) => {
        const participant = participants[index];
        return participant.periods.length === 1
          ? participant.periods[0].activityType
          : participant.periods.length > 1
            ? participant.periods.find((item) => item.id === participant.selectedPeriod)?.activityType
            : participant.manualType;
      })
      .filter(Boolean);
    if (new Set(types).size > 1) return setSubmitError("Seluruh peserta harus memiliki tipe periode yang sama.");

    setSubmitting(true);
    setSubmitError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      await apiPost("/document-center/operator/documents/upload", {
        documentDefinitionId: definition.id,
        title: uploadTitle.trim(),
        activityOutcome,
        fileName: uploadFile.name,
        fileDataUrl: dataUrl,
        participants: payloadParticipants,
      });
      setUploadOpen(false);
      resetUpload();
      await load(0);
      showToast("Draft dokumen berhasil diunggah.");
    } catch (err: any) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (action: ReviewAction, request: OperatorRequest) => {
    setReviewAction({ action, request });
    setReviewNote("");
    setReviewError("");
  };

  const submitReviewAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewAction || reviewSubmitting) return;

    const note = reviewNote.trim();
    if (["revision", "reject"].includes(reviewAction.action) && !note) {
      setReviewError("Catatan operator wajib diisi.");
      return;
    }
    if (note.length > 2000) {
      setReviewError("Catatan operator maksimal 2.000 karakter.");
      return;
    }

    const endpoint =
      reviewAction.action === "revision"
        ? "request-revision"
        : reviewAction.action === "approve"
          ? "approve"
          : "reject";
    const payload = note ? { operatorNote: note } : {};

    if (reviewAction.action !== "revision") {
      const confirmed = await confirm({
        title: reviewAction.action === "approve" ? "Setujui permintaan?" : "Tolak permintaan?",
        description:
          reviewAction.action === "approve"
            ? "Permintaan akan disetujui dan dapat dihubungkan ke draft yang cocok."
            : "Permintaan akan ditolak dan mahasiswa akan melihat catatan operator.",
        confirmLabel: reviewAction.action === "approve" ? "Setujui" : "Tolak",
        cancelLabel: "Batal",
        variant: reviewAction.action === "approve" ? "primary" : "danger",
      });
      if (!confirmed) return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    try {
      const updated = await apiPost<OperatorRequest>(
        `/document-center/operator/requests/${encodePathSegment(reviewAction.request.id)}/${endpoint}`,
        payload,
      );
      setReviewAction(null);
      await loadRequests();
      await refreshSelectedRequest(updated.id);
      showToast(
        reviewAction.action === "revision"
          ? "Permintaan dikembalikan untuk perbaikan."
          : reviewAction.action === "approve"
            ? "Permintaan berhasil disetujui."
            : "Permintaan berhasil ditolak.",
      );
    } catch (err: any) {
      setReviewError(errorMessage(err));
      if ([404, 409].includes(err?.status)) {
        await loadRequests();
        await refreshSelectedRequest(reviewAction.request.id).catch(() => {});
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  const linkCandidate = async (candidate: DocumentCandidate) => {
    if (!selectedRequest || linkingDocumentId) return;
    const confirmed = await confirm({
      title: "Hubungkan draft ini ke permintaan?",
      description: "Pastikan file, mahasiswa, periode, dan jenis surat sudah benar.",
      confirmLabel: "Hubungkan",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;

    setLinkingDocumentId(candidate.id);
    setError("");
    try {
      await apiPost<OperatorRequest>(
        `/document-center/operator/requests/${encodePathSegment(selectedRequest.id)}/link-document`,
        { officialDocumentId: candidate.id },
      );
      await loadRequests();
      await refreshSelectedRequest(selectedRequest.id);
      showToast("Draft berhasil dihubungkan ke permintaan.");
    } catch (err: any) {
      setError(errorMessage(err));
      if ([404, 409].includes(err?.status)) {
        await loadRequests();
        await refreshSelectedRequest(selectedRequest.id).catch(() => {});
        await loadCandidates(selectedRequest.id).catch(() => {});
      }
    } finally {
      setLinkingDocumentId(null);
    }
  };

  const renderArchive = () => (
    <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Arsip Dokumen</p>
          <h2 className="text-sm font-black text-foreground">Dokumen resmi STAS-RG</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void openUpload()}>
            <Upload size={14} />
            Upload Dokumen
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>
      <form onSubmit={submitSearch} className="flex flex-col gap-2 border-b border-border p-4 md:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-border bg-white px-3">
          <Search size={15} className="text-muted-foreground" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Cari judul atau nomor dokumen"
            className="h-10 w-full border-none bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
        >
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="terbit">Terbit</option>
          <option value="diarsipkan">Diarsipkan</option>
          <option value="dicabut">Dicabut</option>
        </select>
        <Button type="submit" size="sm">
          Cari
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Judul</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Nomor</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead>Terbit</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                <Loader2 className="mx-auto animate-spin" size={20} />
              </TableCell>
            </TableRow>
          ) : data.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                Belum ada dokumen.
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-black text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.participants?.length || 0} peserta</p>
                </TableCell>
                <TableCell>
                  {item.typeName}
                  <p className="text-xs text-muted-foreground">{purposeLabels[item.documentPurpose] || item.documentPurpose}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(item.status) as any}>{item.statusLabel || item.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{item.documentNumber || "-"}</TableCell>
                <TableCell>{formatDateReadable(item.createdAt)}</TableCell>
                <TableCell>{formatDateReadable(item.issuedAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => void openDetail(item.id)} aria-label="Lihat detail">
                      <Eye size={15} />
                    </Button>
                    {item.canDownload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={downloadingId === item.id}
                        onClick={() => void download(item)}
                        aria-label="Unduh"
                      >
                        {downloadingId === item.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                      </Button>
                    )}
                    {item.status === "draft" && Number(item.currentVersionNumber) > 0 && (
                      <Button variant="ghost" size="sm" disabled={publishingId === item.id} onClick={() => void publish(item)}>
                        {publishingId === item.id ? <Loader2 size={15} className="animate-spin" /> : "Publish"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>{current.total} dokumen</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || current.offset === 0}
            onClick={() => void load(Math.max(0, current.offset - current.limit))}
          >
            <ChevronLeft size={14} />
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || current.offset + current.limit >= current.total}
            onClick={() => void load(current.offset + current.limit)}
          >
            Berikutnya
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderRequests = () => (
    <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Permintaan Surat</p>
          <h2 className="text-sm font-black text-foreground">Review permintaan surat mahasiswa</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadRequests()} disabled={requestsLoading}>
          <RefreshCw size={14} className={requestsLoading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>
      <form onSubmit={submitRequestSearch} className="flex flex-col gap-2 border-b border-border p-4 md:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-border bg-white px-3">
          <Search size={15} className="text-muted-foreground" />
          <input
            value={requestSearch}
            onChange={(event) => setRequestSearch(event.target.value)}
            placeholder="Cari nama, NIM, atau subject"
            className="h-10 w-full border-none bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={requestStatus}
          onChange={(event) => {
            setRequestStatus(event.target.value);
            window.setTimeout(() => void loadRequests(0), 0);
          }}
          className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
        >
          {requestStatuses.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Cari
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Mahasiswa</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Diajukan</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requestsLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                <Loader2 className="mx-auto animate-spin" size={20} />
              </TableCell>
            </TableRow>
          ) : requests.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                Belum ada permintaan surat.
              </TableCell>
            </TableRow>
          ) : (
            requests.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-black text-foreground">{item.student.name || "-"}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.student.nim, item.student.prodi].filter(Boolean).join(" | ") || "-"}
                  </p>
                </TableCell>
                <TableCell>
                  {item.definition.name}
                  <p className="text-xs text-muted-foreground">{item.definition.typeCode || "-"}</p>
                </TableCell>
                <TableCell>
                  <p className="max-w-[220px] truncate font-semibold text-foreground">{item.subject}</p>
                  {item.activityType && <p className="text-xs text-muted-foreground">{item.activityType}</p>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{periodText(item.period, item.activityType)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(item.status) as any}>{item.statusLabel || item.status}</Badge>
                </TableCell>
                <TableCell>{formatDateReadable(item.submittedAt || item.createdAt)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => void openRequestDetail(item.id)} aria-label="Detail request">
                    <Eye size={15} />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>{currentRequests.total} permintaan</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={requestsLoading || currentRequests.offset === 0}
            onClick={() => void loadRequests(Math.max(0, currentRequests.offset - currentRequests.limit))}
          >
            <ChevronLeft size={14} />
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={requestsLoading || currentRequests.offset + currentRequests.limit >= currentRequests.total}
            onClick={() => void loadRequests(currentRequests.offset + currentRequests.limit)}
          >
            Berikutnya
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <OperatorLayout title="Pusat Dokumen">
      <div className="flex flex-col gap-5 pb-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
        {toast && (
          <div className="fixed right-5 top-5 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
            {toast}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto rounded-[10px] bg-slate-100 p-1 w-fit max-w-full">
          {[
            { key: "requests", label: "Permintaan Surat", enabled: true },
            { key: "final", label: "Dokumen Akhir Kegiatan", enabled: false },
            { key: "archive", label: "Arsip Dokumen", enabled: true },
            { key: "templates", label: "Template Dokumen", enabled: false },
            { key: "numbering", label: "Jenis & Penomoran", enabled: false },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={!tab.enabled}
              onClick={() => {
                if (!tab.enabled) return;
                setActiveTab(tab.key as "requests" | "archive");
              }}
              className={`whitespace-nowrap rounded-[8px] px-3 py-1.5 text-xs font-black ${
                activeTab === tab.key
                  ? "bg-white text-foreground shadow-sm"
                  : tab.enabled
                    ? "text-muted-foreground hover:bg-white/60"
                    : "cursor-not-allowed text-muted-foreground opacity-55"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "requests" ? renderRequests() : renderArchive()}

        <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) resetUpload(); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Draft Dokumen</DialogTitle>
              <DialogDescription>Dokumen disimpan sebagai draft dan belum diterbitkan.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 text-sm">
              {submitError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-semibold text-red-600">{submitError}</p>}
              <label className="grid gap-1 font-bold">
                Jenis dokumen
                <select
                  value={definitionId}
                  onChange={(event) => {
                    setDefinitionId(event.target.value);
                    setOutcome(null);
                    setParticipants([emptyParticipant()]);
                  }}
                  className="h-10 rounded-[10px] border border-border bg-white px-3 font-normal"
                >
                  <option value="">{definitionsLoading ? "Memuat jenis dokumen..." : "Pilih jenis dokumen"}</option>
                  {definitions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.typeName} - {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 font-bold">
                Judul dokumen
                <input
                  value={uploadTitle}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  maxLength={255}
                  className="h-10 rounded-[10px] border border-border px-3 font-normal"
                  placeholder="Masukkan judul dokumen"
                />
              </label>
              <label className="grid gap-1 font-bold">
                File PDF
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  className="rounded-[10px] border border-border p-2 font-normal"
                />
              </label>
              {definition?.requestMode === "early_exit_review" && (
                <label className="grid gap-1 font-bold">
                  Outcome kegiatan
                  <select
                    value={outcome || ""}
                    onChange={(event) => setOutcome(event.target.value || null)}
                    className="h-10 rounded-[10px] border border-border bg-white px-3 font-normal"
                  >
                    <option value="">Pilih outcome</option>
                    <option value="withdrawn_early">Mengundurkan diri lebih awal</option>
                    <option value="terminated_early">Dihentikan lebih awal</option>
                  </select>
                </label>
              )}
              <div className="grid gap-3">
                <p className="font-black">Peserta</p>
                {participants.map((participant, index) => (
                  <div key={index} className="grid gap-2 rounded-[12px] border border-border bg-slate-50 p-3">
                    <div className="flex gap-2">
                      <input
                        value={participant.search}
                        onChange={(event) => updateParticipant(index, { search: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void searchStudent(index);
                          }
                        }}
                        className="h-9 flex-1 rounded-[8px] border border-border bg-white px-3"
                        placeholder="Cari nama, NIM, atau email"
                      />
                      <Button type="button" size="sm" variant="outline" disabled={participant.loading} onClick={() => void searchStudent(index)}>
                        {participant.loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        Cari
                      </Button>
                      {participants.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setParticipants((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                          aria-label="Hapus peserta"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                    {participant.results.length > 0 && (
                      <div className="rounded-[8px] border border-border bg-white">
                        {participant.results.map((student) => (
                          <button
                            type="button"
                            key={student.id}
                            onClick={() => void selectStudent(index, student)}
                            className="block w-full border-b border-border px-3 py-2 text-left text-xs last:border-b-0 hover:bg-slate-50"
                          >
                            <b>{student.name}</b> {student.nim ? `(${student.nim})` : ""}
                          </button>
                        ))}
                      </div>
                    )}
                    {participant.student && (
                      <p className="text-xs font-semibold text-emerald-700">
                        Peserta: {participant.student.name} {participant.student.nim ? `(${participant.student.nim})` : ""}
                      </p>
                    )}
                    {definition?.requiresProject && participant.student && (
                      <label className="grid gap-1 text-xs font-bold">
                        Proyek
                        <select
                          value={participant.projectId}
                          onChange={(event) => updateParticipant(index, { projectId: event.target.value })}
                          className="h-9 rounded-[8px] border border-border bg-white px-2 font-normal"
                        >
                          <option value="">Pilih proyek</option>
                          {participant.projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {definition?.requiresPeriod && participant.student && (
                      <label className="grid gap-1 text-xs font-bold">
                        Periode
                        {participant.periods.length === 1 ? (
                          <span className="font-normal text-muted-foreground">
                            Dipilih otomatis: {participant.periods[0].activityType} ({participant.periods[0].startDate} - {participant.periods[0].endDate || "-"})
                          </span>
                        ) : participant.periods.length > 1 ? (
                          <select
                            value={participant.selectedPeriod}
                            onChange={(event) => updateParticipant(index, { selectedPeriod: event.target.value })}
                            className="h-9 rounded-[8px] border border-border bg-white px-2 font-normal"
                          >
                            <option value="">Pilih periode</option>
                            {participant.periods.map((period) => (
                              <option key={period.id} value={period.id}>
                                {period.activityType}: {period.startDate} - {period.endDate || "-"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="grid grid-cols-3 gap-2">
                            <select
                              value={participant.manualType}
                              onChange={(event) => updateParticipant(index, { manualType: event.target.value })}
                              className="h-9 rounded-[8px] border border-border bg-white px-2 font-normal"
                            >
                              <option value="Magang">Magang</option>
                              <option value="Riset">Riset</option>
                            </select>
                            <input
                              type="date"
                              value={participant.manualStart}
                              onChange={(event) => updateParticipant(index, { manualStart: event.target.value })}
                              className="h-9 rounded-[8px] border border-border bg-white px-2 font-normal"
                            />
                            <input
                              type="date"
                              value={participant.manualEnd}
                              onChange={(event) => updateParticipant(index, { manualEnd: event.target.value })}
                              className="h-9 rounded-[8px] border border-border bg-white px-2 font-normal"
                            />
                          </span>
                        )}
                      </label>
                    )}
                  </div>
                ))}
                {definition?.canBeCollective && (
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setParticipants((items) => [...items, emptyParticipant()])}>
                    <Plus size={14} />
                    Tambah Peserta
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setUploadOpen(false); resetUpload(); }} disabled={submitting}>
                Batal
              </Button>
              <Button type="button" onClick={() => void submitUpload()} disabled={submitting || !definition}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Upload Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(selected) || detailLoading} onOpenChange={(open) => { if (!open) setSelected(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{detailLoading ? "Memuat detail..." : selected?.title || "Detail Dokumen"}</DialogTitle>
              <DialogDescription>{selected?.typeName || ""}</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="grid gap-3 text-sm">
                <div className="rounded-[12px] border border-border bg-slate-50 p-3">
                  <p><b>Status:</b> {selected.statusLabel || selected.status}</p>
                  <p><b>Nomor:</b> {selected.documentNumber || "-"}</p>
                  <p><b>Dibuat:</b> {formatDateReadable(selected.createdAt)}</p>
                  <p><b>Terbit:</b> {formatDateReadable(selected.issuedAt)}</p>
                  {selected.activityOutcome && <p><b>Outcome:</b> {selected.activityOutcome}</p>}
                </div>
                <div>
                  <p className="mb-2 font-black">Peserta</p>
                  {selected.participants?.length ? (
                    selected.participants.map((participant, index) => (
                      <div key={index} className="border-b border-border py-2">
                        <p className="font-bold">{participant.name || "-"} {participant.nim ? `(${participant.nim})` : ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {[participant.projectName, participant.period, participant.participantRole].filter(Boolean).join(" | ") || "-"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Tidak ada peserta.</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              {selected?.canDownload && (
                <Button onClick={() => void download(selected)} disabled={downloadingId === selected.id}>
                  {downloadingId === selected.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  Unduh
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={(Boolean(selectedRequest) && !reviewAction) || requestDetailLoading}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedRequest(null);
              setCandidates([]);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{requestDetailLoading ? "Memuat detail..." : selectedRequest?.subject || "Detail Permintaan"}</DialogTitle>
              <DialogDescription>{selectedRequest?.definition.name || ""}</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="grid gap-4 text-sm">
                <div className="grid gap-3 rounded-[12px] border border-border bg-slate-50 p-3 md:grid-cols-2">
                  <div>
                    <p><b>Status:</b> {selectedRequest.statusLabel || selectedRequest.status}</p>
                    <p><b>Jenis:</b> {selectedRequest.definition.name}</p>
                    <p><b>Subject:</b> {selectedRequest.subject}</p>
                    <p><b>Activity type:</b> {selectedRequest.activityType || selectedRequest.student.activityType || "-"}</p>
                  </div>
                  <div>
                    <p><b>Mahasiswa:</b> {selectedRequest.student.name || "-"}</p>
                    <p><b>NIM:</b> {selectedRequest.student.nim || "-"}</p>
                    <p><b>Prodi:</b> {selectedRequest.student.prodi || "-"}</p>
                    <p><b>Capability:</b> {[
                      selectedRequest.canRequestRevision ? "Minta Perbaikan" : null,
                      selectedRequest.canApprove ? "Setujui" : null,
                      selectedRequest.canReject ? "Tolak" : null,
                    ].filter(Boolean).join(", ") || "-"}</p>
                  </div>
                </div>

                <div className="rounded-[12px] border border-border bg-slate-50 p-3">
                  <p><b>Catatan mahasiswa:</b> {selectedRequest.studentNote || "-"}</p>
                  <p><b>Catatan operator:</b> {selectedRequest.operatorNote || "-"}</p>
                  <p><b>Periode:</b> {periodText(selectedRequest.period, selectedRequest.activityType)}</p>
                  <p><b>Project:</b> {projectText(selectedRequest.project)}</p>
                  <p><b>Diajukan:</b> {formatDateReadable(selectedRequest.submittedAt || selectedRequest.createdAt)}</p>
                  <p><b>Direview:</b> {formatDateReadable(selectedRequest.reviewedAt)}</p>
                  <p><b>Reviewer:</b> {selectedRequest.reviewedByName || "-"}</p>
                  <p><b>Dibatalkan:</b> {formatDateReadable(selectedRequest.cancelledAt)}</p>
                  <p><b>Selesai:</b> {formatDateReadable(selectedRequest.completedAt)}</p>
                </div>

                {selectedRequest.officialDocument && (
                  <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-3">
                    <p className="font-black text-emerald-800">Dokumen Terhubung</p>
                    <p><b>Judul:</b> {selectedRequest.officialDocument.title || "-"}</p>
                    <p><b>Nomor:</b> {selectedRequest.officialDocument.documentNumber || "-"}</p>
                    <p><b>Status:</b> {selectedRequest.officialDocument.status || "-"}</p>
                    <p><b>Versi:</b> {selectedRequest.officialDocument.currentVersionNumber || "-"}</p>
                    <p><b>Terbit:</b> {formatDateReadable(selectedRequest.officialDocument.issuedAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedRequest.officialDocument.canDownload && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadingId === selectedRequest.officialDocument.id}
                          onClick={() => void download(selectedRequest.officialDocument!)}
                        >
                          {downloadingId === selectedRequest.officialDocument.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          Unduh
                        </Button>
                      )}
                      {selectedRequest.officialDocument.status === "draft" && Number(selectedRequest.officialDocument.currentVersionNumber) > 0 && (
                        <Button
                          size="sm"
                          disabled={publishingId === selectedRequest.officialDocument.id}
                          onClick={() => void publishLinkedDocument(selectedRequest.officialDocument!)}
                        >
                          {publishingId === selectedRequest.officialDocument.id ? <Loader2 size={14} className="animate-spin" /> : null}
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {shouldShowCandidates && (
                  <div className="rounded-[12px] border border-border bg-white p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="font-black text-foreground">Kandidat Draft Cocok</p>
                      <Button size="sm" variant="outline" disabled={candidatesLoading} onClick={() => void loadCandidates(selectedRequest.id)}>
                        <RefreshCw size={14} className={candidatesLoading ? "animate-spin" : ""} />
                        Refresh
                      </Button>
                    </div>
                    {candidatesLoading ? (
                      <div className="flex h-24 items-center justify-center text-muted-foreground">
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                    ) : candidates.length === 0 ? (
                      <p className="rounded-[10px] border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
                        Belum ada draft yang cocok. Buat atau unggah draft melalui tab Arsip Dokumen, lalu kembali ke permintaan ini.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {candidates.map((candidate) => (
                          <div key={candidate.id} className="rounded-[10px] border border-border bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-black text-foreground">{candidate.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {candidate.definition.name} ({candidate.definition.typeCode || "-"})
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Status {candidate.status} | Versi {candidate.currentVersionNumber || "-"} | Dibuat {formatDateReadable(candidate.createdAt)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {candidate.canDownload && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={downloadingId === candidate.id}
                                    onClick={() => void download(candidate)}
                                  >
                                    {downloadingId === candidate.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    Unduh
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  disabled={linkingDocumentId === candidate.id}
                                  onClick={() => void linkCandidate(candidate)}
                                >
                                  {linkingDocumentId === candidate.id ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
                                  Hubungkan
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedRequest?.canRequestRevision && (
                <Button variant="outline" onClick={() => openReviewDialog("revision", selectedRequest)}>
                  Minta Perbaikan
                </Button>
              )}
              {selectedRequest?.canReject && (
                <Button variant="outline" onClick={() => openReviewDialog("reject", selectedRequest)}>
                  Tolak
                </Button>
              )}
              {selectedRequest?.canApprove && (
                <Button onClick={() => openReviewDialog("approve", selectedRequest)}>
                  Setujui
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(reviewAction)} onOpenChange={(open) => { if (!open) setReviewAction(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{reviewAction ? actionTitle(reviewAction.action) : "Review Permintaan"}</DialogTitle>
              <DialogDescription>{reviewAction?.request.subject || ""}</DialogDescription>
            </DialogHeader>
            <form className="grid gap-4" onSubmit={submitReviewAction}>
              {reviewError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">{reviewError}</p>}
              <label className="grid gap-1 text-sm font-bold">
                Catatan operator {reviewAction?.action === "approve" ? "(opsional)" : ""}
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="rounded-[10px] border border-border px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-[#0AB600]/20"
                  placeholder="Tuliskan catatan untuk mahasiswa"
                />
                <span className="text-[11px] font-normal text-muted-foreground">{reviewNote.trim().length}/2000 karakter</span>
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={reviewSubmitting} onClick={() => setReviewAction(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
                  {reviewAction ? actionTitle(reviewAction.action) : "Kirim"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {confirmDialog}
      </div>
    </OperatorLayout>
  );
}
