import React, { useEffect, useMemo, useState } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { Search, X, Download, BookOpen, Calendar, Paperclip, Eye, UserCheck } from "lucide-react";
import { apiGet, apiPatch, getStoredUser } from "../../lib/api";

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

export default function LogbookMonitor() {
  const user = getStoredUser();
  const [students, setStudents] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [searchStudent, setSearchStudent] = useState("");
  const [filterRiset, setFilterRiset] = useState("Semua");
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [verifyModal, setVerifyModal] = useState<{ entry: any; status: "Terverifikasi" | "Perlu Revisi" } | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [savingVerify, setSavingVerify] = useState(false);
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
        const mappedEntries = logRows.map((item) => ({
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
          hasAttachment: Boolean(item.has_attachment),
          verificationStatus: item.verification_status || null,
          verificationNote: item.verification_note || "",
          verifiedByName: item.verified_by_name || "",
          verifiedAt: item.verified_at || null
        }));

        setStudents(mappedStudents);
        setEntries(mappedEntries);
        if (mappedStudents.length > 0) setSelectedStudent(mappedStudents[0]);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat monitor logbook.");
      }
    };

    loadData();
  }, []);

  const risetOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => set.add(entry.riset));
    return ["Semua", ...Array.from(set)];
  }, [entries]);

  const filteredStudents = students.filter(m => {
    const q = searchStudent.toLowerCase();
    const mq = !q || m.name.toLowerCase().includes(q);
    const mr = filterRiset === "Semua" || m.riset.includes(filterRiset);
    return mq && mr;
  });

  const studentEntries = useMemo(() => {
    const byStudent = entries.filter(e => e.mahasiswaId === selectedStudent?.id);
    if (!dateFrom && !dateTo) return byStudent;
    return byStudent.filter((entry) => {
      const d = new Date(entry.fullDate);
      if (Number.isNaN(d.getTime())) return true;
      const afterFrom = !dateFrom || d >= new Date(dateFrom);
      const beforeTo = !dateTo || d <= new Date(dateTo);
      return afterFrom && beforeTo;
    });
  }, [entries, selectedStudent?.id, dateFrom, dateTo]);

  const handleVerify = async () => {
    if (!verifyModal) return;

    try {
      setSavingVerify(true);
      await apiPatch(`/logbooks/${verifyModal.entry.id}/verify`, {
        verificationStatus: verifyModal.status,
        verificationNote,
        verifiedBy: user?.id || "OP001",
        verifiedByName: user?.name || "Operator"
      });

      const next = entries.map((entry) => entry.id === verifyModal.entry.id
        ? {
            ...entry,
            verificationStatus: verifyModal.status,
            verificationNote,
            verifiedByName: user?.name || "Operator",
            verifiedAt: new Date().toISOString()
          }
        : entry);

      setEntries(next);
      if (selectedEntry?.id === verifyModal.entry.id) {
        setSelectedEntry(next.find((entry) => entry.id === selectedEntry.id) || null);
      }
      setVerifyModal(null);
      setVerificationNote("");
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan verifikasi logbook.");
    } finally {
      setSavingVerify(false);
    }
  };

  return (
    <OperatorLayout title="Logbook Mahasiswa">
      <div className="flex gap-5 items-start pb-4 h-full">
        {error && (
          <div className="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* ── Left Panel: Student List (35%) ── */}
        <div className="w-[280px] shrink-0 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-border rounded-[10px] mb-3 focus-within:ring-2 focus-within:ring-amber-300 transition-all">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input value={searchStudent} onChange={e => setSearchStudent(e.target.value)} placeholder="Cari mahasiswa..." className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground" />
            </div>
            <select value={filterRiset} onChange={e => setFilterRiset(e.target.value)} className="w-full h-9 px-3 bg-white border border-border rounded-[10px] text-xs font-bold focus:outline-none cursor-pointer">
              {risetOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredStudents.map(m => {
              const entriesByStudent = entries.filter(e => e.mahasiswaId === m.id);
              const isActive = selectedStudent?.id === m.id;
              return (
                <button key={m.id} onClick={() => setSelectedStudent(m)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-amber-50/40 transition-colors flex items-start gap-3 ${isActive ? "bg-amber-50 border-l-[3px] border-amber-500" : "border-l-[3px] border-transparent"}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${m.color}`}>{m.initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black ${isActive ? "text-amber-700" : "text-foreground"}`}>{m.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {m.riset.map(r => <span key={r} className="text-[9px] font-black px-1 py-0.5 rounded bg-slate-100 text-slate-600">{r}</span>)}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{entriesByStudent.length} entri bulan ini</span>
                      <span className={`text-[10px] font-bold ${m.status === "Aktif" ? "text-emerald-600" : "text-muted-foreground"}`}>{m.status}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel: Logbook Entries (65%) ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedStudent && (
            <>
              {/* Student Header */}
              <div className="bg-white border border-border rounded-[14px] p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black ${selectedStudent.color}`}>{selectedStudent.initials}</div>
                  <div>
                    <h2 className="font-black text-foreground">{selectedStudent.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedStudent.nim} · {selectedStudent.prodi}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <UserCheck size={9} /> {selectedStudent.kehadiran}/{selectedStudent.totalHari} Hadir
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-black text-[#6C47FF] bg-[#F8F5FF] px-2 py-0.5 rounded-full border border-[#D6CAFF]">
                        <BookOpen size={9} /> {selectedStudent.logbookCount} Logbook
                      </span>
                      {selectedStudent.riset.map(r => <span key={r} className={`text-[10px] font-black px-2 py-0.5 rounded ${r === "Riset A" ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-emerald-50 text-emerald-700"}`}>{r}</span>)}
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 h-9 px-4 bg-slate-50 border border-border hover:bg-slate-100 text-foreground text-xs font-black rounded-[10px] transition-colors">
                  <Download size={14} /> Ekspor Logbook
                </button>
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-border rounded-[10px] px-3 py-2 text-xs">
                  <Calendar size={13} className="text-muted-foreground" />
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="outline-none text-xs text-foreground bg-transparent" />
                  <span className="text-muted-foreground">s/d</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="outline-none text-xs text-foreground bg-transparent" />
                </div>
                <select className="h-9 px-3 bg-white border border-border rounded-[10px] text-xs font-bold focus:outline-none cursor-pointer">
                  {["Semua Riset", ...risetOptions.filter((option) => option !== "Semua")].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Entry list */}
              <div className="flex flex-col gap-3">
                {studentEntries.length === 0 ? (
                  <div className="bg-white border border-border rounded-[14px] p-12 text-center">
                    <BookOpen size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-bold text-foreground">Belum ada logbook</p>
                  </div>
                ) : studentEntries.map(entry => (
                  <div key={entry.id} onClick={() => setSelectedEntry(entry)}
                    className="bg-white border border-border rounded-[14px] p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="bg-[#F8F5FF] border border-[#D6CAFF] rounded-[10px] px-3 py-2 text-center shrink-0">
                          <p className="text-xl font-black text-[#6C47FF] leading-none">{entry.date.split(" ")[0]}</p>
                          <p className="text-[10px] font-black text-[#9E8BFF] uppercase">{entry.date.split(" ")[1]}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${entry.riset === "Riset A" ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-emerald-50 text-emerald-700"}`}>{entry.riset}</span>
                            {entry.hasAttachment && <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground"><Paperclip size={9} /> Lampiran</span>}
                          </div>
                          <h3 className="font-black text-foreground text-sm group-hover:text-amber-700 transition-colors leading-snug">{entry.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>
                          {entry.verificationStatus && (
                            <span className={`inline-flex mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full ${entry.verificationStatus === "Terverifikasi" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {entry.verificationStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      <Eye size={15} className="text-muted-foreground group-hover:text-amber-500 transition-colors mt-1 shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Entry Detail Float */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${selectedEntry.riset === "Riset A" ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-emerald-50 text-emerald-700"}`}>{selectedEntry.riset}</span>
                  <span className="text-xs text-muted-foreground font-medium">{selectedEntry.fullDate}</span>
                </div>
                <h3 className="font-black text-foreground leading-snug">{selectedEntry.title}</h3>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground ml-4 shrink-0"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Deskripsi Kegiatan</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedEntry.description}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Output / Hasil</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedEntry.output}</p>
              </div>
              {selectedEntry.kendala && (
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1.5">Kendala</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedEntry.kendala}</p>
                </div>
              )}
              {selectedEntry.hasAttachment && (
                <div className="p-3 bg-slate-50 border border-border rounded-[10px] flex items-center gap-3">
                  <Paperclip size={14} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground flex-1">Lampiran terlampir</span>
                  <button className="text-xs font-black text-amber-600 hover:underline flex items-center gap-1"><Download size={12} /> Unduh</button>
                </div>
              )}
              {selectedEntry.verificationStatus && (
                <div className="p-3 rounded-[10px] border border-border bg-slate-50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-1">Status Verifikasi</p>
                  <p className={`text-xs font-black ${selectedEntry.verificationStatus === "Terverifikasi" ? "text-emerald-700" : "text-amber-700"}`}>{selectedEntry.verificationStatus}</p>
                  {selectedEntry.verificationNote && <p className="text-xs text-foreground mt-1">{selectedEntry.verificationNote}</p>}
                  {selectedEntry.verifiedByName && <p className="text-[10px] text-muted-foreground mt-1">oleh {selectedEntry.verifiedByName}</p>}
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setVerifyModal({ entry: selectedEntry, status: "Perlu Revisi" }); setVerificationNote(selectedEntry.verificationNote || ""); }} className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-[10px] transition-colors">
                Perlu Revisi
              </button>
              <button onClick={() => { setVerifyModal({ entry: selectedEntry, status: "Terverifikasi" }); setVerificationNote(selectedEntry.verificationNote || ""); }} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-[10px] transition-colors">
                Verifikasi
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setVerifyModal(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[460px]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Konfirmasi Verifikasi Logbook</h3>
              <button onClick={() => setVerifyModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <p className="text-sm text-foreground">Status: <span className="font-black">{verifyModal.status}</span></p>
              <textarea value={verificationNote} onChange={(e) => setVerificationNote(e.target.value)} rows={4} placeholder="Catatan verifikasi (opsional)..." className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all resize-none" />
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setVerifyModal(null)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Batal</button>
              <button disabled={savingVerify} onClick={handleVerify} className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-black rounded-[10px] transition-colors">
                {savingVerify ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
