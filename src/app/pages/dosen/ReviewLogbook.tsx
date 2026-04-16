import React, { useEffect, useMemo, useState } from "react";
import { DosenLayout } from "../../components/DosenLayout";
import { Search, X, Download, BookOpen, Paperclip, Send, MessageSquare } from "lucide-react";
import { apiGet, apiPost, getStoredUser } from "../../lib/api";
import { mapLogbookAttachment } from "../../lib/logbookAttachments";

const AVATAR_COLORS = [
  "bg-[#8B6FFF] text-white",
  "bg-emerald-500 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
  "bg-violet-500 text-white",
  "bg-blue-500 text-white",
  "bg-amber-500 text-white"
];

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function formatFullDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
}

export default function ReviewLogbook() {
  const user = getStoredUser();
  const [studentsState, setStudentsState] = useState<any[]>([]);
  const [entriesState, setEntriesState] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterRiset, setFilterRiset] = useState("Semua");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setError("");
      try {
        const [studentRows, logRows] = await Promise.all([
          apiGet<Array<any>>("/students"),
          apiGet<Array<any>>("/logbooks")
        ]);

        const risetByStudent: Record<string, string[]> = {};
        logRows.forEach((item: any) => {
          const risetName = item.project_name || "Tanpa Riset";
          if (!risetByStudent[item.student_id]) risetByStudent[item.student_id] = [];
          if (!risetByStudent[item.student_id].includes(risetName)) risetByStudent[item.student_id].push(risetName);
        });

        const mappedStudents = studentRows.map((item, index) => ({
          id: item.id,
          nim: item.nim,
          name: item.name,
          initials: item.initials || toInitials(item.name),
          color: AVATAR_COLORS[index % AVATAR_COLORS.length],
          prodi: item.prodi || "-",
          angkatan: String(item.angkatan || "-"),
          email: item.email || "-",
          phone: item.phone || "-",
          status: item.status,
          tipe: item.tipe,
          riset: risetByStudent[item.id] || [],
          bergabung: item.bergabung || "-",
          pembimbing: item.pembimbing || "-",
          kehadiran: Number(item.kehadiran) || 0,
          totalHari: Number(item.total_hari) || 0,
          logbookCount: Number(item.logbook_count) || 0,
          jamMingguIni: Number(item.jam_minggu_ini) || 0,
          jamMingguTarget: Number(item.jam_minggu_target) || 0
        }));

        const studentById = Object.fromEntries(mappedStudents.map((student) => [student.id, student]));
        const mappedEntries = logRows.map((item) => {
          const attachment = mapLogbookAttachment(item);
          return {
          id: item.id,
          mahasiswaId: item.student_id,
          mahasiswaNama: item.student_name,
          mahasiswaInitials: item.student_initials || toInitials(item.student_name || "Mahasiswa"),
          mahasiswaColor: studentById[item.student_id]?.color || "bg-[#8B6FFF] text-white",
          riset: item.project_name || "Tanpa Riset",
          date: formatShortDate(item.date),
          fullDate: formatFullDate(item.date),
          title: item.title,
          description: item.description,
          output: item.output || "-",
          kendala: item.kendala || "",
          hasAttachment: Boolean(attachment),
          attachment,
          comments: Array.isArray(item.comments) ? item.comments : [],
          commentsCount: Number(item.comments_count) || 0
          };
        });

        setStudentsState(mappedStudents);
        setEntriesState(mappedEntries);
        const defaultStudent = mappedStudents.find((student) => student.id === user?.id) || mappedStudents[0];
        if (defaultStudent) setSelectedStudent(defaultStudent);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data review logbook.");
      }
    };

    loadData();
  }, [user?.id]);

  const risetOptions = useMemo(() => {
    const set = new Set<string>();
    studentsState.forEach((student) => (student.riset || []).forEach((riset: string) => set.add(riset)));
    return ["Semua", ...Array.from(set)];
  }, [studentsState]);

  const students = studentsState.filter(m => {
    const q = search.toLowerCase();
    const mq = !q || m.name.toLowerCase().includes(q);
    const mr = filterRiset === "Semua" || m.riset.includes(filterRiset);
    return mq && mr;
  });

  const entries = useMemo(() => entriesState.filter(e => e.mahasiswaId === selectedStudent?.id), [entriesState, selectedStudent?.id]);
  const entryComments = selectedEntry?.comments || [];

  const sendComment = async () => {
    if (!selectedEntry || !commentText.trim()) return;
    try {
      const user = getStoredUser();
      await apiPost(`/logbooks/${selectedEntry.id}/comments`, {
        id: `CMT${Date.now()}`,
        logbookId: selectedEntry.id,
        authorId: user?.id || "D000",
        authorName: user?.name || "Dosen",
        text: commentText.trim()
      });
      const newComment = {
        id: `CMT-VIEW-${Date.now()}`,
        authorId: user?.id || "D000",
        authorName: user?.name || "Dosen",
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };
      setEntriesState((prev) => prev.map((entry) =>
        entry.id === selectedEntry.id
          ? {
              ...entry,
              comments: [newComment, ...(entry.comments || [])],
              commentsCount: Number(entry.commentsCount || 0) + 1
            }
          : entry
      ));
      setSelectedEntry((prev: any) => prev
        ? {
            ...prev,
            comments: [newComment, ...(prev.comments || [])],
            commentsCount: Number(prev.commentsCount || 0) + 1
          }
        : prev
      );
      setCommentText("");
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim komentar.");
    }
  };

  return (
    <DosenLayout title="Review Logbook">
      <div className="flex flex-col gap-5 pb-4 h-full">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-5 items-start h-full">

        {/* Left Panel – Student List */}
        <div className="w-[260px] shrink-0 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-border rounded-[10px] mb-3 focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari mahasiswa..." className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground" />
            </div>
            <select value={filterRiset} onChange={e => setFilterRiset(e.target.value)} className="w-full h-9 px-3 bg-white border border-border rounded-[10px] text-xs font-bold focus:outline-none cursor-pointer">
              {risetOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {students.map(m => {
              const mEntries = entriesState.filter(e => e.mahasiswaId === m.id);
              const unreviewed = mEntries.filter(e => !e.comments || e.comments.length === 0).length;
              const isActive = selectedStudent?.id === m.id;
              return (
                <button key={m.id} onClick={() => { setSelectedStudent(m); setSelectedEntry(null); }}
                  className={`w-full text-left px-4 py-3.5 hover:bg-indigo-50/40 transition-colors flex items-start gap-3 ${isActive ? "bg-indigo-50 border-l-[3px] border-indigo-600" : "border-l-[3px] border-transparent"}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${m.color}`}>{m.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-black ${isActive ? "text-indigo-700" : "text-foreground"}`}>{m.name}</p>
                      {unreviewed > 0 && <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shrink-0">{unreviewed}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {m.riset.map(r => <span key={r} className="text-[9px] font-black px-1 py-0.5 rounded bg-slate-100 text-slate-600">{r}</span>)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{mEntries.length} entri · {m.logbookCount} total</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel – Entries */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedStudent && (
            <>
              {/* Student header */}
              <div className="bg-white border border-border rounded-[14px] p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black ${selectedStudent.color}`}>{selectedStudent.initials}</div>
                  <div>
                    <h2 className="font-black text-foreground">{selectedStudent.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedStudent.nim} · {selectedStudent.prodi}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedStudent.riset.map(r => <span key={r} className={`text-[10px] font-black px-2 py-0.5 rounded ${r === "Riset A" ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-emerald-50 text-emerald-700"}`}>{r}</span>)}
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{selectedStudent.logbookCount} total entri</span>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 h-9 px-4 bg-slate-50 border border-border text-foreground text-xs font-black rounded-[10px] hover:bg-slate-100 transition-colors">
                  <Download size={14} /> Ekspor
                </button>
              </div>

              {/* Entry list */}
              <div className="flex flex-col gap-3">
                {entries.length === 0 ? (
                  <div className="bg-white border border-border rounded-[14px] p-12 text-center"><p className="text-sm text-muted-foreground">Belum ada logbook.</p></div>
                ) : entries.map(entry => {
                  const hasComment = (entry.commentsCount || 0) > 0;
                  return (
                    <div key={entry.id} onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                      className={`bg-white border rounded-[14px] p-4 shadow-sm cursor-pointer transition-all hover:border-indigo-300 hover:shadow-md ${selectedEntry?.id === entry.id ? "border-indigo-400 ring-1 ring-indigo-200" : "border-border"}`}>
                      <div className="flex items-start gap-4">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-[10px] px-3 py-2 text-center shrink-0">
                          <p className="text-xl font-black text-indigo-600 leading-none">{entry.date.split(" ")[0]}</p>
                          <p className="text-[9px] font-black text-indigo-400 uppercase">{entry.date.split(" ")[1]}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${entry.riset === "Riset A" ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-emerald-50 text-emerald-700"}`}>{entry.riset}</span>
                            {entry.hasAttachment && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-bold">
                                <Paperclip size={9} /> {entry.attachment?.name || "Lampiran"}
                              </span>
                            )}
                            {hasComment && <span className="flex items-center gap-0.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded"><MessageSquare size={9} /> {entry.commentsCount}</span>}
                            {!hasComment && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Belum Direview</span>}
                          </div>
                          <h3 className="font-black text-foreground text-sm leading-snug">{entry.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{entry.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Entry Detail Float */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/30 backdrop-blur-sm" onClick={() => setSelectedEntry(null)}>
          <div className="h-full w-full max-w-[480px] bg-white shadow-2xl overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-start justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${selectedEntry.riset === "Riset A" ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-emerald-50 text-emerald-700"}`}>{selectedEntry.riset}</span>
                  <span className="text-xs text-muted-foreground">{selectedEntry.fullDate}</span>
                </div>
                <h3 className="font-black text-foreground leading-snug">{selectedEntry.title}</h3>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground ml-4 shrink-0"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4 flex-1">
              <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Deskripsi</p><p className="text-sm text-foreground leading-relaxed">{selectedEntry.description}</p></div>
              <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Output</p><p className="text-sm text-foreground leading-relaxed">{selectedEntry.output}</p></div>
              {selectedEntry.kendala && <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Kendala</p><p className="text-sm text-foreground leading-relaxed">{selectedEntry.kendala}</p></div>}
              {selectedEntry.attachment && (
                <div className="p-3 bg-slate-50 border border-border rounded-[10px] flex items-center gap-3">
                  <Paperclip size={13} className="text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{selectedEntry.attachment.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedEntry.attachment.sizeLabel}</p>
                  </div>
                  {selectedEntry.attachment.url && (
                    <div className="flex items-center gap-2">
                      <a
                        href={selectedEntry.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-black text-indigo-600 hover:underline"
                      >
                        Preview
                      </a>
                      <a
                        href={selectedEntry.attachment.url}
                        download={selectedEntry.attachment.name}
                        className="text-xs font-black text-indigo-600 hover:underline"
                      >
                        Unduh
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-border pt-4 flex flex-col gap-3">
                <p className="text-xs font-black text-foreground flex items-center gap-1"><MessageSquare size={13} /> Komentar Dosen</p>
                {entryComments.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {entryComments.map((c, i) => (
                      <div key={c.id || i} className="p-3 bg-indigo-50 border border-indigo-100 rounded-[10px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-indigo-700">{c.authorName || "Dosen"}</span>
                          <span className="text-[10px] text-indigo-400">{c.createdAt ? new Date(c.createdAt).toLocaleString("id-ID") : "-"}</span>
                        </div>
                        <p className="text-xs text-indigo-800 font-medium">{c.text}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground italic">Belum ada komentar.</p>}

                <div className="mt-1">
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3}
                    placeholder="Tulis komentar atau feedback untuk mahasiswa..."
                    className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none" />
                  <button onClick={sendComment} disabled={!commentText.trim()}
                    className="mt-2 w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                    <Send size={14} /> Kirim Komentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </DosenLayout>
  );
}
