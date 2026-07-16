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
  apiPatch,
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

type BulkPublishResponse = {
  items: PublishResponse[];
  batches: Array<{
    id: string;
    typeCode: string;
    sequence: number;
    documentNumber: string;
    issuedAt: string;
  }>;
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

type FinalActivityType = "Magang" | "Riset";

type FinalPeriod = {
  id?: string;
  activityType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

type FinalDocument = {
  id: string;
  title?: string | null;
  documentNumber?: string | null;
  status?: string | null;
  currentVersionNumber?: number | null;
  canDownload: boolean;
  issuedAt?: string | null;
};

type FinalOutcomeFilter = "completed" | "withdrawn_early";

type FinalEligibleItem = {
  withdrawalRequestId?: string | null;
  student: {
    id: string;
    name?: string | null;
    nim?: string | null;
    prodi?: string | null;
    status?: string | null;
  };
  activityType?: FinalActivityType | null;
  period?: (FinalPeriod & { id: string }) | null;
  periods?: Array<FinalPeriod & { id: string }>;
  effectiveDate?: string | null;
  reason?: string | null;
  finalStatus?: string | null;
  canRegister?: boolean;
  blockingReason?: string | null;
  completedAt?: string | null;
  projects?: Array<{
    id?: string | null;
    title?: string | null;
    shortTitle?: string | null;
    role?: string | null;
    status?: string | null;
    projectStatus?: string | null;
    membershipStatus?: string | null;
    joinedAt?: string | null;
    completedAt?: string | null;
  }>;
  existingCase?: {
    id: string;
    status?: string | null;
    hasCompletionDocument?: boolean;
  } | null;
};

type FinalCase = {
  id: string;
  student: {
    name?: string | null;
    nim?: string | null;
    prodi?: string | null;
  };
  activityType: FinalActivityType;
  period: FinalPeriod;
  outcome: string;
  status: string;
  statusLabel?: string;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  certificateCount?: number;
  certificateSummary?: Array<{
    id?: string | null;
    status?: string | null;
    documentNumber?: string | null;
    documentStatus?: string | null;
    documentId?: string | null;
  }>;
  completionDocument?: FinalDocument | null;
  capabilities: {
    canUploadCompletion?: boolean;
    canPublishCompletion?: boolean;
    canGenerateCompletion?: boolean;
  };
  projects?: FinalProject[];
};

type FinalProject = {
  id: string;
  project: {
    title?: string | null;
    shortTitle?: string | null;
    status?: string | null;
    role?: string | null;
    joinedAt?: string | null;
    completedAt?: string | null;
  };
  certificateRequired: boolean;
  certificateStatus: string;
  displayOrder?: number | null;
  certificateDocument?: FinalDocument | null;
  capabilities: {
    canUploadCertificate?: boolean;
    canPublishCertificate?: boolean;
  };
};

type FinalEligibleResponse = {
  items: FinalEligibleItem[];
  pagination: { limit: number; offset: number; total: number };
};

type FinalCaseListResponse = {
  items: FinalCase[];
  pagination: { limit: number; offset: number; total: number };
};

type FinalRegisterResponse = {
  items: Array<{
    studentId?: string | null;
    withdrawalRequestId?: string | null;
    periodId?: string | null;
    status: string;
    caseId?: string | null;
    caseStatus?: string | null;
    projectCount?: number;
    message?: string;
  }>;
};

type FinalDraftUpload = {
  type: "completion" | "certificate";
  id: string;
  title: string;
  file: File | null;
  projectTitle?: string | null;
};

type FinalCorrectionProject = {
  id: string;
  title: string;
  role: string;
  joinedAt: string;
  completedAt: string;
};

type FinalCorrectionForm = {
  studentName: string;
  studentNim: string;
  studentProdi: string;
  periodStart: string;
  periodEnd: string;
  periodDescription: string;
  projects: FinalCorrectionProject[];
};

type RevokeDialogState = {
  document: FinalDocument;
  kind: "completion" | "certificate";
  caseId: string;
  projectId?: string | null;
  reason: string;
  effectiveDate: string;
};

type TemplateVersion = {
  id: string;
  versionNumber: number;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  pageWidth?: number | null;
  pageHeight?: number | null;
  createdAt?: string | null;
};

type DocumentTemplate = {
  id: string;
  documentDefinitionId: string;
  templateKey: string;
  name: string;
  activityType: string;
  activityOutcome: string;
  status: string;
  activeVersionId?: string | null;
  activeVersionNumber?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  versions?: TemplateVersion[];
};

type TemplateListResponse = {
  items: DocumentTemplate[];
  pagination: { limit: number; offset: number; total: number };
};

type TemplateUploadState = {
  template: DocumentTemplate;
  file: File | null;
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

const finalPeriodText = (period?: FinalPeriod | null) => {
  if (!period) return "-";
  const range = [formatDateReadable(period.startDate), formatDateReadable(period.endDate)]
    .filter((value) => value && value !== "-")
    .join(" - ");
  return [period.activityType, range, period.description].filter(Boolean).join(" | ") || "-";
};

const finalPeriodYearText = (period?: FinalPeriod | null) => {
  if (!period) return "-";
  const years = [period.startDate, period.endDate]
    .map((value) => (value ? String(value).slice(0, 4) : ""))
    .filter(Boolean);
  const uniqueYears = Array.from(new Set(years));
  const yearText = uniqueYears.length > 1 ? uniqueYears.join(" - ") : uniqueYears[0] || "";
  return [period.activityType, yearText].filter(Boolean).join(" | ") || "-";
};

const finalProjectText = (project?: FinalProject["project"] | null) => {
  if (!project) return "-";
  return [project.shortTitle || project.title, project.role, project.status].filter(Boolean).join(" | ") || "-";
};

const finalOutcomeLabel = (outcome?: string | null) =>
  outcome === "withdrawn_early" ? "Mengundurkan Diri" : outcome === "completed" ? "Selesai Kegiatan" : outcome || "-";

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const templateLabels: Record<string, string> = {
  certificate_completed_internship: "Sertifikat Mahasiswa Magang",
  certificate_completed_research: "Sertifikat Mahasiswa Riset",
  completion_letter_completed_internship: "Surat Keterangan Selesai Magang",
};

const managedTemplateKeys = [
  "certificate_completed_internship",
  "certificate_completed_research",
  "completion_letter_completed_internship",
];

const templateOutcomeLabel = (outcome?: string | null) =>
  outcome === "completed" ? "Selesai" : outcome || "-";

const formatFileSize = (value?: number | null) => {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
};

const templatePageLabel = (version?: TemplateVersion | null) => {
  if (!version?.pageWidth || !version?.pageHeight) return "-";
  const orientation = Number(version.pageWidth) >= Number(version.pageHeight) ? "Landscape" : "Portrait";
  return `${orientation} ${Math.round(Number(version.pageWidth))} x ${Math.round(Number(version.pageHeight))} pt`;
};

const errorMessage = (err: any) => {
  if (err instanceof ApiError) {
    if (err.status === 400) return err.message || "Input tidak valid.";
    if (err.status === 403) return "Anda tidak memiliki akses untuk aksi ini.";
    if (err.status === 404) return "Data tidak ditemukan atau sudah tidak tersedia.";
    if (err.status === 409) return err.message || "Data atau status telah berubah. Muat ulang dan periksa kembali.";
    if (err.status === 410) return "File dokumen tidak tersedia. Periksa kembali draft sebelum menerbitkan.";
    if (err.status === 413) return "File terlalu besar. Gunakan PDF sesuai batas ukuran yang diizinkan.";
    if (err.status === 422) return err.message || "Data belum memenuhi syarat untuk diproses.";
    if (err.status >= 500) return "Permintaan belum dapat diproses. Coba lagi nanti.";
  }
  return err?.message || "Permintaan belum dapat diproses.";
};

const actionTitle = (action: ReviewAction) =>
  action === "revision" ? "Minta Perbaikan" : action === "approve" ? "Setujui Permintaan" : "Tolak Permintaan";

export default function DocumentCenter() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<"requests" | "final" | "archive" | "templates">("requests");

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

  const [finalSubTab, setFinalSubTab] = useState<"eligible" | "cases">("eligible");
  const [finalOutcome, setFinalOutcome] = useState<FinalOutcomeFilter>("completed");
  const [finalActivityType, setFinalActivityType] = useState<FinalActivityType | "">("");
  const [finalPeriodId, setFinalPeriodId] = useState("");
  const [finalSearch, setFinalSearch] = useState("");
  const [eligibleData, setEligibleData] = useState<FinalEligibleResponse>({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [selectedEligible, setSelectedEligible] = useState<string[]>([]);
  const [withdrawalPeriods, setWithdrawalPeriods] = useState<Record<string, string>>({});
  const [withdrawalProjects, setWithdrawalProjects] = useState<Record<string, string[]>>({});
  const [primaryProjects, setPrimaryProjects] = useState<Record<string, string>>({});
  const [primaryProjectDialogOpen, setPrimaryProjectDialogOpen] = useState(false);
  const [registeringFinalCases, setRegisteringFinalCases] = useState(false);
  const [registerResult, setRegisterResult] = useState<FinalRegisterResponse["items"]>([]);
  const [registerSummary, setRegisterSummary] = useState<{ created: number; existing: number; invalid: number; documentNumbers: string[] } | null>(null);
  const [finalCases, setFinalCases] = useState<FinalCaseListResponse>({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
  const [finalCasesLoading, setFinalCasesLoading] = useState(false);
  const [finalCasesLoaded, setFinalCasesLoaded] = useState(false);
  const [finalCaseStatus, setFinalCaseStatus] = useState("");
  const [finalCaseActivityType, setFinalCaseActivityType] = useState("");
  const [finalCasePurpose, setFinalCasePurpose] = useState("");
  const [finalCaseSearch, setFinalCaseSearch] = useState("");
  const [selectedFinalCase, setSelectedFinalCase] = useState<FinalCase | null>(null);
  const [finalCaseDetailLoading, setFinalCaseDetailLoading] = useState(false);
  const [finalCorrectionOpen, setFinalCorrectionOpen] = useState(false);
  const [finalCorrectionForm, setFinalCorrectionForm] = useState<FinalCorrectionForm | null>(null);
  const [finalCorrectionError, setFinalCorrectionError] = useState("");
  const [finalCorrectionSaving, setFinalCorrectionSaving] = useState(false);
  const [finalDraftUpload, setFinalDraftUpload] = useState<FinalDraftUpload | null>(null);
  const [finalDraftError, setFinalDraftError] = useState("");
  const [completionUploading, setCompletionUploading] = useState(false);
  const [certificateUploadingId, setCertificateUploadingId] = useState<string | null>(null);
  const [generatingCertificateId, setGeneratingCertificateId] = useState<string | null>(null);
  const [generatingCompletionCaseId, setGeneratingCompletionCaseId] = useState<string | null>(null);
  const [revokeDialog, setRevokeDialog] = useState<RevokeDialogState | null>(null);
  const [revokeError, setRevokeError] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateListResponse>({ items: [], pagination: { limit: 50, offset: 0, total: 0 } });
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false);
  const [templateUpload, setTemplateUpload] = useState<TemplateUploadState | null>(null);
  const [templateUploadError, setTemplateUploadError] = useState("");
  const [templateUploadingId, setTemplateUploadingId] = useState<string | null>(null);
  const [activatingTemplateVersionId, setActivatingTemplateVersionId] = useState<string | null>(null);
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);

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
  const currentEligible = eligibleData.pagination;
  const currentFinalCases = finalCases.pagination;
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

  const candidateKey = (item: FinalEligibleItem) =>
    finalOutcome === "withdrawn_early"
      ? String(item.withdrawalRequestId || item.student.id)
      : `${item.student.id}::${item.period?.id || ""}`;

  const effectivePeriodForCandidate = (item: FinalEligibleItem) => {
    if (finalOutcome === "withdrawn_early") {
      const key = candidateKey(item);
      const selectedPeriodId = withdrawalPeriods[key];
      return (item.periods || []).find((period) => period.id === selectedPeriodId) || item.period || item.periods?.[0] || null;
    }
    return item.period || null;
  };

  const needsPrimaryProjectSelection = (item: FinalEligibleItem) =>
    finalOutcome === "completed" &&
    item.activityType === "Magang" &&
    (item.projects?.length || 0) > 1;

  const selectedPrimaryProjectId = (item: FinalEligibleItem) => {
    const key = candidateKey(item);
    const saved = primaryProjects[key];
    if (saved && item.projects?.some((project) => String(project.id || "") === saved)) return saved;
    if ((item.projects?.length || 0) === 1) return String(item.projects?.[0]?.id || "");
    return "";
  };

  const loadEligible = async (offset = eligibleData.pagination.offset) => {
    if (!finalActivityType) {
      setEligibleData({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
      setSelectedEligible([]);
      setWithdrawalPeriods({});
      setWithdrawalProjects({});
      setPrimaryProjects({});
      return;
    }
    setEligibleLoading(true);
    setError("");
    const requestId = Date.now();
    try {
      const endpoint = finalOutcome === "withdrawn_early"
        ? "/document-center/operator/final-activity/early-exit/eligible"
        : "/document-center/operator/final-activity/eligible";
      const result = await apiGet<FinalEligibleResponse>(
        buildQueryPath(endpoint, {
          activityType: finalActivityType,
          periodId: finalOutcome === "completed" ? finalPeriodId || null : null,
          search: finalSearch || null,
          limit: 20,
          offset,
          _r: requestId,
        }),
      );
      setEligibleData(result);
      const visibleKeys = new Set(result.items.map(candidateKey));
      setSelectedEligible((items) => items.filter((key) => visibleKeys.has(key)));
      setWithdrawalPeriods((items) => {
        const next: Record<string, string> = {};
        for (const item of result.items) {
          const key = finalOutcome === "withdrawn_early" ? String(item.withdrawalRequestId || item.student.id) : `${item.student.id}::${item.period?.id || ""}`;
          if (visibleKeys.has(key) && items[key]) next[key] = items[key];
          if (!next[key] && item.periods?.length === 1) next[key] = item.periods[0].id;
        }
        return next;
      });
      setWithdrawalProjects((items) => {
        const next: Record<string, string[]> = {};
        for (const item of result.items) {
          const key = finalOutcome === "withdrawn_early" ? String(item.withdrawalRequestId || item.student.id) : `${item.student.id}::${item.period?.id || ""}`;
          if (visibleKeys.has(key)) next[key] = (items[key] || []).filter((projectId) => item.projects?.some((project) => project.id === projectId));
        }
        return next;
      });
      setPrimaryProjects((items) => {
        const next: Record<string, string> = {};
        for (const item of result.items) {
          const key = candidateKey(item);
          const saved = items[key];
          if (visibleKeys.has(key) && saved && item.projects?.some((project) => String(project.id || "") === saved)) next[key] = saved;
        }
        return next;
      });
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setEligibleLoading(false);
    }
  };

  const loadFinalCases = async (offset = finalCases.pagination.offset) => {
    setFinalCasesLoading(true);
    setError("");
    try {
      const result = await apiGet<FinalCaseListResponse>(
        buildQueryPath("/document-center/operator/final-activity/cases", {
          status: finalCaseStatus || null,
          activityType: finalCaseActivityType || null,
          documentPurpose: finalCasePurpose || null,
          search: finalCaseSearch || null,
          limit: 20,
          offset,
        }),
      );
      setFinalCases(result);
      setFinalCasesLoaded(true);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setFinalCasesLoading(false);
    }
  };

  const openFinalCaseDetail = async (id: string) => {
    setFinalCaseDetailLoading(true);
    setError("");
    try {
      setSelectedFinalCase(await apiGet<FinalCase>(`/document-center/operator/final-activity/cases/${encodePathSegment(id)}`));
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setFinalCaseDetailLoading(false);
    }
  };

  const refreshSelectedFinalCase = async (id = selectedFinalCase?.id || "") => {
    if (!id) return;
    try {
      setSelectedFinalCase(await apiGet<FinalCase>(`/document-center/operator/final-activity/cases/${encodePathSegment(id)}`));
    } catch (err: any) {
      if (err?.status === 404) setSelectedFinalCase(null);
      throw err;
    }
  };

  const buildFinalCorrectionForm = (caseItem: FinalCase): FinalCorrectionForm => ({
    studentName: caseItem.student.name || "",
    studentNim: caseItem.student.nim || "",
    studentProdi: caseItem.student.prodi || "",
    periodStart: caseItem.period?.startDate ? String(caseItem.period.startDate).slice(0, 10) : "",
    periodEnd: caseItem.period?.endDate ? String(caseItem.period.endDate).slice(0, 10) : "",
    periodDescription: caseItem.period?.description || "",
    projects: (caseItem.projects || []).map((project) => ({
      id: project.id,
      title: project.project.title || project.project.shortTitle || "",
      role: project.project.role || "",
      joinedAt: project.project.joinedAt ? String(project.project.joinedAt).slice(0, 10) : "",
      completedAt: project.project.completedAt ? String(project.project.completedAt).slice(0, 10) : "",
    })),
  });

  const openFinalCorrection = () => {
    if (!selectedFinalCase) return;
    setFinalCorrectionForm(buildFinalCorrectionForm(selectedFinalCase));
    setFinalCorrectionError("");
    setFinalCorrectionOpen(true);
  };

  const openFinalCorrectionById = async (id: string) => {
    setFinalCaseDetailLoading(true);
    setError("");
    try {
      const caseItem = await apiGet<FinalCase>(`/document-center/operator/final-activity/cases/${encodePathSegment(id)}`);
      setSelectedFinalCase(caseItem);
      setFinalCorrectionForm(buildFinalCorrectionForm(caseItem));
      setFinalCorrectionError("");
      setFinalCorrectionOpen(true);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setFinalCaseDetailLoading(false);
    }
  };

  const updateFinalCorrectionProject = (id: string, patch: Partial<FinalCorrectionProject>) => {
    setFinalCorrectionForm((current) =>
      current
        ? {
            ...current,
            projects: current.projects.map((project) => (project.id === id ? { ...project, ...patch } : project)),
          }
        : current,
    );
  };

  const submitFinalCorrection = async () => {
    if (!selectedFinalCase || !finalCorrectionForm || finalCorrectionSaving) return;
    setFinalCorrectionSaving(true);
    setFinalCorrectionError("");
    try {
      const result = await apiPatch<{ case: FinalCase }>(
        `/document-center/operator/final-activity/cases/${encodePathSegment(selectedFinalCase.id)}/dynamic-data`,
        {
          student: {
            name: finalCorrectionForm.studentName,
            nim: finalCorrectionForm.studentNim,
            prodi: finalCorrectionForm.studentProdi,
          },
          period: {
            startDate: finalCorrectionForm.periodStart || null,
            endDate: finalCorrectionForm.periodEnd || null,
            description: finalCorrectionForm.periodDescription,
          },
          projects: finalCorrectionForm.projects.map((project) => ({
            id: project.id,
            title: project.title,
            role: project.role,
            joinedAt: project.joinedAt || null,
            completedAt: project.completedAt || null,
          })),
        },
      );
      setSelectedFinalCase(result.case);
      setFinalCorrectionOpen(false);
      await loadFinalCases();
      showToast("Data dokumen akhir berhasil diperbarui tanpa mengubah nomor dan tanggal terbit.");
    } catch (err: any) {
      setFinalCorrectionError(err instanceof ApiError && err.message ? err.message : errorMessage(err));
      if ([404, 409, 410, 422].includes(err?.status)) {
        await Promise.all([loadFinalCases(), refreshSelectedFinalCase(selectedFinalCase.id).catch(() => {})]);
      }
    } finally {
      setFinalCorrectionSaving(false);
    }
  };

  const buildFinalBatchSummaries = () => {
    const batches = new Map<string, {
      key: string;
      kind: "SKS" | "Sertifikat";
      documentNumber: string;
      documentStatus?: string | null;
      count: number;
      students: string[];
    }>();
    const addBatch = (kind: "SKS" | "Sertifikat", documentNumber?: string | null, documentStatus?: string | null, studentName?: string | null) => {
      if (!documentNumber) return;
      const key = `${kind}:${documentNumber}`;
      const current = batches.get(key) || { key, kind, documentNumber, documentStatus, count: 0, students: [] };
      current.count += 1;
      if (studentName && !current.students.includes(studentName)) current.students.push(studentName);
      if (documentStatus) current.documentStatus = documentStatus;
      batches.set(key, current);
    };
    for (const item of finalCases.items) {
      addBatch("SKS", item.completionDocument?.documentNumber, item.completionDocument?.status, item.student.name);
      for (const certificate of item.certificateSummary || []) {
        addBatch("Sertifikat", certificate.documentNumber, certificate.documentStatus || certificate.status, item.student.name);
      }
    }
    return Array.from(batches.values()).sort((a, b) =>
      a.kind.localeCompare(b.kind) || a.documentNumber.localeCompare(b.documentNumber),
    );
  };

  const loadTemplates = async (offset = templates.pagination.offset) => {
    setTemplatesLoading(true);
    setError("");
    try {
      const result = await apiGet<TemplateListResponse>(
        buildQueryPath("/document-center/operator/templates", {
          limit: 50,
          offset,
          activityOutcome: "completed",
        }),
      );
      setTemplates({
        ...result,
        items: (result.items || []).filter((item) => managedTemplateKeys.includes(item.templateKey)),
      });
      setTemplatesLoaded(true);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setTemplatesLoading(false);
    }
  };

  const openTemplateDetail = async (id: string) => {
    setTemplateDetailLoading(true);
    setError("");
    try {
      setSelectedTemplate(await apiGet<DocumentTemplate>(`/document-center/operator/templates/${encodePathSegment(id)}`));
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setTemplateDetailLoading(false);
    }
  };

  const refreshSelectedTemplate = async (id = selectedTemplate?.id || "") => {
    if (!id) return;
    try {
      setSelectedTemplate(await apiGet<DocumentTemplate>(`/document-center/operator/templates/${encodePathSegment(id)}`));
    } catch (err: any) {
      if (err?.status === 404) setSelectedTemplate(null);
      throw err;
    }
  };

  const submitFinalSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void loadEligible(0);
  };

  const submitFinalCaseSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void loadFinalCases(0);
  };

  const toggleEligible = (item: FinalEligibleItem) => {
    const key = candidateKey(item);
    const periods = item.periods || (item.period ? [item.period] : []);
    const canSelect = finalOutcome === "completed"
      ? Boolean(item.period && !item.existingCase)
      : item.canRegister !== false && periods.length > 0 && (periods.length === 1 || Boolean(withdrawalPeriods[key]));
    if (!canSelect) return;
    setSelectedEligible((items) => (items.includes(key) ? items.filter((value) => value !== key) : [...items, key]));
  };

  const autoGenerateAndPublishFinalCases = async (caseIds: string[]) => {
    const documentIds: string[] = [];
    for (const caseId of caseIds) {
      let detail = await apiGet<FinalCase>(`/document-center/operator/final-activity/cases/${encodePathSegment(caseId)}`);
      if (detail.completionDocument && detail.capabilities?.canPublishCompletion) {
        documentIds.push(detail.completionDocument.id);
      }

      for (const project of detail.projects || []) {
        let certificateDocument = project.certificateDocument || null;
        if (
          detail.outcome === "completed" &&
          ["Magang", "Riset"].includes(detail.activityType) &&
          project.certificateRequired &&
          project.certificateStatus === "pending" &&
          !certificateDocument
        ) {
          const generated = await apiPost<{ document?: FinalDocument }>(
            `/document-center/operator/final-activity/case-projects/${encodePathSegment(project.id)}/generate-certificate-draft`,
            {},
          );
          certificateDocument = generated.document || null;
        }

        if (!certificateDocument) {
          detail = await apiGet<FinalCase>(`/document-center/operator/final-activity/cases/${encodePathSegment(caseId)}`);
          certificateDocument = detail.projects?.find((item) => item.id === project.id)?.certificateDocument || null;
        }

        if (certificateDocument?.status === "draft" && Number(certificateDocument.currentVersionNumber) > 0) {
          documentIds.push(certificateDocument.id);
        }
      }
    }

    const uniqueDocumentIds = Array.from(new Set(documentIds));
    if (!uniqueDocumentIds.length) return null;
    return apiPost<BulkPublishResponse>("/document-center/operator/documents/bulk-publish", {
      documentIds: uniqueDocumentIds,
    });
  };

  const registerFinalCases = async () => {
    if (registeringFinalCases || selectedEligible.length === 0) return;
    const selectedItems = eligibleData.items.filter((item) => selectedEligible.includes(candidateKey(item)));
    if (selectedItems.length === 0) return;
    if (finalOutcome === "withdrawn_early") {
      const invalid = selectedItems.find((item) => {
        const key = candidateKey(item);
        return item.canRegister === false || ((item.periods?.length || 0) > 1 && !withdrawalPeriods[key]);
      });
      if (invalid) {
        setError(invalid.blockingReason || "Pilih periode untuk seluruh kandidat withdrawal.");
        return;
      }
    }
    if (finalOutcome === "completed") {
      const missingPrimaryProject = selectedItems.find((item) => needsPrimaryProjectSelection(item) && !selectedPrimaryProjectId(item));
      if (missingPrimaryProject) {
        setError("");
        setPrimaryProjectDialogOpen(true);
        return;
      }
    }
    const confirmed = await confirm({
      title: finalOutcome === "withdrawn_early" ? "Daftarkan withdrawal early exit?" : "Daftarkan mahasiswa terpilih?",
      description: finalOutcome === "withdrawn_early"
        ? "Daftarkan mahasiswa terpilih sebagai Dokumen Akhir Kegiatan karena mengundurkan diri?"
        : "Daftarkan mahasiswa terpilih ke Dokumen Akhir Kegiatan?",
      confirmLabel: "Daftarkan",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;

    setPrimaryProjectDialogOpen(false);
    setRegisteringFinalCases(true);
    setError("");
    try {
      const result = finalOutcome === "withdrawn_early"
        ? await apiPost<FinalRegisterResponse>("/document-center/operator/final-activity/early-exit/cases", {
            items: selectedItems.map((item) => {
              const key = candidateKey(item);
              const periodId = withdrawalPeriods[key] || (item.periods?.length === 1 ? item.periods[0].id : "");
              return {
                withdrawalRequestId: item.withdrawalRequestId,
                ...(periodId ? { periodId } : {}),
                certificateProjectIds: withdrawalProjects[key] || [],
              };
            }),
          })
        : await apiPost<FinalRegisterResponse>("/document-center/operator/final-activity/cases", {
            items: selectedItems.map((item) => {
              const primaryProjectId = selectedPrimaryProjectId(item);
              return {
                studentId: item.student.id,
                periodId: item.period?.id,
                ...(primaryProjectId ? { primaryProjectId } : {}),
              };
            }),
          });
      setRegisterResult(result.items || []);
      const successful = new Set(
        (result.items || [])
          .filter((item) => item.status === "created" || item.status === "existing")
          .map((item) => finalOutcome === "withdrawn_early" ? String(item.withdrawalRequestId || "") : `${item.studentId}::${item.periodId}`),
      );
      setSelectedEligible((items) => items.filter((key) => !successful.has(key)));
      const caseIds = Array.from(new Set((result.items || [])
        .filter((item) => (item.status === "created" || item.status === "existing") && item.caseId)
        .map((item) => String(item.caseId))));
      let bulkPublish: BulkPublishResponse | null = null;
      let autoPublishError = "";
      if (finalOutcome === "completed" && caseIds.length) {
        try {
          bulkPublish = await autoGenerateAndPublishFinalCases(caseIds);
        } catch (err: any) {
          autoPublishError = err instanceof ApiError && err.message ? err.message : errorMessage(err);
        }
      }
      await Promise.all([loadEligible(0), loadFinalCases(0)]);
      const created = result.items?.filter((item) => item.status === "created").length || 0;
      const existing = result.items?.filter((item) => item.status === "existing").length || 0;
      const invalid = result.items?.filter((item) => !["created", "existing"].includes(item.status)).length || 0;
      const documentNumbers = Array.from(new Set((bulkPublish?.batches || []).map((batch) => batch.documentNumber).filter(Boolean)));
      setRegisterSummary({ created, existing, invalid, documentNumbers });
      const batchText = bulkPublish?.batches?.length
        ? ` Nomor batch: ${bulkPublish.batches.map((batch) => batch.documentNumber).join(", ")}.`
        : "";
      if (autoPublishError) {
        setError(`Registrasi berhasil, tetapi generate/publish otomatis belum selesai: ${autoPublishError}`);
      } else {
        setError("");
      }
      showToast(`Registrasi selesai: ${created} baru, ${existing} sudah ada, ${invalid} perlu dicek.${batchText}`);
    } catch (err: any) {
      setError(errorMessage(err));
      if (err?.status === 409) {
        await Promise.all([loadEligible(0), loadFinalCases(0)]);
      }
    } finally {
      setRegisteringFinalCases(false);
    }
  };

  const resetFinalDraftUpload = () => {
    setFinalDraftUpload(null);
    setFinalDraftError("");
  };

  const validatePdf = (file: File | null) => {
    if (!file || file.type !== "application/pdf" || !/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 8 * 1024 * 1024) {
      return "File harus PDF dan maksimal 8 MB.";
    }
    return "";
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const resetTemplateUpload = () => {
    setTemplateUpload(null);
    setTemplateUploadError("");
  };

  const submitTemplateUpload = async () => {
    if (!templateUpload) return;
    const fileError = validatePdf(templateUpload.file);
    if (fileError) return setTemplateUploadError(fileError);
    if (templateUploadingId === templateUpload.template.id) return;
    setTemplateUploadingId(templateUpload.template.id);
    setTemplateUploadError("");
    try {
      const dataUrl = await fileToDataUrl(templateUpload.file!);
      await apiPost(`/document-center/operator/templates/${encodePathSegment(templateUpload.template.id)}/versions`, {
        fileName: templateUpload.file!.name,
        fileDataUrl: dataUrl,
      });
      const templateId = templateUpload.template.id;
      resetTemplateUpload();
      await loadTemplates();
      if (selectedTemplate?.id === templateId) await refreshSelectedTemplate(templateId);
      showToast("Versi template berhasil diunggah.");
    } catch (err: any) {
      setTemplateUploadError(errorMessage(err));
      if ([404, 409].includes(err?.status)) {
        await loadTemplates();
        if (selectedTemplate) await refreshSelectedTemplate(selectedTemplate.id).catch(() => {});
      }
    } finally {
      setTemplateUploadingId(null);
    }
  };

  const activateTemplate = async (template: DocumentTemplate, version: TemplateVersion) => {
    if (activatingTemplateVersionId === version.id) return;
    const confirmed = await confirm({
      title: "Aktifkan versi template ini?",
      description: "Versi ini akan digunakan untuk generate sertifikat berikutnya.",
      confirmLabel: "Aktifkan",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;
    setActivatingTemplateVersionId(version.id);
    setError("");
    try {
      await apiPost(`/document-center/operator/templates/${encodePathSegment(template.id)}/activate`, {
        versionId: version.id,
      });
      await loadTemplates();
      await refreshSelectedTemplate(template.id);
      showToast("Versi template berhasil diaktifkan.");
    } catch (err: any) {
      setError(errorMessage(err));
      if ([404, 409].includes(err?.status)) {
        await loadTemplates();
        await refreshSelectedTemplate(template.id).catch(() => {});
      }
    } finally {
      setActivatingTemplateVersionId(null);
    }
  };

  const previewTemplate = async (template: DocumentTemplate) => {
    if (previewingTemplateId === template.id) return;
    setPreviewingTemplateId(template.id);
    setError("");
    try {
      const file = await apiGetBlob(`/document-center/operator/templates/${encodePathSegment(template.id)}/preview`);
      const url = window.URL.createObjectURL(file.blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) downloadBlob(file.blob, file.fileName || `${template.id}-preview.pdf`);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      setError(errorMessage(err));
      if ([404, 409].includes(err?.status)) {
        await loadTemplates();
        if (selectedTemplate?.id === template.id) await refreshSelectedTemplate(template.id).catch(() => {});
      }
    } finally {
      setPreviewingTemplateId(null);
    }
  };

  const submitFinalDraftUpload = async () => {
    if (!finalDraftUpload) return;
    const title = finalDraftUpload.title.trim();
    const fileError = validatePdf(finalDraftUpload.file);
    if (!title) return setFinalDraftError("Judul wajib diisi.");
    if (fileError) return setFinalDraftError(fileError);

    const isCompletion = finalDraftUpload.type === "completion";
    if ((isCompletion && completionUploading) || (!isCompletion && certificateUploadingId === finalDraftUpload.id)) return;
    if (isCompletion) setCompletionUploading(true);
    else setCertificateUploadingId(finalDraftUpload.id);
    setFinalDraftError("");
    try {
      const dataUrl = await fileToDataUrl(finalDraftUpload.file!);
      await apiPost(
        isCompletion
          ? `/document-center/operator/final-activity/cases/${encodePathSegment(finalDraftUpload.id)}/completion-draft`
          : `/document-center/operator/final-activity/case-projects/${encodePathSegment(finalDraftUpload.id)}/certificate-draft`,
        { title, fileName: finalDraftUpload.file!.name, fileDataUrl: dataUrl },
      );
      resetFinalDraftUpload();
      await Promise.all([loadFinalCases(), load()]);
      if (selectedFinalCase) await refreshSelectedFinalCase(selectedFinalCase.id);
      showToast(isCompletion ? "Draft SKS berhasil diunggah." : "Draft sertifikat berhasil diunggah.");
    } catch (err: any) {
      setFinalDraftError(errorMessage(err));
      if ([404, 409].includes(err?.status)) {
        await Promise.all([loadFinalCases(), loadEligible(0)]);
        if (selectedFinalCase) await refreshSelectedFinalCase(selectedFinalCase.id).catch(() => {});
      }
    } finally {
      if (isCompletion) setCompletionUploading(false);
      else setCertificateUploadingId(null);
    }
  };

  const activeCompletionLetterTemplate = templates.items.find(
    (template) => template.templateKey === "completion_letter_completed_internship" && Boolean(template.activeVersionId),
  );

  const canGenerateCompletionLetter = (caseItem: FinalCase | null = selectedFinalCase) =>
    Boolean(
      caseItem &&
      caseItem.activityType === "Magang" &&
      caseItem.outcome === "completed" &&
      caseItem.status === "pending" &&
      !caseItem.completionDocument &&
      caseItem.capabilities.canGenerateCompletion !== false &&
      (caseItem.projects?.length || 0) >= 1 &&
      activeCompletionLetterTemplate,
    );

  const shouldShowCompletionGenerateSlot = (caseItem: FinalCase | null = selectedFinalCase) =>
    Boolean(
      caseItem &&
      caseItem.activityType === "Magang" &&
      caseItem.outcome === "completed" &&
      caseItem.status === "pending" &&
      !caseItem.completionDocument &&
      caseItem.capabilities.canGenerateCompletion !== false &&
      (caseItem.projects?.length || 0) >= 1,
    );

  const generateCompletionLetterDraft = async (caseItem: FinalCase) => {
    if (!canGenerateCompletionLetter(caseItem) || generatingCompletionCaseId === caseItem.id) return;
    const confirmed = await confirm({
      title: "Generate draft Surat Keterangan Selesai Magang?",
      description:
        "Sistem akan memakai template aktif dan mengambil data mahasiswa, periode, dan proyek dari case ini. Tidak ada nomor resmi yang dibuat pada tahap draft.",
      confirmLabel: "Generate",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;
    setGeneratingCompletionCaseId(caseItem.id);
    setError("");
    try {
      await apiPost(`/document-center/operator/final-activity/cases/${encodePathSegment(caseItem.id)}/generate-completion-letter-draft`, {});
      await Promise.all([loadFinalCases(), load()]);
      await refreshSelectedFinalCase(caseItem.id);
      showToast("Draft Surat Keterangan Selesai Magang berhasil dibuat.");
    } catch (err: any) {
      setError(errorMessage(err));
      if ([404, 409, 410, 422].includes(err?.status)) {
        await Promise.all([loadFinalCases(), loadTemplates()]);
        await refreshSelectedFinalCase(caseItem.id).catch(() => {});
      }
    } finally {
      setGeneratingCompletionCaseId(null);
    }
  };

  const canGenerateCertificate = (project: FinalProject) =>
    Boolean(
      selectedFinalCase?.outcome === "completed" &&
      ["Magang", "Riset"].includes(selectedFinalCase.activityType) &&
      project.certificateRequired &&
      project.certificateStatus === "pending" &&
      !project.certificateDocument &&
      project.capabilities.canUploadCertificate,
    );

  const generateCertificateDraft = async (project: FinalProject) => {
    if (!selectedFinalCase || !canGenerateCertificate(project) || generatingCertificateId === project.id) return;
    const confirmed = await confirm({
      title: "Generate draft sertifikat dari template aktif?",
      description: "Data mahasiswa, proyek, peran, dan periode akan diambil otomatis oleh sistem.",
      confirmLabel: "Generate",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;
    setGeneratingCertificateId(project.id);
    setError("");
    try {
      await apiPost(`/document-center/operator/final-activity/case-projects/${encodePathSegment(project.id)}/generate-certificate-draft`, {});
      await Promise.all([loadFinalCases(), load()]);
      await refreshSelectedFinalCase(selectedFinalCase.id);
      showToast("Draft sertifikat berhasil dibuat dari template.");
    } catch (err: any) {
      setError(errorMessage(err));
      if ([404, 409, 410].includes(err?.status)) {
        await Promise.all([loadFinalCases(), loadTemplates()]);
        await refreshSelectedFinalCase(selectedFinalCase.id).catch(() => {});
      }
    } finally {
      setGeneratingCertificateId(null);
    }
  };

  const publishFinalDocument = async (document: FinalDocument, kind: "completion" | "certificate") => {
    if (!document.id || publishingId === document.id) return;
    const isInternshipCompletionLetter =
      kind === "completion" &&
      selectedFinalCase?.activityType === "Magang" &&
      selectedFinalCase?.outcome === "completed";
    const confirmed = await confirm({
      title: isInternshipCompletionLetter
        ? "Terbitkan Surat Keterangan Selesai Magang ini?"
        : kind === "completion"
          ? "Terbitkan Surat Keterangan Selesai?"
          : "Terbitkan sertifikat?",
      description:
        isInternshipCompletionLetter
          ? "Terbitkan Surat Keterangan Selesai Magang ini? Sistem akan membuat nomor resmi kode 09 dan PDF final bertanggal secara otomatis."
          : kind === "completion"
          ? "Terbitkan Surat Keterangan Selesai ini? Nomor resmi akan dibuat otomatis oleh sistem."
          : "Terbitkan sertifikat ini? Sistem akan membuat nomor resmi dan PDF final bernomor secara otomatis.",
      confirmLabel: "Terbitkan",
      cancelLabel: "Batal",
      variant: "primary",
    });
    if (!confirmed) return;
    setPublishingId(document.id);
    setError("");
    try {
      const response = await apiPost<PublishResponse>(`/document-center/operator/documents/${encodePathSegment(document.id)}/publish`);
      showToast(isInternshipCompletionLetter ? `Surat berhasil diterbitkan dengan nomor ${response.documentNumber}.` : `Dokumen berhasil diterbitkan: ${response.documentNumber}`);
      await Promise.all([loadFinalCases(), load()]);
      if (selectedFinalCase) await refreshSelectedFinalCase(selectedFinalCase.id);
    } catch (err: any) {
      setError(errorMessage(err));
      if ([409, 410].includes(err?.status)) {
        await Promise.all([loadFinalCases(), loadEligible(0)]);
        if (selectedFinalCase) await refreshSelectedFinalCase(selectedFinalCase.id).catch(() => {});
      }
    } finally {
      setPublishingId(null);
    }
  };

  const canRevokeFinalDocument = (document?: FinalDocument | null) =>
    Boolean(document?.id && ["terbit", "diarsipkan"].includes(String(document.status || "")) && document.documentNumber);

  const openRevokeDialog = (document: FinalDocument, kind: "completion" | "certificate", projectId?: string | null) => {
    if (!selectedFinalCase || !canRevokeFinalDocument(document)) return;
    setRevokeError("");
    setRevokeDialog({
      document,
      kind,
      caseId: selectedFinalCase.id,
      projectId: projectId || null,
      reason: "",
      effectiveDate: todayIsoDate(),
    });
  };

  const submitRevoke = async () => {
    if (!revokeDialog || revokingId === revokeDialog.document.id) return;
    const reason = revokeDialog.reason.trim();
    const effectiveDate = revokeDialog.effectiveDate;
    if (!reason || reason.length > 2000) {
      setRevokeError("Alasan wajib diisi dan maksimal 2.000 karakter.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      setRevokeError("Tanggal efektif wajib berformat YYYY-MM-DD.");
      return;
    }
    if (effectiveDate > todayIsoDate()) {
      setRevokeError("Tanggal efektif tidak boleh melewati hari ini.");
      return;
    }
    const issuedDate = revokeDialog.document.issuedAt ? String(revokeDialog.document.issuedAt).slice(0, 10) : null;
    if (issuedDate && effectiveDate < issuedDate) {
      setRevokeError("Tanggal efektif tidak boleh sebelum tanggal terbit.");
      return;
    }

    setRevokingId(revokeDialog.document.id);
    setRevokeError("");
    setError("");
    try {
      await apiPost(`/document-center/operator/documents/${encodePathSegment(revokeDialog.document.id)}/revoke`, {
        reason,
        effectiveDate,
      });
      const caseId = revokeDialog.caseId;
      setRevokeDialog(null);
      showToast("Dokumen berhasil dicabut.");
      await Promise.all([loadFinalCases(), load()]);
      await refreshSelectedFinalCase(caseId).catch(() => {});
    } catch (err: any) {
      setRevokeError(errorMessage(err));
      if ([404, 409].includes(err?.status)) {
        await Promise.all([loadFinalCases(), loadEligible(0), load()]);
        if (selectedFinalCase) await refreshSelectedFinalCase(selectedFinalCase.id).catch(() => {});
      }
    } finally {
      setRevokingId(null);
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

  useEffect(() => {
    if (activeTab === "final" && !finalCasesLoaded) {
      void loadFinalCases(0);
    }
  }, [activeTab, finalCasesLoaded]);

  useEffect(() => {
    if (activeTab === "templates" && !templatesLoaded) {
      void loadTemplates(0);
    }
  }, [activeTab, templatesLoaded]);

  useEffect(() => {
    if (activeTab === "final" && !templatesLoaded) {
      void loadTemplates(0);
    }
  }, [activeTab, templatesLoaded]);

  useEffect(() => {
    if (activeTab === "final" && finalSubTab === "eligible") {
      if (finalActivityType) void loadEligible(0);
      else {
        setEligibleData({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
        setSelectedEligible([]);
        setWithdrawalPeriods({});
        setWithdrawalProjects({});
      }
    }
  }, [activeTab, finalSubTab, finalOutcome, finalActivityType, finalPeriodId]);

  useEffect(() => {
    if (activeTab === "final" && finalSubTab === "cases") {
      void loadFinalCases(0);
    }
  }, [activeTab, finalSubTab, finalCaseStatus, finalCaseActivityType, finalCasePurpose]);

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

  const renderFinalDocumentActions = (document: FinalDocument | null | undefined, canPublishCapability?: boolean, kind: "completion" | "certificate" = "completion", projectId?: string | null) => {
    if (!document) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {document.canDownload && (
          <Button size="sm" variant="outline" disabled={downloadingId === document.id} onClick={() => void download(document)}>
            {downloadingId === document.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Unduh
          </Button>
        )}
        {canPublishCapability && (
          <Button size="sm" disabled={publishingId === document.id} onClick={() => void publishFinalDocument(document, kind)}>
            {publishingId === document.id ? <Loader2 size={14} className="animate-spin" /> : null}
            Publish
          </Button>
        )}
        {canRevokeFinalDocument(document) && (
          <Button size="sm" variant="destructive" disabled={revokingId === document.id} onClick={() => openRevokeDialog(document, kind, projectId)}>
            {revokingId === document.id ? <Loader2 size={14} className="animate-spin" /> : null}
            Cabut Dokumen
          </Button>
        )}
      </div>
    );
  };

  const renderFinalActivity = () => {
    const availablePeriods = Array.from(
      new Map(
        eligibleData.items
          .flatMap((item) => finalOutcome === "withdrawn_early" ? item.periods || [] : item.period ? [item.period] : [])
          .map((period) => [period.id, period]),
      ).values(),
    );
    const visibleEligibleItems = eligibleData.items.filter((item) => finalOutcome === "withdrawn_early" ? item.canRegister !== false : !item.existingCase);
    const selectableEligibleKeys = visibleEligibleItems
      .filter((item) => {
        const key = candidateKey(item);
        const periods = item.periods || (item.period ? [item.period] : []);
        return finalOutcome === "completed"
          ? Boolean(item.period && !item.existingCase)
          : item.canRegister !== false && periods.length > 0 && (periods.length === 1 || Boolean(withdrawalPeriods[key]));
      })
      .map(candidateKey);
    const selectedCount = selectedEligible.length;
    const allSelectableChecked = selectableEligibleKeys.length > 0 && selectableEligibleKeys.every((key) => selectedEligible.includes(key));
    const finalBatchSummaries = buildFinalBatchSummaries();

    return (
      <div className="grid gap-4">
        <div className="flex gap-2 overflow-x-auto rounded-[12px] border border-border bg-white p-1 shadow-sm w-fit max-w-full">
          {[
            { key: "eligible", label: "1. Kandidat" },
            { key: "cases", label: "2. Dokumen Terdaftar" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFinalSubTab(tab.key as "eligible" | "cases")}
              className={`whitespace-nowrap rounded-[9px] border px-3 py-1.5 text-xs font-black ${
                finalSubTab === tab.key ? "border-emerald-300 bg-emerald-50 text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {finalSubTab === "eligible" ? (
          <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Kandidat Mahasiswa</p>
                <h2 className="text-sm font-black text-foreground">Mahasiswa eligible untuk Dokumen Akhir Kegiatan</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={registeringFinalCases || selectedCount === 0}
                  onClick={() => void registerFinalCases()}
                >
                  {registeringFinalCases ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Daftarkan ({selectedCount})
                </Button>
                <Button variant="outline" size="sm" onClick={() => void loadEligible()} disabled={eligibleLoading || !finalActivityType}>
                  <RefreshCw size={14} className={eligibleLoading ? "animate-spin" : ""} />
                  Refresh
                </Button>
              </div>
            </div>
            <form onSubmit={submitFinalSearch} className="grid gap-2 border-b border-border p-4 md:grid-cols-[180px_160px_220px_1fr_auto]">
              <select
                value={finalOutcome}
                onChange={(event) => {
                  setFinalOutcome(event.target.value as FinalOutcomeFilter);
                  setFinalPeriodId("");
                  setSelectedEligible([]);
                  setWithdrawalPeriods({});
                  setWithdrawalProjects({});
                  setPrimaryProjects({});
                  setPrimaryProjectDialogOpen(false);
                  setRegisterResult([]);
                  setRegisterSummary(null);
                  setEligibleData({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
                }}
                className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
              >
                <option value="completed">Selesai Kegiatan</option>
                <option value="withdrawn_early">Mengundurkan Diri</option>
              </select>
              <select
                value={finalActivityType}
                onChange={(event) => {
                  setFinalActivityType(event.target.value as FinalActivityType | "");
                  setFinalPeriodId("");
                  setSelectedEligible([]);
                  setPrimaryProjects({});
                  setPrimaryProjectDialogOpen(false);
                  setRegisterSummary(null);
                }}
                className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
              >
                <option value="">Pilih activity type</option>
                <option value="Magang">Magang</option>
                <option value="Riset">Riset</option>
              </select>
              <select
                value={finalPeriodId}
                onChange={(event) => {
                  setFinalPeriodId(event.target.value);
                  setSelectedEligible([]);
                  setPrimaryProjects({});
                  setPrimaryProjectDialogOpen(false);
                  setRegisterSummary(null);
                }}
                disabled={finalOutcome !== "completed" || !finalActivityType || availablePeriods.length === 0}
                className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
              >
                <option value="">{finalOutcome === "withdrawn_early" ? "Periode dipilih per kandidat" : "Semua periode tampil"}</option>
                {availablePeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {finalPeriodYearText(period)}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 rounded-[10px] border border-border bg-white px-3">
                <Search size={15} className="text-muted-foreground" />
                <input
                  value={finalSearch}
                  onChange={(event) => setFinalSearch(event.target.value)}
                  placeholder="Cari nama atau NIM"
                  className="h-10 w-full border-none bg-transparent text-sm outline-none"
                />
              </div>
              <Button type="submit" size="sm" disabled={!finalActivityType || eligibleLoading}>
                Cari
              </Button>
            </form>
            {!finalActivityType ? (
              <div className="p-6 text-sm text-muted-foreground">Pilih activity type Magang atau Riset untuk memuat kandidat.</div>
            ) : (
              <>
                {registerSummary && (
                  <div className="border-b border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                    <p className="font-black text-emerald-900">Dokumen akhir berhasil diproses</p>
                    <p className="mt-1 font-semibold">
                      {registerSummary.created} kandidat baru berhasil didaftarkan
                      {registerSummary.existing ? ", " + registerSummary.existing + " sudah terdaftar sebelumnya" : ""}
                      {registerSummary.invalid ? ", " + registerSummary.invalid + " perlu dicek" : ""}.
                    </p>
                    {registerSummary.documentNumbers.length > 0 && (
                      <p className="mt-2">
                        Nomor dokumen terbit: <b>{registerSummary.documentNumbers.join(", ")}</b>
                      </p>
                    )}
                    {registerSummary.documentNumbers.length === 0 && registerResult.length > 0 && (
                      <p className="mt-2">Dokumen sudah masuk ke tab Dokumen Terdaftar.</p>
                    )}
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={allSelectableChecked}
                          disabled={selectableEligibleKeys.length === 0}
                          onChange={(event) => {
                            setSelectedEligible((items) => {
                              const current = new Set(items);
                              if (event.target.checked) selectableEligibleKeys.forEach((key) => current.add(key));
                              else selectableEligibleKeys.forEach((key) => current.delete(key));
                              return Array.from(current);
                            });
                          }}
                          aria-label="Pilih semua kandidat yang bisa didaftarkan"
                        />
                      </TableHead>
                      <TableHead>Mahasiswa</TableHead>
                      <TableHead className="w-40">Periode</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="w-36">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          <Loader2 className="mx-auto animate-spin" size={20} />
                        </TableCell>
                      </TableRow>
                    ) : visibleEligibleItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                          Semua kandidat pada filter ini sudah terdaftar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleEligibleItems.map((item) => {
                        const key = candidateKey(item);
                        const effectivePeriod = effectivePeriodForCandidate(item);
                        const periods = item.periods || (item.period ? [item.period] : []);
                        const selectedProjectIds = withdrawalProjects[key] || [];
                        const projectNames = item.projects?.map((project) => project.shortTitle || project.title).filter(Boolean) || [];
                        const primaryProjectId = selectedPrimaryProjectId(item);
                        const primaryProjectName = item.projects?.find((project) => String(project.id || "") === primaryProjectId)?.shortTitle
                          || item.projects?.find((project) => String(project.id || "") === primaryProjectId)?.title
                          || "";
                        const canSelect = finalOutcome === "completed"
                          ? Boolean(item.period && !item.existingCase)
                          : item.canRegister !== false && periods.length > 0 && (periods.length === 1 || Boolean(withdrawalPeriods[key]));
                        return (
                          <TableRow key={key}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedEligible.includes(key)}
                                disabled={!canSelect}
                                onChange={() => toggleEligible(item)}
                                aria-label="Pilih kandidat"
                              />
                            </TableCell>
                            <TableCell>
                              <p className="font-black text-foreground">{item.student.name || "-"}</p>
                              <p className="text-xs text-muted-foreground">
                                {[item.student.nim, item.student.prodi].filter(Boolean).join(" | ") || "-"}
                              </p>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {finalOutcome === "withdrawn_early" ? (
                                <div className="grid gap-1">
                                  <p>{finalPeriodText(effectivePeriod)}</p>
                                  {periods.length > 1 && (
                                    <select
                                      value={withdrawalPeriods[key] || ""}
                                      onChange={(event) => {
                                        setWithdrawalPeriods((items) => ({ ...items, [key]: event.target.value }));
                                        setSelectedEligible((items) => items.filter((value) => value !== key));
                                      }}
                                      className="h-8 rounded-[8px] border border-border bg-white px-2 text-xs"
                                    >
                                      <option value="">Pilih periode</option>
                                      {periods.map((period) => (
                                        <option key={period.id} value={period.id}>{finalPeriodText(period)}</option>
                                      ))}
                                    </select>
                                  )}
                                  {item.effectiveDate && <span>Efektif: {formatDateReadable(item.effectiveDate)}</span>}
                                  {item.reason && <span>Alasan: {item.reason}</span>}
                                  {item.finalStatus && <span>Status: {item.finalStatus}</span>}
                                  {item.blockingReason && <span className="font-semibold text-red-600">{item.blockingReason}</span>}
                                </div>
                              ) : (
                                finalPeriodYearText(effectivePeriod)
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {finalOutcome === "withdrawn_early" ? (
                                item.projects?.length ? (
                                  <div className="grid gap-1">
                                    {item.projects.map((project) => {
                                      const projectId = String(project.id || "");
                                      if (!projectId) return null;
                                      return (
                                        <label key={projectId} className="flex items-start gap-2 rounded-[8px] border border-border bg-white px-2 py-1">
                                          <input
                                            type="checkbox"
                                            checked={selectedProjectIds.includes(projectId)}
                                            onChange={(event) => {
                                              setWithdrawalProjects((items) => {
                                                const current = items[key] || [];
                                                const next = event.target.checked
                                                  ? [...new Set([...current, projectId])]
                                                  : current.filter((value) => value !== projectId);
                                                return { ...items, [key]: next };
                                              });
                                            }}
                                          />
                                          <span>
                                            <b>{project.shortTitle || project.title || "Project"}</b>
                                            <span className="block text-[11px] text-muted-foreground">
                                              {[project.projectStatus || project.status, project.membershipStatus, project.role].filter(Boolean).join(" | ") || "Opsional sertifikat"}
                                            </span>
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ) : "Tidak ada project eligible"
                              ) : (
                                item.projects?.length ? (
                                  <div className="grid gap-1">
                                    <span>
                                      {projectNames.length} project{projectNames[0] ? `: ${projectNames[0]}${projectNames.length > 1 ? " +" + (projectNames.length - 1) : ""}` : ""}
                                    </span>
                                    {needsPrimaryProjectSelection(item) && primaryProjectId && (
                                      <span className="text-[11px] text-amber-700">
                                        Utama: {primaryProjectName || primaryProjectId}
                                      </span>
                                    )}
                                    {needsPrimaryProjectSelection(item) && !primaryProjectId && (
                                      <span className="text-[11px] text-amber-700">
                                        Project utama dipilih saat klik Daftarkan.
                                      </span>
                                    )}
                                  </div>
                                ) : "Tidak ada project"
                              )}
                            </TableCell>
                            <TableCell>
                              {item.existingCase ? (
                                <Badge variant={statusVariant(item.existingCase.status || "") as any}>{item.existingCase.status || "existing"}</Badge>
                              ) : (
                                <Badge variant="secondary">Belum terdaftar</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  <span>{currentEligible.total} kandidat</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={eligibleLoading || currentEligible.offset === 0} onClick={() => void loadEligible(Math.max(0, currentEligible.offset - currentEligible.limit))}>
                      <ChevronLeft size={14} />
                      Sebelumnya
                    </Button>
                    <Button variant="outline" size="sm" disabled={eligibleLoading || currentEligible.offset + currentEligible.limit >= currentEligible.total} onClick={() => void loadEligible(currentEligible.offset + currentEligible.limit)}>
                      Berikutnya
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Daftar Dokumen Akhir</p>
                <h2 className="text-sm font-black text-foreground">Case final activity dan dokumen terkait</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadFinalCases()} disabled={finalCasesLoading}>
                <RefreshCw size={14} className={finalCasesLoading ? "animate-spin" : ""} />
                Refresh
              </Button>
            </div>
            <form onSubmit={submitFinalCaseSearch} className="grid gap-2 border-b border-border p-4 md:grid-cols-[160px_160px_190px_1fr_auto]">
              <select value={finalCaseStatus} onChange={(event) => setFinalCaseStatus(event.target.value)} className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm">
                <option value="">Semua status</option>
                <option value="pending">Pending</option>
                <option value="draft_created">Draft Dibuat</option>
                <option value="issued">Terbit</option>
                <option value="revoked">Dicabut</option>
              </select>
              <select value={finalCaseActivityType} onChange={(event) => setFinalCaseActivityType(event.target.value)} className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm">
                <option value="">Semua tipe</option>
                <option value="Magang">Magang</option>
                <option value="Riset">Riset</option>
              </select>
              <select value={finalCasePurpose} onChange={(event) => setFinalCasePurpose(event.target.value)} className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm">
                <option value="">Semua dokumen</option>
                <option value="completion_letter">Surat Keterangan</option>
                <option value="certificate">Sertifikat</option>
              </select>
              <div className="flex items-center gap-2 rounded-[10px] border border-border bg-white px-3">
                <Search size={15} className="text-muted-foreground" />
                <input value={finalCaseSearch} onChange={(event) => setFinalCaseSearch(event.target.value)} placeholder="Cari nama atau NIM" className="h-10 w-full border-none bg-transparent text-sm outline-none" />
              </div>
              <Button type="submit" size="sm">Cari</Button>
            </form>
            {finalBatchSummaries.length > 0 && (
              <div className="border-b border-border bg-emerald-50/40 px-4 py-3 text-xs text-muted-foreground">
                <span className="font-black text-emerald-700">Ringkasan nomor halaman ini: </span>
                {finalBatchSummaries.slice(0, 4).map((batch) => `${batch.kind} ${batch.documentNumber} (${batch.count})`).join(" · ")}
                {finalBatchSummaries.length > 4 ? ` · +${finalBatchSummaries.length - 4} nomor lain` : ""}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Status Case</TableHead>
                  <TableHead>SKS</TableHead>
                  <TableHead>Sertifikat</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalCasesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <Loader2 className="mx-auto animate-spin" size={20} />
                    </TableCell>
                  </TableRow>
                ) : finalCases.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">Belum ada case final activity.</TableCell>
                  </TableRow>
                ) : (
                  finalCases.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-black text-foreground">{item.student.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{[item.student.nim, item.student.prodi].filter(Boolean).join(" | ") || "-"}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{finalPeriodYearText(item.period)}</TableCell>
                      <TableCell>{finalOutcomeLabel(item.outcome)}</TableCell>
                      <TableCell><Badge variant={statusVariant(item.status) as any}>{item.statusLabel || item.status}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {item.completionDocument ? item.completionDocument.status || "-" : "Belum ada draft"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {Number(item.certificateCount || item.projects?.length || 0) > 0
                          ? `${Number(item.certificateCount || item.projects?.length)} sertif`
                          : "Belum ada sertif"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button variant="ghost" size="sm" onClick={() => void openFinalCaseDetail(item.id)} aria-label="Detail case">
                            <Eye size={14} />
                            Detail
                          </Button>
                          {(item.completionDocument || Number(item.certificateCount || item.projects?.length || 0) > 0) && item.status !== "revoked" && (
                            <Button variant="ghost" size="sm" onClick={() => void openFinalCorrectionById(item.id)}>
                              Edit Data
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
              <span>{currentFinalCases.total} case</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={finalCasesLoading || currentFinalCases.offset === 0} onClick={() => void loadFinalCases(Math.max(0, currentFinalCases.offset - currentFinalCases.limit))}>
                  <ChevronLeft size={14} />
                  Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={finalCasesLoading || currentFinalCases.offset + currentFinalCases.limit >= currentFinalCases.total} onClick={() => void loadFinalCases(currentFinalCases.offset + currentFinalCases.limit)}>
                  Berikutnya
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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

  const renderTemplates = () => (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Template Dokumen</p>
            <h2 className="text-sm font-black text-foreground">Template PDF sertifikat dan surat keterangan</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadTemplates()} disabled={templatesLoading}>
            <RefreshCw size={14} className={templatesLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Template</TableHead>
              <TableHead>Aktivitas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Versi Aktif</TableHead>
              <TableHead>Diperbarui</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templatesLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </TableCell>
              </TableRow>
            ) : templates.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                  Belum ada template dokumen V1.
                </TableCell>
              </TableRow>
            ) : (
              templates.items.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <p className="font-black text-foreground">{templateLabels[template.templateKey] || template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.templateKey}</p>
                  </TableCell>
                  <TableCell>
                    {template.activityType}
                    <p className="text-xs text-muted-foreground">{templateOutcomeLabel(template.activityOutcome)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.status === "active" ? "default" : "secondary"}>{template.status}</Badge>
                  </TableCell>
                  <TableCell>{template.activeVersionNumber ? `v${template.activeVersionNumber}` : "Belum aktif"}</TableCell>
                  <TableCell>{formatDateReadable(template.updatedAt || template.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="ghost" size="sm" onClick={() => void openTemplateDetail(template.id)}>
                        <Eye size={14} />
                        Detail
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setTemplateUpload({ template, file: null })}>
                        <Upload size={14} />
                        Upload Versi
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!template.activeVersionId || previewingTemplateId === template.id}
                        onClick={() => void previewTemplate(template)}
                      >
                        {previewingTemplateId === template.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        Preview
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>{templates.pagination.total} template</span>
          <span>Layout/content preset tidak dikirim dari UI.</span>
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

        <div className="flex gap-2 overflow-x-auto rounded-[12px] border border-border bg-white p-1 shadow-sm w-fit max-w-full">
          {[
            { key: "requests", label: "Pengajuan Surat", enabled: true },
            { key: "final", label: "Dokumen Akhir", enabled: true },
            { key: "archive", label: "Arsip Resmi", enabled: true },
            { key: "templates", label: "Template", enabled: true },
            { key: "numbering", label: "Jenis & Penomoran", enabled: false },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={!tab.enabled}
              onClick={() => {
                if (!tab.enabled) return;
                setActiveTab(tab.key as "requests" | "final" | "archive" | "templates");
              }}
              className={`whitespace-nowrap rounded-[9px] border px-3 py-1.5 text-xs font-black ${
                activeTab === tab.key
                  ? "border-emerald-300 bg-emerald-50 text-foreground shadow-sm"
                  : tab.enabled
                    ? "border-transparent text-muted-foreground hover:bg-slate-50"
                    : "cursor-not-allowed border-transparent text-muted-foreground opacity-55"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "requests" ? renderRequests() : activeTab === "final" ? renderFinalActivity() : activeTab === "templates" ? renderTemplates() : renderArchive()}

        <Dialog
          open={Boolean(selectedTemplate) || templateDetailLoading}
          onOpenChange={(open) => {
            if (!open) setSelectedTemplate(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{templateDetailLoading ? "Memuat template..." : (selectedTemplate ? templateLabels[selectedTemplate.templateKey] || selectedTemplate.name : "Detail Template")}</DialogTitle>
              <DialogDescription>{selectedTemplate ? `${selectedTemplate.activityType} | ${templateOutcomeLabel(selectedTemplate.activityOutcome)}` : ""}</DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="grid gap-4 text-sm">
                <div className="grid gap-3 rounded-[12px] border border-border bg-slate-50 p-3 md:grid-cols-2">
                  <div>
                    <p><b>Nama:</b> {selectedTemplate.name}</p>
                    <p><b>Key:</b> {selectedTemplate.templateKey}</p>
                    <p><b>Definition:</b> {selectedTemplate.documentDefinitionId}</p>
                  </div>
                  <div>
                    <p><b>Status:</b> {selectedTemplate.status}</p>
                    <p><b>Versi aktif:</b> {selectedTemplate.activeVersionNumber ? `v${selectedTemplate.activeVersionNumber}` : "Belum aktif"}</p>
                    <p><b>Diperbarui:</b> {formatDateReadable(selectedTemplate.updatedAt || selectedTemplate.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setTemplateUpload({ template: selectedTemplate, file: null })}>
                    <Upload size={14} />
                    Upload Versi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!selectedTemplate.activeVersionId || previewingTemplateId === selectedTemplate.id}
                    onClick={() => void previewTemplate(selectedTemplate)}
                  >
                    {previewingTemplateId === selectedTemplate.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Preview Aktif
                  </Button>
                </div>

                <div className="rounded-[12px] border border-border bg-white">
                  <div className="border-b border-border px-4 py-3">
                    <p className="font-black text-foreground">Versi Template</p>
                    <p className="text-xs text-muted-foreground">Aktifkan versi yang akan digunakan untuk generate dokumen berikutnya.</p>
                  </div>
                  {selectedTemplate.versions?.length ? (
                    <div className="grid gap-2 p-3">
                      {selectedTemplate.versions.map((version) => {
                        const isActive = selectedTemplate.activeVersionId === version.id;
                        return (
                          <div key={version.id} className="rounded-[10px] border border-border bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-black text-foreground">
                                  Versi {version.versionNumber} {isActive ? <Badge>Aktif</Badge> : null}
                                </p>
                                <p className="text-xs text-muted-foreground break-all">{version.originalFilename || "-"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(version.fileSize)} | {formatDateReadable(version.createdAt)}
                                </p>
                                <p className="text-xs text-muted-foreground">Halaman: {templatePageLabel(version)}</p>
                              </div>
                              {!isActive && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={activatingTemplateVersionId === version.id}
                                  onClick={() => void activateTemplate(selectedTemplate, version)}
                                >
                                  {activatingTemplateVersionId === version.id ? <Loader2 size={14} className="animate-spin" /> : null}
                                  Aktifkan
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">Belum ada versi template. Upload PDF background terlebih dahulu.</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(templateUpload)} onOpenChange={(open) => { if (!open) resetTemplateUpload(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Versi Template</DialogTitle>
              <DialogDescription>{templateUpload ? templateLabels[templateUpload.template.templateKey] || templateUpload.template.name : ""}</DialogDescription>
            </DialogHeader>
            {templateUpload && (
              <div className="grid gap-4 text-sm">
                {templateUploadError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-semibold text-red-600">{templateUploadError}</p>}
                <div className="rounded-[10px] border border-border bg-slate-50 p-3 text-xs text-muted-foreground">
                  <p>Upload hanya mengirim <b>fileName</b> dan <b>fileDataUrl</b>. Layout, content, signer, dan placeholder ditentukan backend.</p>
                </div>
                <label className="grid gap-1 font-bold">
                  File PDF Template
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setTemplateUpload({ ...templateUpload, file: event.target.files?.[0] || null })}
                    className="rounded-[10px] border border-border p-2 font-normal"
                  />
                  {templateUpload.file && (
                    <span className="text-xs font-normal text-muted-foreground break-all">
                      {templateUpload.file.name} ({formatFileSize(templateUpload.file.size)})
                    </span>
                  )}
                </label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetTemplateUpload} disabled={Boolean(templateUploadingId)}>
                Batal
              </Button>
              <Button type="button" onClick={() => void submitTemplateUpload()} disabled={!templateUpload?.file || templateUploadingId === templateUpload?.template.id}>
                {templateUploadingId === templateUpload?.template.id ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Upload Versi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    <option value="terminated_early" disabled>Dihentikan lebih awal — Belum tersedia</option>
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

        <Dialog
          open={Boolean(selectedFinalCase) || finalCaseDetailLoading}
          onOpenChange={(open) => {
            if (!open) setSelectedFinalCase(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{finalCaseDetailLoading ? "Memuat detail..." : `Dokumen Akhir - ${selectedFinalCase?.student.name || "Mahasiswa"}`}</DialogTitle>
              <DialogDescription>{selectedFinalCase ? finalPeriodText(selectedFinalCase.period) : ""}</DialogDescription>
            </DialogHeader>
            {selectedFinalCase && (
              <div className="grid gap-4 text-sm">
                <div className="grid gap-3 rounded-[12px] border border-border bg-slate-50 p-3 md:grid-cols-2">
                  <div>
                    <p><b>Mahasiswa:</b> {selectedFinalCase.student.name || "-"}</p>
                    <p><b>NIM:</b> {selectedFinalCase.student.nim || "-"}</p>
                    <p><b>Prodi:</b> {selectedFinalCase.student.prodi || "-"}</p>
                    <p><b>Activity type:</b> {selectedFinalCase.activityType}</p>
                  </div>
                  <div>
                    <p><b>Status:</b> {selectedFinalCase.statusLabel || selectedFinalCase.status}</p>
                    <p><b>Outcome:</b> {finalOutcomeLabel(selectedFinalCase.outcome)}</p>
                    <p><b>Periode:</b> {finalPeriodText(selectedFinalCase.period)}</p>
                    <p><b>{selectedFinalCase.outcome === "withdrawn_early" ? "Tanggal efektif:" : "Selesai:"}</b> {formatDateReadable(selectedFinalCase.completedAt)}</p>
                  </div>
                </div>
                {(selectedFinalCase.completionDocument || selectedFinalCase.projects?.some((project) => project.certificateDocument)) && selectedFinalCase.status !== "revoked" && (
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={openFinalCorrection}>
                      Perbarui Data Dokumen
                    </Button>
                  </div>
                )}

                <div className="rounded-[12px] border border-border bg-white p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black text-foreground">{selectedFinalCase.outcome === "withdrawn_early" ? "Surat Keterangan Kegiatan Early Exit" : "Surat Keterangan Selesai"}</p>
                      {selectedFinalCase.completionDocument ? (
                        <div className="mt-2 text-sm">
                          <p><b>Judul:</b> {selectedFinalCase.completionDocument.title || "-"}</p>
                          <p><b>Nomor:</b> {selectedFinalCase.completionDocument.documentNumber || "-"}</p>
                          <p><b>Status:</b> {selectedFinalCase.completionDocument.status || "-"}</p>
                          <p><b>Versi:</b> {selectedFinalCase.completionDocument.currentVersionNumber || "-"}</p>
                          <p><b>Terbit:</b> {formatDateReadable(selectedFinalCase.completionDocument.issuedAt)}</p>
                          {renderFinalDocumentActions(
                            selectedFinalCase.completionDocument,
                            selectedFinalCase.capabilities.canPublishCompletion,
                            "completion",
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-muted-foreground">Belum ada draft SKS.</p>
                      )}
                    </div>
                    {(shouldShowCompletionGenerateSlot(selectedFinalCase) || selectedFinalCase.capabilities.canUploadCompletion) && (
                      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                        {shouldShowCompletionGenerateSlot(selectedFinalCase) && (
                          canGenerateCompletionLetter(selectedFinalCase) ? (
                            <Button
                              size="sm"
                              disabled={generatingCompletionCaseId === selectedFinalCase.id}
                              onClick={() => void generateCompletionLetterDraft(selectedFinalCase)}
                            >
                              {generatingCompletionCaseId === selectedFinalCase.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                              Generate Surat Keterangan Selesai
                            </Button>
                          ) : (
                            <p className="max-w-xs text-xs text-muted-foreground">
                              Template aktif Surat Keterangan Selesai Magang belum tersedia. Gunakan upload manual atau aktifkan template terlebih dahulu.
                            </p>
                          )
                        )}
                        {selectedFinalCase.capabilities.canUploadCompletion && (
                          <Button
                            size="sm"
                            variant={shouldShowCompletionGenerateSlot(selectedFinalCase) ? "outline" : "default"}
                            disabled={completionUploading}
                            onClick={() =>
                              setFinalDraftUpload({
                                type: "completion",
                                id: selectedFinalCase.id,
                                title: `${selectedFinalCase.outcome === "withdrawn_early" ? "Surat Keterangan Kegiatan" : "Surat Keterangan Selesai"} - ${selectedFinalCase.student.name || selectedFinalCase.student.nim || ""}`.trim(),
                                file: null,
                              })
                            }
                          >
                            {completionUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Upload Draft SKS
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border bg-white p-3">
                  <p className="mb-3 font-black text-foreground">Sertifikat Project</p>
                  {selectedFinalCase.projects?.length ? (
                    <div className="grid gap-3">
                      {selectedFinalCase.projects.map((project) => (
                        <div key={project.id} className="rounded-[10px] border border-border bg-slate-50 p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-black text-foreground">{project.project.title || project.project.shortTitle || "Project"}</p>
                              <p className="text-xs text-muted-foreground">{finalProjectText(project.project)}</p>
                              <p className="text-xs text-muted-foreground">
                                Certificate required: {project.certificateRequired ? "Ya" : "Tidak"} | Status: {project.certificateStatus}
                              </p>
                              {project.certificateDocument ? (
                                <div className="mt-2 text-sm">
                                  <p><b>Dokumen:</b> {project.certificateDocument.title || "-"}</p>
                                  <p><b>Nomor:</b> {project.certificateDocument.documentNumber || "-"}</p>
                                  <p><b>Status:</b> {project.certificateDocument.status || "-"}</p>
                                  {renderFinalDocumentActions(
                                    project.certificateDocument,
                                    project.capabilities.canPublishCertificate,
                                    "certificate",
                                    project.id,
                                  )}
                                </div>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">Belum ada draft sertifikat.</p>
                              )}
                            </div>
                            {project.capabilities.canUploadCertificate && (
                              <div className="flex flex-wrap gap-2">
                                {canGenerateCertificate(project) && (
                                  <Button
                                    size="sm"
                                    disabled={generatingCertificateId === project.id}
                                    onClick={() => void generateCertificateDraft(project)}
                                  >
                                    {generatingCertificateId === project.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                    Generate Sertifikat
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={certificateUploadingId === project.id}
                                  onClick={() =>
                                    setFinalDraftUpload({
                                      type: "certificate",
                                      id: project.id,
                                      title: `Sertifikat - ${selectedFinalCase.student.name || selectedFinalCase.student.nim || ""}`.trim(),
                                      file: null,
                                      projectTitle: project.project.title || project.project.shortTitle,
                                    })
                                  }
                                >
                                  {certificateUploadingId === project.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                  Upload PDF Manual
                                </Button>
                                {selectedFinalCase.outcome === "completed" && ["Magang", "Riset"].includes(selectedFinalCase.activityType) && project.certificateStatus === "pending" && !project.certificateDocument && (
                                  <p className="basis-full text-xs text-muted-foreground">
                                    Jika template aktif belum tersedia, gunakan upload manual atau aktifkan template terlebih dahulu.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Tidak ada project yang membutuhkan sertifikat.</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedFinalCase(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={finalCorrectionOpen} onOpenChange={setFinalCorrectionOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Perbarui Data Dokumen Akhir</DialogTitle>
              <DialogDescription>
                Data ini akan merender ulang PDF yang sudah ada. Nomor dokumen dan tanggal terbit/tanda tangan tetap dipertahankan.
              </DialogDescription>
            </DialogHeader>
            {finalCorrectionForm && (
              <div className="grid gap-4 text-sm">
                {finalCorrectionError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-semibold text-red-600">{finalCorrectionError}</p>}
                <div className="grid gap-3 rounded-[12px] border border-border bg-slate-50 p-3 md:grid-cols-3">
                  <label className="grid gap-1 font-bold">
                    Nama mahasiswa
                    <input
                      value={finalCorrectionForm.studentName}
                      onChange={(event) => setFinalCorrectionForm({ ...finalCorrectionForm, studentName: event.target.value })}
                      className="h-10 rounded-[10px] border border-border px-3 font-normal"
                      placeholder="Nama mahasiswa"
                    />
                  </label>
                  <label className="grid gap-1 font-bold">
                    NIM
                    <input
                      value={finalCorrectionForm.studentNim}
                      onChange={(event) => setFinalCorrectionForm({ ...finalCorrectionForm, studentNim: event.target.value })}
                      className="h-10 rounded-[10px] border border-border px-3 font-normal"
                      placeholder="NIM"
                    />
                  </label>
                  <label className="grid gap-1 font-bold">
                    Program studi
                    <input
                      value={finalCorrectionForm.studentProdi}
                      onChange={(event) => setFinalCorrectionForm({ ...finalCorrectionForm, studentProdi: event.target.value })}
                      className="h-10 rounded-[10px] border border-border px-3 font-normal"
                      placeholder="Program studi"
                    />
                  </label>
                </div>
                <div className="grid gap-3 rounded-[12px] border border-border bg-white p-3 md:grid-cols-3">
                  <label className="grid gap-1 font-bold">
                    Mulai periode
                    <input
                      type="date"
                      value={finalCorrectionForm.periodStart}
                      onChange={(event) => setFinalCorrectionForm({ ...finalCorrectionForm, periodStart: event.target.value })}
                      className="h-10 rounded-[10px] border border-border px-3 font-normal"
                    />
                  </label>
                  <label className="grid gap-1 font-bold">
                    Selesai periode
                    <input
                      type="date"
                      value={finalCorrectionForm.periodEnd}
                      onChange={(event) => setFinalCorrectionForm({ ...finalCorrectionForm, periodEnd: event.target.value })}
                      className="h-10 rounded-[10px] border border-border px-3 font-normal"
                    />
                  </label>
                  <label className="grid gap-1 font-bold">
                    Keterangan periode
                    <input
                      value={finalCorrectionForm.periodDescription}
                      onChange={(event) => setFinalCorrectionForm({ ...finalCorrectionForm, periodDescription: event.target.value })}
                      className="h-10 rounded-[10px] border border-border px-3 font-normal"
                      placeholder="Keterangan periode"
                    />
                  </label>
                </div>
                <div className="grid gap-3">
                  <p className="font-black text-foreground">Project dan posisi</p>
                  {finalCorrectionForm.projects.length ? (
                    finalCorrectionForm.projects.map((project) => (
                      <div key={project.id} className="grid gap-3 rounded-[12px] border border-border bg-slate-50 p-3 md:grid-cols-2">
                        <label className="grid gap-1 font-bold">
                          Judul project
                          <input
                            value={project.title}
                            onChange={(event) => updateFinalCorrectionProject(project.id, { title: event.target.value })}
                            className="h-10 rounded-[10px] border border-border px-3 font-normal"
                            placeholder="Judul project"
                          />
                        </label>
                        <label className="grid gap-1 font-bold">
                          Posisi/peran
                          <input
                            value={project.role}
                            onChange={(event) => updateFinalCorrectionProject(project.id, { role: event.target.value })}
                            className="h-10 rounded-[10px] border border-border px-3 font-normal"
                            placeholder="Contoh: Embedded System Engineer"
                          />
                        </label>
                        <label className="grid gap-1 font-bold">
                          Mulai project
                          <input
                            type="date"
                            value={project.joinedAt}
                            onChange={(event) => updateFinalCorrectionProject(project.id, { joinedAt: event.target.value })}
                            className="h-10 rounded-[10px] border border-border px-3 font-normal"
                          />
                        </label>
                        <label className="grid gap-1 font-bold">
                          Selesai project
                          <input
                            type="date"
                            value={project.completedAt}
                            onChange={(event) => updateFinalCorrectionProject(project.id, { completedAt: event.target.value })}
                            className="h-10 rounded-[10px] border border-border px-3 font-normal"
                          />
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-[12px] border border-border bg-slate-50 p-3 text-muted-foreground">
                      Tidak ada project pada dokumen ini.
                    </p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setFinalCorrectionOpen(false)} disabled={finalCorrectionSaving}>
                Batal
              </Button>
              <Button onClick={() => void submitFinalCorrection()} disabled={finalCorrectionSaving || !finalCorrectionForm}>
                {finalCorrectionSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                Simpan & Render Ulang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={primaryProjectDialogOpen} onOpenChange={setPrimaryProjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pilih Project Utama Magang</DialogTitle>
              <DialogDescription>
                Project utama dipakai untuk SKS dan Sertifikat Magang. Project lainnya tetap dibuatkan Sertifikat Riset.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 text-sm">
              {eligibleData.items
                .filter((item) => selectedEligible.includes(candidateKey(item)) && needsPrimaryProjectSelection(item))
                .map((item) => {
                  const key = candidateKey(item);
                  const selectedProjectId = selectedPrimaryProjectId(item);
                  return (
                    <div key={key} className="rounded-[12px] border border-amber-200 bg-amber-50/70 p-3">
                      <div className="mb-2">
                        <p className="font-black text-foreground">{item.student.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.student.nim, item.student.prodi, finalPeriodYearText(item.period || null)].filter(Boolean).join(" | ") || "-"}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {(item.projects || []).map((project) => {
                          const projectId = String(project.id || "");
                          if (!projectId) return null;
                          return (
                            <label key={projectId} className="flex cursor-pointer items-start gap-2 rounded-[10px] border border-border bg-white px-3 py-2">
                              <input
                                type="radio"
                                name={`primary-project-${key}`}
                                checked={selectedProjectId === projectId}
                                onChange={() => {
                                  setPrimaryProjects((items) => ({ ...items, [key]: projectId }));
                                  setRegisterSummary(null);
                                }}
                                className="mt-1"
                              />
                              <span>
                                <span className="block font-bold text-foreground">{project.shortTitle || project.title || "Project"}</span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {[project.role, project.membershipStatus || project.status, project.joinedAt && project.completedAt ? `${formatDateReadable(project.joinedAt)} - ${formatDateReadable(project.completedAt)}` : null]
                                    .filter(Boolean)
                                    .join(" | ") || "Project kandidat"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPrimaryProjectDialogOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  setPrimaryProjectDialogOpen(false);
                  void registerFinalCases();
                }}
                disabled={eligibleData.items
                  .filter((item) => selectedEligible.includes(candidateKey(item)) && needsPrimaryProjectSelection(item))
                  .some((item) => !selectedPrimaryProjectId(item))}
              >
                Lanjut Daftarkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(revokeDialog)} onOpenChange={(open) => { if (!open) { setRevokeDialog(null); setRevokeError(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cabut Dokumen</DialogTitle>
              <DialogDescription>
                Dokumen yang dicabut tidak lagi dapat dilihat atau diunduh mahasiswa. Nomor dokumen tetap tersimpan dan tidak dapat digunakan kembali.
              </DialogDescription>
            </DialogHeader>
            {revokeDialog && (
              <div className="grid gap-4 text-sm">
                {revokeError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-semibold text-red-600">{revokeError}</p>}
                <div className="rounded-[10px] border border-border bg-slate-50 p-3 text-xs">
                  <p><b>Dokumen:</b> {revokeDialog.document.title || "-"}</p>
                  <p><b>Nomor:</b> {revokeDialog.document.documentNumber || "-"}</p>
                  <p><b>Status:</b> {revokeDialog.document.status || "-"}</p>
                  <p><b>Terbit:</b> {formatDateReadable(revokeDialog.document.issuedAt)}</p>
                </div>
                <label className="grid gap-1 font-bold">
                  Alasan pencabutan
                  <textarea
                    value={revokeDialog.reason}
                    onChange={(event) => setRevokeDialog({ ...revokeDialog, reason: event.target.value })}
                    maxLength={2000}
                    className="min-h-28 rounded-[10px] border border-border px-3 py-2 font-normal"
                    placeholder="Tuliskan alasan pencabutan dokumen"
                  />
                </label>
                <label className="grid gap-1 font-bold">
                  Tanggal efektif pencabutan
                  <input
                    type="date"
                    value={revokeDialog.effectiveDate}
                    min={revokeDialog.document.issuedAt ? String(revokeDialog.document.issuedAt).slice(0, 10) : undefined}
                    max={todayIsoDate()}
                    onChange={(event) => setRevokeDialog({ ...revokeDialog, effectiveDate: event.target.value })}
                    className="h-10 rounded-[10px] border border-border px-3 font-normal"
                  />
                </label>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRevokeDialog(null); setRevokeError(""); }} disabled={Boolean(revokingId)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={() => void submitRevoke()} disabled={!revokeDialog || revokingId === revokeDialog.document.id}>
                {revokingId ? <Loader2 size={15} className="animate-spin" /> : null}
                Cabut Dokumen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(finalDraftUpload)} onOpenChange={(open) => { if (!open) resetFinalDraftUpload(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{finalDraftUpload?.type === "completion" ? "Upload Draft SKS" : "Upload Draft Sertifikat"}</DialogTitle>
              <DialogDescription>{finalDraftUpload?.projectTitle || "Unggah file PDF draft untuk dokumen akhir kegiatan."}</DialogDescription>
            </DialogHeader>
            {finalDraftUpload && (
              <div className="grid gap-4 text-sm">
                {finalDraftError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-semibold text-red-600">{finalDraftError}</p>}
                <label className="grid gap-1 font-bold">
                  Judul
                  <input
                    value={finalDraftUpload.title}
                    onChange={(event) => setFinalDraftUpload({ ...finalDraftUpload, title: event.target.value })}
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
                    onChange={(event) => setFinalDraftUpload({ ...finalDraftUpload, file: event.target.files?.[0] || null })}
                    className="rounded-[10px] border border-border p-2 font-normal"
                  />
                </label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetFinalDraftUpload} disabled={completionUploading || Boolean(certificateUploadingId)}>
                Batal
              </Button>
              <Button type="button" onClick={() => void submitFinalDraftUpload()} disabled={completionUploading || Boolean(certificateUploadingId)}>
                {completionUploading || certificateUploadingId ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Upload Draft
              </Button>
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
