import React, { useEffect, useState } from "react";
import { OperatorLayout } from "../../templates/OperatorLayout";
import { Badge } from "../../atoms/badge";
import { Button } from "../../atoms/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../atoms/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../atoms/table";
import { apiGet, apiGetBlob, buildQueryPath, downloadBlob, encodePathSegment } from "../../../lib/api";
import { formatDateReadable } from "../../../lib/date";
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Loader2, RefreshCw, Search } from "lucide-react";

type Participant = { name?: string; nim?: string; projectName?: string | null; period?: string | null; participantRole?: string | null };
type DocumentItem = { id: string; title: string; documentNumber: string | null; status: string; statusLabel?: string; documentPurpose: string; typeCode: string; typeName: string; activityOutcome?: string | null; createdAt?: string | null; issuedAt?: string | null; canDownload: boolean; participants?: Participant[] };
type ListResponse = { items: DocumentItem[]; pagination: { limit: number; offset: number; total: number } };

const purposeLabels: Record<string, string> = { introductory_letter: "Surat Pengantar", acceptance_letter: "Surat Penerimaan", completion_letter: "Surat Keterangan", certificate: "Sertifikat", general: "Umum" };
const statusVariant = (status: string) => status === "dicabut" || status === "gagal_dibuat" ? "destructive" : status === "terbit" || status === "diarsipkan" ? "default" : "secondary";

export default function DocumentCenter() {
  const [data, setData] = useState<ListResponse>({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<DocumentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = async (offset = data.pagination.offset) => {
    setLoading(true); setError("");
    try {
      const result = await apiGet<ListResponse>(buildQueryPath("/document-center/operator/documents", { limit: 20, offset, status: status || null, title: keyword || null, documentNumber: keyword || null }));
      setData(result);
    } catch (err: any) { setError(err?.message || "Gagal memuat dokumen."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(0); }, [status]);
  const openDetail = async (id: string) => { setDetailLoading(true); setError(""); try { setSelected(await apiGet<DocumentItem>(`/document-center/operator/documents/${encodePathSegment(id)}`)); } catch (err: any) { setError(err?.message || "Gagal memuat detail dokumen."); } finally { setDetailLoading(false); } };
  const download = async (document: DocumentItem) => { if (!document.canDownload || downloadingId) return; setDownloadingId(document.id); setError(""); try { const file = await apiGetBlob(`/document-center/documents/${encodePathSegment(document.id)}/download`); downloadBlob(file.blob, file.fileName || `dokumen-${document.id}.pdf`); } catch (err: any) { setError(err?.message || "Gagal mengunduh dokumen."); } finally { setDownloadingId(null); } };
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); void load(0); };
  const current = data.pagination;

  return <OperatorLayout title="Pusat Dokumen"><div className="flex flex-col gap-5 pb-4">
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
    <div className="flex gap-1 overflow-x-auto rounded-[10px] bg-slate-100 p-1 w-fit max-w-full">
      {["Permintaan Surat", "Dokumen Akhir Kegiatan", "Arsip Dokumen", "Template Dokumen", "Jenis & Penomoran"].map((tab) => <button key={tab} disabled={tab !== "Arsip Dokumen"} className={`whitespace-nowrap rounded-[8px] px-3 py-1.5 text-xs font-black ${tab === "Arsip Dokumen" ? "bg-white text-foreground shadow-sm" : "cursor-not-allowed text-muted-foreground opacity-55"}`}>{tab}</button>)}
    </div>
    <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Arsip Dokumen</p><h2 className="text-sm font-black text-foreground">Dokumen resmi STAS-RG</h2></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</Button></div>
      <form onSubmit={submitSearch} className="flex flex-col gap-2 border-b border-border p-4 md:flex-row"><div className="flex flex-1 items-center gap-2 rounded-[10px] border border-border bg-white px-3"><Search size={15} className="text-muted-foreground" /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Cari judul atau nomor dokumen" className="h-10 w-full border-none bg-transparent text-sm outline-none" /></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"><option value="">Semua status</option><option value="draft">Draft</option><option value="terbit">Terbit</option><option value="diarsipkan">Diarsipkan</option><option value="dicabut">Dicabut</option></select><Button type="submit" size="sm">Cari</Button></form>
      <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Judul</TableHead><TableHead>Jenis</TableHead><TableHead>Status</TableHead><TableHead>Nomor</TableHead><TableHead>Dibuat</TableHead><TableHead>Terbit</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" size={20} /></TableCell></TableRow> : data.items.length === 0 ? <TableRow><TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">Belum ada dokumen.</TableCell></TableRow> : data.items.map((item) => <TableRow key={item.id}><TableCell><p className="font-black text-foreground">{item.title}</p><p className="text-xs text-muted-foreground">{item.participants?.length || 0} peserta</p></TableCell><TableCell>{item.typeName}<p className="text-xs text-muted-foreground">{purposeLabels[item.documentPurpose] || item.documentPurpose}</p></TableCell><TableCell><Badge variant={statusVariant(item.status) as any}>{item.statusLabel || item.status}</Badge></TableCell><TableCell className="font-mono text-xs">{item.documentNumber || "—"}</TableCell><TableCell>{formatDateReadable(item.createdAt)}</TableCell><TableCell>{formatDateReadable(item.issuedAt)}</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => void openDetail(item.id)} aria-label="Lihat detail"><Eye size={15} /></Button>{item.canDownload && <Button variant="ghost" size="icon" disabled={downloadingId === item.id} onClick={() => void download(item)} aria-label="Unduh">{downloadingId === item.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}</Button>}</div></TableCell></TableRow>)}</TableBody></Table>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>{current.total} dokumen</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading || current.offset === 0} onClick={() => void load(Math.max(0, current.offset - current.limit))}><ChevronLeft size={14} /> Sebelumnya</Button><Button variant="outline" size="sm" disabled={loading || current.offset + current.limit >= current.total} onClick={() => void load(current.offset + current.limit)}>Berikutnya <ChevronRight size={14} /></Button></div></div>
    </div>
    <Dialog open={Boolean(selected) || detailLoading} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{detailLoading ? "Memuat detail..." : selected?.title || "Detail Dokumen"}</DialogTitle><DialogDescription>{selected?.typeName || ""}</DialogDescription></DialogHeader>{selected && <div className="grid gap-3 text-sm"><div className="rounded-[12px] border border-border bg-slate-50 p-3"><p><b>Status:</b> {selected.statusLabel || selected.status}</p><p><b>Nomor:</b> {selected.documentNumber || "—"}</p><p><b>Dibuat:</b> {formatDateReadable(selected.createdAt)}</p><p><b>Terbit:</b> {formatDateReadable(selected.issuedAt)}</p>{selected.activityOutcome && <p><b>Outcome:</b> {selected.activityOutcome}</p>}</div><div><p className="mb-2 font-black">Peserta</p>{selected.participants?.length ? selected.participants.map((p, i) => <div key={i} className="border-b border-border py-2"><p className="font-bold">{p.name || "—"} {p.nim ? `(${p.nim})` : ""}</p><p className="text-xs text-muted-foreground">{[p.projectName, p.period, p.participantRole].filter(Boolean).join(" • ") || "—"}</p></div>) : <p className="text-muted-foreground">Tidak ada peserta.</p>}</div></div>}<DialogFooter>{selected?.canDownload && <Button onClick={() => void download(selected)} disabled={downloadingId === selected.id}>{downloadingId === selected.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Unduh</Button>}</DialogFooter></DialogContent></Dialog>
  </div></OperatorLayout>;
}
