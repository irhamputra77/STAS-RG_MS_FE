import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../../templates/Layout";
import { Badge } from "../../atoms/badge";
import { Button } from "../../atoms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../atoms/dialog";
import { Input } from "../../atoms/input";
import { Textarea } from "../../atoms/textarea";
import {
  apiGet,
  apiGetBlob,
  apiPatch,
  apiPost,
  buildQueryPath,
  downloadBlob,
  encodePathSegment,
} from "../../../lib/api";
import { formatDateReadable } from "../../../lib/date";
import { Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react";
import { useConfirmDialog } from "../../molecules/ConfirmDialog";

type DocumentItem = {
  id: string;
  title: string;
  documentNumber: string | null;
  status: string;
  statusLabel?: string;
  typeName: string;
  documentPurpose: string;
  createdAt?: string | null;
  issuedAt?: string | null;
  canDownload: boolean;
  participantContexts?: Array<{ projectName?: string | null; period?: string | null }>;
};

type DocumentListResponse = {
  items: DocumentItem[];
  pagination: { limit: number; offset: number; total: number };
};

type RequestDefinition = {
  id: string;
  name: string;
  typeCode?: string | null;
  typeName?: string | null;
  documentPurpose?: string | null;
  requiresProject?: boolean;
  requiresPeriod?: boolean;
};

type RequestPeriod = {
  activityType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

type RequestProject = {
  id?: string | null;
  legacyProjectId?: string | null;
  projectName?: string | null;
  title?: string | null;
  shortTitle?: string | null;
  name?: string | null;
  projectStatus?: string | null;
  membershipStatus?: string | null;
};

type RequestContext = {
  definition: RequestDefinition;
  student: {
    name?: string | null;
    nim?: string | null;
    prodi?: string | null;
    activityType?: string | null;
  };
  periods: RequestPeriod[];
  projects: RequestProject[];
  canSubmit: boolean;
  blockingReason?: string | null;
};

type RequestOfficialDocument = {
  id: string;
  title?: string | null;
  documentNumber?: string | null;
  status?: string | null;
  issuedAt?: string | null;
  canDownload: boolean;
};

type RequestItem = {
  id: string;
  definition: RequestDefinition;
  subject: string;
  status: string;
  statusLabel?: string;
  studentNote?: string | null;
  operatorNote?: string | null;
  activityType?: string | null;
  period?: RequestPeriod | null;
  project?: RequestProject | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  canEdit?: boolean;
  canCancel?: boolean;
  officialDocument?: RequestOfficialDocument | null;
};

type RequestListResponse = {
  items: RequestItem[];
  pagination: { limit: number; offset: number; total: number };
};

type DownloadableDocument = {
  id: string;
  canDownload: boolean;
};

const emptyDocumentList: DocumentListResponse = {
  items: [],
  pagination: { limit: 20, offset: 0, total: 0 },
};

const emptyRequestList: RequestListResponse = {
  items: [],
  pagination: { limit: 20, offset: 0, total: 0 },
};

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
  return project.projectName || project.title || project.shortTitle || project.name || "-";
};

const projectId = (project?: RequestProject | null) => {
  return project?.legacyProjectId || project?.id || "";
};

const safeErrorMessage = (err: any) => {
  if (err?.status === 403) return "Anda tidak memiliki akses untuk memproses permintaan surat.";
  if (err?.status === 404) return "Data pengajuan tidak tersedia.";
  if (err?.status === 409) {
    return err?.message || "Permintaan tidak dapat diproses karena status atau datanya telah berubah. Muat ulang dan periksa kembali.";
  }
  if (err?.status === 400) return err?.message || "Periksa kembali data pengajuan.";
  if (err?.status >= 500) return "Permintaan belum dapat diproses. Coba lagi nanti.";
  return err?.message || "Gagal memproses permintaan.";
};

const periodMatches = (left?: RequestPeriod | null, right?: RequestPeriod | null) => {
  if (!left || !right) return false;
  return (
    left.activityType === right.activityType &&
    left.startDate === right.startDate &&
    (left.endDate || null) === (right.endDate || null)
  );
};

export default function DocumentCenter() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<"documents" | "requests">("documents");
  const [documents, setDocuments] = useState<DocumentListResponse>(emptyDocumentList);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [requests, setRequests] = useState<RequestListResponse>(emptyRequestList);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [documentDetailLoading, setDocumentDetailLoading] = useState(false);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [definitions, setDefinitions] = useState<RequestDefinition[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [requestContext, setRequestContext] = useState<RequestContext | null>(null);
  const [formDefinitionId, setFormDefinitionId] = useState("");
  const [subject, setSubject] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [formError, setFormError] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);
  const [editContext, setEditContext] = useState<RequestContext | null>(null);
  const [editContextLoading, setEditContextLoading] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editStudentNote, setEditStudentNote] = useState("");
  const [editPeriodIndex, setEditPeriodIndex] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editError, setEditError] = useState("");
  const [updatingRequest, setUpdatingRequest] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  const selectedDefinition = useMemo(
    () => definitions.find((definition) => definition.id === formDefinitionId) || requestContext?.definition || null,
    [definitions, formDefinitionId, requestContext],
  );
  const availableProjects = requestContext?.projects || [];
  const projectsWithId = availableProjects.filter((project) => projectId(project));
  const editProjects = editContext?.projects || [];
  const editProjectsWithId = editProjects.filter((project) => projectId(project));

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    setError("");
    try {
      setDocuments(
        await apiGet<DocumentListResponse>(
          buildQueryPath("/document-center/my/documents", { limit: 20, offset: 0 }),
        ),
      );
    } catch (err: any) {
      setError(err?.message || "Gagal memuat dokumen.");
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    setError("");
    try {
      setRequests(
        await apiGet<RequestListResponse>(
          buildQueryPath("/document-center/my/requests", { limit: 20, offset: 0 }),
        ),
      );
      setRequestsLoaded(true);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat permintaan surat.");
    } finally {
      setRequestsLoading(false);
    }
  };

  const resetRequestForm = () => {
    setDefinitions([]);
    setRequestContext(null);
    setFormDefinitionId("");
    setSubject("");
    setStudentNote("");
    setSelectedPeriodIndex("");
    setSelectedProjectId("");
    setFormError("");
    setDefinitionsLoading(false);
    setContextLoading(false);
    setSubmittingRequest(false);
  };

  const resetEditForm = () => {
    setEditingRequest(null);
    setEditContext(null);
    setEditSubject("");
    setEditStudentNote("");
    setEditPeriodIndex("");
    setEditProjectId("");
    setEditError("");
    setEditContextLoading(false);
    setUpdatingRequest(false);
  };

  const loadRequestContext = async (definitionId: string) => {
    if (!definitionId) {
      setRequestContext(null);
      return;
    }

    setContextLoading(true);
    setFormError("");
    try {
      const context = await apiGet<RequestContext>(
        buildQueryPath("/document-center/my/request-context", { definitionId }),
      );
      setRequestContext(context);
      setSelectedPeriodIndex("");
      setSelectedProjectId("");
    } catch (err: any) {
      setRequestContext(null);
      setFormError(safeErrorMessage(err));
    } finally {
      setContextLoading(false);
    }
  };

  const refreshSelectedRequest = async (id: string) => {
    try {
      const detail = await apiGet<RequestItem>(`/document-center/my/requests/${encodePathSegment(id)}`);
      setSelectedRequest(detail);
      return detail;
    } catch (err: any) {
      if (err?.status === 404) setSelectedRequest(null);
      throw err;
    }
  };

  const openRequestForm = async () => {
    resetRequestForm();
    setRequestFormOpen(true);
    setDefinitionsLoading(true);
    try {
      const response = await apiGet<{ items: RequestDefinition[] }>("/document-center/my/request-definitions");
      const items = response.items || [];
      setDefinitions(items);
      if (items.length === 1) {
        setFormDefinitionId(items[0].id);
        await loadRequestContext(items[0].id);
      }
    } catch (err: any) {
      setFormError(safeErrorMessage(err));
    } finally {
      setDefinitionsLoading(false);
    }
  };

  const openEditRequest = async (request: RequestItem) => {
    setEditOpen(true);
    setEditContextLoading(true);
    setEditError("");
    setEditingRequest(null);
    setEditContext(null);
    try {
      const detail = await apiGet<RequestItem>(
        `/document-center/my/requests/${encodePathSegment(request.id)}`,
      );
      setSelectedRequest(detail);
      if (!detail.canEdit) {
        setEditError("Permintaan ini tidak dapat diperbaiki lagi.");
        await loadRequests();
        return;
      }

      const context = await apiGet<RequestContext>(
        buildQueryPath("/document-center/my/request-context", { definitionId: detail.definition.id }),
      );
      setEditingRequest(detail);
      setEditContext(context);
      setEditSubject(detail.subject || "");
      setEditStudentNote(detail.studentNote || "");
      setEditPeriodIndex("");
      setEditProjectId("");

      if (context.periods.length > 1 && detail.period) {
        const matchIndex = context.periods.findIndex((period) => periodMatches(period, detail.period));
        setEditPeriodIndex(matchIndex >= 0 ? String(matchIndex) : "");
      }

      if (context.definition.requiresProject && detail.project) {
        const currentProjectId = projectId(detail.project);
        const match = context.projects.find((project) => projectId(project) === currentProjectId);
        setEditProjectId(match ? projectId(match) : "");
      }
    } catch (err: any) {
      setEditError(safeErrorMessage(err));
      if (err?.status === 404) {
        setEditOpen(false);
        resetEditForm();
        setSelectedRequest(null);
        await loadRequests();
      }
    } finally {
      setEditContextLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (activeTab === "requests" && !requestsLoaded) {
      void loadRequests();
    }
  }, [activeTab, requestsLoaded]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openDocumentDetail = async (id: string) => {
    setDocumentDetailLoading(true);
    setError("");
    try {
      setSelectedDocument(
        await apiGet<DocumentItem>(`/document-center/my/documents/${encodePathSegment(id)}`),
      );
    } catch (err: any) {
      setError(err?.message || "Gagal memuat detail dokumen.");
    } finally {
      setDocumentDetailLoading(false);
    }
  };

  const openRequestDetail = async (id: string) => {
    setRequestDetailLoading(true);
    setError("");
    try {
      setSelectedRequest(
        await apiGet<RequestItem>(`/document-center/my/requests/${encodePathSegment(id)}`),
      );
    } catch (err: any) {
      setError(err?.message || "Gagal memuat detail permintaan surat.");
    } finally {
      setRequestDetailLoading(false);
    }
  };

  const download = async (document: DownloadableDocument) => {
    if (!document.canDownload || downloadingId) return;

    setDownloadingId(document.id);
    setError("");
    try {
      const file = await apiGetBlob(
        `/document-center/documents/${encodePathSegment(document.id)}/download`,
      );
      downloadBlob(file.blob, file.fileName || `dokumen-${document.id}.pdf`);
    } catch (err: any) {
      setError(err?.message || "Gagal mengunduh dokumen.");
    } finally {
      setDownloadingId(null);
    }
  };

  const refresh = () => {
    if (activeTab === "requests") {
      void loadRequests();
      return;
    }
    void loadDocuments();
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRequest) return;

    const normalizedSubject = subject.trim();
    const normalizedNote = studentNote.trim();
    if (!formDefinitionId || !selectedDefinition || !requestContext) {
      setFormError("Pilih jenis surat terlebih dahulu.");
      return;
    }
    if (!normalizedSubject || normalizedSubject.length > 255) {
      setFormError("Subject wajib diisi dan maksimal 255 karakter.");
      return;
    }
    if (normalizedNote.length > 2000) {
      setFormError("Catatan mahasiswa maksimal 2.000 karakter.");
      return;
    }
    if (!requestContext.canSubmit) {
      setFormError(requestContext.blockingReason || "Permintaan belum dapat diajukan.");
      return;
    }

    const payload: {
      documentDefinitionId: string;
      subject: string;
      studentNote?: string;
      period?: { activityType: string; startDate: string; endDate: string };
      legacyProjectId?: string;
    } = {
      documentDefinitionId: formDefinitionId,
      subject: normalizedSubject,
    };

    if (normalizedNote) payload.studentNote = normalizedNote;

    if ((requestContext.periods || []).length > 1) {
      const selected = requestContext.periods[Number(selectedPeriodIndex)];
      if (!selected || !selected.activityType || !selected.startDate || !selected.endDate) {
        setFormError("Pilih periode kegiatan yang valid.");
        return;
      }
      payload.period = {
        activityType: selected.activityType,
        startDate: selected.startDate,
        endDate: selected.endDate,
      };
    }

    if (selectedDefinition.requiresProject) {
      if (!projectsWithId.length) {
        setFormError("Data proyek belum lengkap. Hubungi operator.");
        return;
      }
      if (!selectedProjectId) {
        setFormError("Pilih proyek terlebih dahulu.");
        return;
      }
      payload.legacyProjectId = selectedProjectId;
    }

    setSubmittingRequest(true);
    setFormError("");
    try {
      await apiPost<RequestItem>("/document-center/my/requests", payload);
      setRequestFormOpen(false);
      resetRequestForm();
      setActiveTab("requests");
      await loadRequests();
      setToast("Permintaan surat berhasil diajukan.");
    } catch (err: any) {
      setFormError(safeErrorMessage(err));
    } finally {
      setSubmittingRequest(false);
    }
  };

  const submitEditRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (updatingRequest || !editingRequest || !editContext) return;

    const normalizedSubject = editSubject.trim();
    const normalizedNote = editStudentNote.trim();
    if (!normalizedSubject || normalizedSubject.length > 255) {
      setEditError("Subject wajib diisi dan maksimal 255 karakter.");
      return;
    }
    if (normalizedNote.length > 2000) {
      setEditError("Catatan mahasiswa maksimal 2.000 karakter.");
      return;
    }
    if (!editContext.canSubmit) {
      setEditError(editContext.blockingReason || "Permintaan belum dapat diperbaiki.");
      return;
    }

    const payload: {
      subject: string;
      studentNote?: string;
      period?: { activityType: string; startDate: string; endDate: string };
      legacyProjectId?: string;
    } = {
      subject: normalizedSubject,
    };

    if (normalizedNote) payload.studentNote = normalizedNote;

    if (editContext.periods.length > 1) {
      const selected = editContext.periods[Number(editPeriodIndex)];
      if (!selected || !selected.activityType || !selected.startDate || !selected.endDate) {
        setEditError("Pilih periode kegiatan yang valid.");
        return;
      }
      payload.period = {
        activityType: selected.activityType,
        startDate: selected.startDate,
        endDate: selected.endDate,
      };
    }

    if (editContext.definition.requiresProject) {
      if (!editProjectsWithId.length) {
        setEditError("Data proyek belum lengkap. Hubungi operator.");
        return;
      }
      if (!editProjectId) {
        setEditError("Pilih proyek terlebih dahulu.");
        return;
      }
      payload.legacyProjectId = editProjectId;
    }

    setUpdatingRequest(true);
    setEditError("");
    try {
      await apiPatch<RequestItem>(
        `/document-center/my/requests/${encodePathSegment(editingRequest.id)}`,
        payload,
      );
      const editedId = editingRequest.id;
      setEditOpen(false);
      resetEditForm();
      await loadRequests();
      if (selectedRequest?.id === editedId) await refreshSelectedRequest(editedId);
      setToast("Perbaikan permintaan berhasil dikirim.");
    } catch (err: any) {
      setEditError(safeErrorMessage(err));
      if (err?.status === 404) {
        setEditOpen(false);
        resetEditForm();
        setSelectedRequest(null);
        await loadRequests();
      } else if (err?.status === 409) {
        await loadRequests();
        if (selectedRequest?.id === editingRequest.id) {
          await refreshSelectedRequest(editingRequest.id).catch(() => {});
        }
      }
    } finally {
      setUpdatingRequest(false);
    }
  };

  const cancelRequest = async (request: RequestItem) => {
    if (!request.canCancel || cancellingRequestId) return;

    const confirmed = await confirm({
      title: "Batalkan permintaan surat ini?",
      description: "Permintaan yang dibatalkan tidak dapat dilanjutkan kembali.",
      confirmLabel: "Batalkan Permintaan",
      cancelLabel: "Kembali",
      variant: "danger",
    });
    if (!confirmed) return;

    setCancellingRequestId(request.id);
    setError("");
    try {
      await apiPost(`/document-center/my/requests/${encodePathSegment(request.id)}/cancel`);
      await loadRequests();
      if (selectedRequest?.id === request.id) await refreshSelectedRequest(request.id);
      setToast("Permintaan surat berhasil dibatalkan.");
    } catch (err: any) {
      setError(safeErrorMessage(err));
      if (err?.status === 404) {
        setSelectedRequest(null);
        await loadRequests();
      } else if (err?.status === 409) {
        await loadRequests();
        if (selectedRequest?.id === request.id) await refreshSelectedRequest(request.id).catch(() => {});
      }
    } finally {
      setCancellingRequestId(null);
    }
  };

  return (
    <Layout title="Pusat Dokumen Saya">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-5 pb-6">
        {confirmDialog}

        {toast && (
          <div className="fixed right-5 top-5 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
            {toast}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Mahasiswa
            </p>
            <h1 className="text-2xl font-black text-foreground">Pusat Dokumen Saya</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={documentsLoading || requestsLoading}
          >
            <RefreshCw
              size={14}
              className={documentsLoading || requestsLoading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "documents" ? "default" : "outline"}
              onClick={() => setActiveTab("documents")}
            >
              Dokumen Saya
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "requests" ? "default" : "outline"}
              onClick={() => setActiveTab("requests")}
            >
              Permintaan Surat
            </Button>
          </div>
          {activeTab === "requests" && (
            <Button type="button" size="sm" onClick={() => void openRequestForm()}>
              Ajukan Permintaan
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {activeTab === "documents" ? (
          <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
            {documentsLoading ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : documents.items.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <FileText size={24} />
                <p className="text-sm font-semibold">Belum ada dokumen tersedia.</p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {documents.items.map((item) => (
                  <div key={item.id} className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                        <FileText size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.typeName}</p>
                        <div className="mt-2">
                          <Badge variant="default">{item.statusLabel || item.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs font-mono text-muted-foreground">
                          {item.documentNumber || "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Terbit: {formatDateReadable(item.issuedAt)}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void openDocumentDetail(item.id)}
                          >
                            <Eye size={14} />
                            Lihat
                          </Button>
                          {item.canDownload && (
                            <Button
                              size="sm"
                              disabled={downloadingId === item.id}
                              onClick={() => void download(item)}
                            >
                              {downloadingId === item.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              Unduh
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
            {requestsLoading ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : requests.items.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <FileText size={24} />
                <p className="text-sm font-semibold">Belum ada permintaan surat.</p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {requests.items.map((item) => (
                  <div key={item.id} className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
                        <FileText size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-foreground">{item.definition.name}</p>
                        <p className="text-xs text-muted-foreground">{item.subject}</p>
                        <div className="mt-2">
                          <Badge variant="outline">{item.statusLabel || item.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {periodText(item.period, item.activityType)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Diajukan: {formatDateReadable(item.submittedAt || item.createdAt)}
                        </p>
                        {item.operatorNote && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            Catatan operator: {item.operatorNote}
                          </p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void openRequestDetail(item.id)}
                          >
                            <Eye size={14} />
                            Detail
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Dialog
          open={requestFormOpen}
          onOpenChange={(open) => {
            setRequestFormOpen(open);
            if (!open) resetRequestForm();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajukan Permintaan Surat</DialogTitle>
              <DialogDescription>Pengajuan akan diteruskan ke operator untuk ditinjau.</DialogDescription>
            </DialogHeader>

            <form className="grid gap-4" onSubmit={submitRequest}>
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {formError}
                </div>
              )}

              <div className="grid gap-1.5">
                <label className="text-xs font-black text-foreground">Jenis Surat</label>
                <select
                  value={formDefinitionId}
                  disabled={definitionsLoading || submittingRequest}
                  onChange={(event) => {
                    const definitionId = event.target.value;
                    setFormDefinitionId(definitionId);
                    void loadRequestContext(definitionId);
                  }}
                  className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0AB600]/20"
                >
                  <option value="">
                    {definitionsLoading ? "Memuat jenis surat..." : "Pilih jenis surat"}
                  </option>
                  {definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.name}
                    </option>
                  ))}
                </select>
              </div>

              {contextLoading && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  Memuat konteks mahasiswa...
                </div>
              )}

              {requestContext && (
                <div className="rounded-[12px] border border-border bg-slate-50 p-3 text-sm">
                  <p>
                    <b>Nama:</b> {requestContext.student.name || "-"}
                  </p>
                  <p>
                    <b>NIM:</b> {requestContext.student.nim || "-"}
                  </p>
                  <p>
                    <b>Prodi:</b> {requestContext.student.prodi || "-"}
                  </p>
                  <p>
                    <b>Activity type:</b> {requestContext.student.activityType || "-"}
                  </p>
                </div>
              )}

              {requestContext?.blockingReason && !requestContext.canSubmit && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {requestContext.blockingReason}
                </div>
              )}

              <div className="grid gap-1.5">
                <label className="text-xs font-black text-foreground">Subject / Keperluan</label>
                <Input
                  value={subject}
                  maxLength={255}
                  disabled={submittingRequest}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Tuliskan keperluan surat"
                />
                <p className="text-[11px] text-muted-foreground">{subject.trim().length}/255 karakter</p>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-black text-foreground">Catatan Mahasiswa</label>
                <Textarea
                  rows={3}
                  value={studentNote}
                  maxLength={2000}
                  disabled={submittingRequest}
                  onChange={(event) => setStudentNote(event.target.value)}
                  placeholder="Catatan opsional untuk operator"
                />
                <p className="text-[11px] text-muted-foreground">{studentNote.trim().length}/2000 karakter</p>
              </div>

              {requestContext && requestContext.periods.length === 1 && (
                <div className="rounded-[12px] border border-border bg-slate-50 p-3 text-sm">
                  <p className="text-xs font-black text-foreground">Periode</p>
                  <p className="text-muted-foreground">{periodText(requestContext.periods[0])}</p>
                </div>
              )}

              {requestContext && requestContext.periods.length > 1 && (
                <div className="grid gap-1.5">
                  <label className="text-xs font-black text-foreground">Periode</label>
                  <select
                    value={selectedPeriodIndex}
                    disabled={submittingRequest}
                    onChange={(event) => setSelectedPeriodIndex(event.target.value)}
                    className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0AB600]/20"
                  >
                    <option value="">Pilih periode</option>
                    {requestContext.periods.map((period, index) => (
                      <option key={`${period.activityType}-${period.startDate}-${period.endDate}-${index}`} value={index}>
                        {periodText(period)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDefinition?.requiresProject && (
                <div className="grid gap-1.5">
                  <label className="text-xs font-black text-foreground">Project</label>
                  <select
                    value={selectedProjectId}
                    disabled={submittingRequest || projectsWithId.length === 0}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0AB600]/20"
                  >
                    <option value="">
                      {projectsWithId.length === 0 ? "Data project belum tersedia" : "Pilih project"}
                    </option>
                    {projectsWithId.map((project) => (
                      <option key={projectId(project)} value={projectId(project)}>
                        {projectText(project)}
                      </option>
                    ))}
                  </select>
                  {availableProjects.length > 0 && projectsWithId.length === 0 && (
                    <p className="text-[11px] font-semibold text-amber-700">
                      Data project dari server belum memuat ID yang dapat dikirim.
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingRequest}
                  onClick={() => setRequestFormOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={
                    definitionsLoading ||
                    contextLoading ||
                    submittingRequest ||
                    !requestContext ||
                    requestContext.canSubmit === false
                  }
                >
                  {submittingRequest ? <Loader2 size={15} className="animate-spin" /> : null}
                  Ajukan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(selectedDocument) || documentDetailLoading}
          onOpenChange={(open) => {
            if (!open) setSelectedDocument(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {documentDetailLoading ? "Memuat detail..." : selectedDocument?.title || "Detail Dokumen"}
              </DialogTitle>
              <DialogDescription>{selectedDocument?.typeName || ""}</DialogDescription>
            </DialogHeader>
            {selectedDocument && (
              <div className="rounded-[12px] border border-border bg-slate-50 p-3 text-sm">
                <p>
                  <b>Status:</b> {selectedDocument.statusLabel || selectedDocument.status}
                </p>
                <p>
                  <b>Nomor:</b> {selectedDocument.documentNumber || "-"}
                </p>
                <p>
                  <b>Terbit:</b> {formatDateReadable(selectedDocument.issuedAt)}
                </p>
              </div>
            )}
            <DialogFooter>
              {selectedDocument?.canDownload && (
                <Button
                  onClick={() => void download(selectedDocument)}
                  disabled={downloadingId === selectedDocument.id}
                >
                  <Download size={15} />
                  Unduh
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) resetEditForm();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Perbaiki Permintaan Surat</DialogTitle>
              <DialogDescription>
                {editingRequest?.definition.name || "Memuat data permintaan..."}
              </DialogDescription>
            </DialogHeader>

            <form className="grid gap-4" onSubmit={submitEditRequest}>
              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {editError}
                </div>
              )}

              {editContextLoading && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  Memuat detail perbaikan...
                </div>
              )}

              {editingRequest && (
                <div className="rounded-[12px] border border-border bg-slate-50 p-3 text-sm">
                  <p>
                    <b>Jenis:</b> {editingRequest.definition.name}
                  </p>
                  <p>
                    <b>Status:</b> {editingRequest.statusLabel || editingRequest.status}
                  </p>
                  {editingRequest.operatorNote && (
                    <p>
                      <b>Catatan operator:</b> {editingRequest.operatorNote}
                    </p>
                  )}
                </div>
              )}

              {editContext && (
                <div className="rounded-[12px] border border-border bg-slate-50 p-3 text-sm">
                  <p>
                    <b>Nama:</b> {editContext.student.name || "-"}
                  </p>
                  <p>
                    <b>NIM:</b> {editContext.student.nim || "-"}
                  </p>
                  <p>
                    <b>Prodi:</b> {editContext.student.prodi || "-"}
                  </p>
                  <p>
                    <b>Activity type:</b> {editContext.student.activityType || "-"}
                  </p>
                </div>
              )}

              {editContext?.blockingReason && !editContext.canSubmit && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {editContext.blockingReason}
                </div>
              )}

              <div className="grid gap-1.5">
                <label className="text-xs font-black text-foreground">Subject / Keperluan</label>
                <Input
                  value={editSubject}
                  maxLength={255}
                  disabled={updatingRequest}
                  onChange={(event) => setEditSubject(event.target.value)}
                  placeholder="Tuliskan keperluan surat"
                />
                <p className="text-[11px] text-muted-foreground">{editSubject.trim().length}/255 karakter</p>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-black text-foreground">Catatan Mahasiswa</label>
                <Textarea
                  rows={3}
                  value={editStudentNote}
                  maxLength={2000}
                  disabled={updatingRequest}
                  onChange={(event) => setEditStudentNote(event.target.value)}
                  placeholder="Catatan opsional untuk operator"
                />
                <p className="text-[11px] text-muted-foreground">{editStudentNote.trim().length}/2000 karakter</p>
              </div>

              {editContext && editContext.periods.length === 1 && (
                <div className="rounded-[12px] border border-border bg-slate-50 p-3 text-sm">
                  <p className="text-xs font-black text-foreground">Periode</p>
                  <p className="text-muted-foreground">{periodText(editContext.periods[0])}</p>
                </div>
              )}

              {editContext && editContext.periods.length > 1 && (
                <div className="grid gap-1.5">
                  <label className="text-xs font-black text-foreground">Periode</label>
                  <select
                    value={editPeriodIndex}
                    disabled={updatingRequest}
                    onChange={(event) => setEditPeriodIndex(event.target.value)}
                    className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0AB600]/20"
                  >
                    <option value="">Pilih periode</option>
                    {editContext.periods.map((period, index) => (
                      <option key={`${period.activityType}-${period.startDate}-${period.endDate}-${index}`} value={index}>
                        {periodText(period)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editContext?.definition.requiresProject && (
                <div className="grid gap-1.5">
                  <label className="text-xs font-black text-foreground">Project</label>
                  <select
                    value={editProjectId}
                    disabled={updatingRequest || editProjectsWithId.length === 0}
                    onChange={(event) => setEditProjectId(event.target.value)}
                    className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0AB600]/20"
                  >
                    <option value="">
                      {editProjectsWithId.length === 0 ? "Data project belum tersedia" : "Pilih project"}
                    </option>
                    {editProjectsWithId.map((project) => (
                      <option key={projectId(project)} value={projectId(project)}>
                        {projectText(project)}
                      </option>
                    ))}
                  </select>
                  {editProjects.length > 0 && editProjectsWithId.length === 0 && (
                    <p className="text-[11px] font-semibold text-amber-700">
                      Data project dari server belum memuat ID yang dapat dikirim.
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={updatingRequest}
                  onClick={() => setEditOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={
                    editContextLoading ||
                    updatingRequest ||
                    !editingRequest ||
                    !editContext ||
                    editContext.canSubmit === false
                  }
                >
                  {updatingRequest ? <Loader2 size={15} className="animate-spin" /> : null}
                  Kirim Perbaikan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={(Boolean(selectedRequest) && !editOpen) || requestDetailLoading}
          onOpenChange={(open) => {
            if (!open) setSelectedRequest(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {requestDetailLoading
                  ? "Memuat detail..."
                  : selectedRequest?.definition.name || "Detail Permintaan Surat"}
              </DialogTitle>
              <DialogDescription>{selectedRequest?.subject || ""}</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="grid gap-3 text-sm">
                <div className="rounded-[12px] border border-border bg-slate-50 p-3">
                  <p>
                    <b>Status:</b> {selectedRequest.statusLabel || selectedRequest.status}
                  </p>
                  <p>
                    <b>Jenis:</b> {selectedRequest.definition.name}
                  </p>
                  <p>
                    <b>Subjek:</b> {selectedRequest.subject}
                  </p>
                  {selectedRequest.studentNote && (
                    <p>
                      <b>Catatan mahasiswa:</b> {selectedRequest.studentNote}
                    </p>
                  )}
                  {selectedRequest.operatorNote && (
                    <p>
                      <b>Catatan operator:</b> {selectedRequest.operatorNote}
                    </p>
                  )}
                </div>

                <div className="rounded-[12px] border border-border bg-slate-50 p-3">
                  <p>
                    <b>Periode:</b> {periodText(selectedRequest.period, selectedRequest.activityType)}
                  </p>
                  <p>
                    <b>Proyek:</b> {projectText(selectedRequest.project)}
                  </p>
                  <p>
                    <b>Diajukan:</b>{" "}
                    {formatDateReadable(selectedRequest.submittedAt || selectedRequest.createdAt)}
                  </p>
                  <p>
                    <b>Direview:</b> {formatDateReadable(selectedRequest.reviewedAt)}
                  </p>
                  <p>
                    <b>Dibatalkan:</b> {formatDateReadable(selectedRequest.cancelledAt)}
                  </p>
                  <p>
                    <b>Selesai:</b> {formatDateReadable(selectedRequest.completedAt)}
                  </p>
                </div>

                {selectedRequest.officialDocument && (
                  <div className="rounded-[12px] border border-border bg-slate-50 p-3">
                    <p className="font-black">Dokumen Resmi</p>
                    <p>
                      <b>Judul:</b> {selectedRequest.officialDocument.title || "-"}
                    </p>
                    <p>
                      <b>Nomor:</b> {selectedRequest.officialDocument.documentNumber || "-"}
                    </p>
                    <p>
                      <b>Terbit:</b> {formatDateReadable(selectedRequest.officialDocument.issuedAt)}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedRequest?.canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={requestDetailLoading || editContextLoading}
                  onClick={() => void openEditRequest(selectedRequest)}
                >
                  Perbaiki
                </Button>
              )}
              {selectedRequest?.canCancel && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={cancellingRequestId === selectedRequest.id}
                  onClick={() => void cancelRequest(selectedRequest)}
                >
                  {cancellingRequestId === selectedRequest.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : null}
                  Batalkan
                </Button>
              )}
              {selectedRequest?.officialDocument?.canDownload && (
                <Button
                  onClick={() => void download(selectedRequest.officialDocument!)}
                  disabled={downloadingId === selectedRequest.officialDocument.id}
                >
                  {downloadingId === selectedRequest.officialDocument.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  Unduh Dokumen
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
