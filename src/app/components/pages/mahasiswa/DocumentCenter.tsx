import React, { useEffect, useState } from "react";
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
import {
  apiGet,
  apiGetBlob,
  buildQueryPath,
  downloadBlob,
  encodePathSegment,
} from "../../../lib/api";
import { formatDateReadable } from "../../../lib/date";
import { Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react";

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
  documentPurpose?: string | null;
};

type RequestPeriod = {
  activityType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

type RequestProject = {
  projectName?: string | null;
  title?: string | null;
  name?: string | null;
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
  return project.projectName || project.title || project.name || "-";
};

export default function DocumentCenter() {
  const [activeTab, setActiveTab] = useState<"documents" | "requests">("documents");
  const [documents, setDocuments] = useState<DocumentListResponse>(emptyDocumentList);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [requests, setRequests] = useState<RequestListResponse>(emptyRequestList);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [documentDetailLoading, setDocumentDetailLoading] = useState(false);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (activeTab === "requests" && !requestsLoaded) {
      void loadRequests();
    }
  }, [activeTab, requestsLoaded]);

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

  return (
    <Layout title="Pusat Dokumen Saya">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-5 pb-6">
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
          open={Boolean(selectedRequest) || requestDetailLoading}
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
