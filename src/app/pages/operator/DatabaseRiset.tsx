import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { OperatorLayout } from "../../components/OperatorLayout";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../lib/api";
import { Search, Plus, X, Target, Pencil, LayoutGrid, List, Shield, Trash2, Users, BookOpen, Kanban, ChevronRight } from "lucide-react";

const STEP_LABELS = ["Info Dasar", "Tim", "Periode & Mitra", "Milestone"];
const PERAN_OPTIONS = ["Ketua", "Pembimbing", "Anggota Inti", "Backend Dev", "Frontend Dev", "Hardware Dev", "Data Analyst", "Asisten Peneliti", "Fullstack Dev"];
const PERAN_DOSEN = ["Ketua Riset", "Pembimbing", "Co-Investigator", "Anggota Dosen"];

interface ResearchProject {
  id: string;
  title: string;
  short_title?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  period_text?: string;
  mitra?: string;
  status: string;
  progress?: number;
  category?: string;
  description?: string;
  funding?: string;
}

interface Lecturer {
  id: string;
  name: string;
  nip: string;
  departemen: string;
  initials?: string;
  color?: string;
  jabatan?: string;
  keahlian?: string[];
  status?: string;
  email?: string;
}

function statusColor(s: string) {
  return s === "Aktif" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : s === "Selesai" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-red-100 text-red-600 border-red-200";
}

export default function DatabaseRiset() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [research, setResearch] = useState<ResearchProject[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [selected, setSelected] = useState<ResearchProject | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "anggota" | "akses">("info");
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [boardAccess, setBoardAccess] = useState<Record<string, string[]>>({});
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Record<string, any[]>>({});
  const [students, setStudents] = useState<Array<{ id: string; name: string; initials?: string }>>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [selectedPeran, setSelectedPeran] = useState(PERAN_OPTIONS[0]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [savingRiset, setSavingRiset] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    status: "Aktif",
    supervisorId: "",
    studentIds: [] as string[],
    startDate: "",
    endDate: "",
    mitra: "",
    funding: "",
    milestones: [] as string[]
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rData, lData, sData] = await Promise.all([
          apiGet<ResearchProject[]>("/research"),
          apiGet<Lecturer[]>("/lecturers"),
          apiGet<Array<any>>("/students")
        ]);
        setResearch(rData || []);
        setStudents((sData || []).map((item: any) => ({ id: item.id, name: item.name, initials: item.initials })));
        setLecturers(
          (lData || []).map((item: any) => ({
            ...item,
            initials: item.initials || item.name?.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase() || "DS",
            color: item.color || "bg-indigo-600 text-white",
            jabatan: item.jabatan || "Dosen",
            keahlian: Array.isArray(item.keahlian) ? item.keahlian : [],
            status: item.status || "Aktif",
            email: item.email || "-"
          }))
        );
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selected?.id) {
      const loadMembersAndAccess = async () => {
        try {
          const [memberData, accessData] = await Promise.all([
            apiGet<Array<any>>(`/research/${selected.id}/members`),
            apiGet<Array<any>>(`/research/${selected.id}/board-access`)
          ]);
          setMembers(prev => ({ ...prev, [selected.id]: memberData || [] }));
          setBoardAccess(prev => ({ ...prev, [selected.id]: (accessData || []).map((item: any) => item.user_id) }));
        } catch (err) {
          console.error("Gagal memuat members/board access");
        }
      };
      loadMembersAndAccess();
    }
  }, [selected?.id]);

  const filteredRiset = research.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.title.toLowerCase().includes(q) || r.supervisor_name?.toLowerCase().includes(q)) && (filterStatus === "Semua" || r.status === filterStatus);
  });

  const mahasiswaInRiset = selected ? (members[selected.id] || []).filter((m: any) => m.member_type === "Mahasiswa") : [];
  const dosenInRiset    = selected ? (members[selected.id] || []).filter((m: any) => m.member_type === "Dosen") : [];
  const currentAccess   = selected ? (boardAccess[selected.id] || []) : [];
  const nonAccessMembers = mahasiswaInRiset.filter((m: any) => !currentAccess.includes(m.user_id));

  const revokeAccess = async (risetId: string, mid: string) => {
    await apiDelete(`/research/${risetId}/board-access/${mid}`);
    setBoardAccess(prev => ({ ...prev, [risetId]: (prev[risetId] || []).filter(x => x !== mid) }));
  };

  const grantAccess = async (risetId: string, mid: string) => {
    await apiPost(`/research/${risetId}/board-access`, { userId: mid });
    setBoardAccess(prev => ({ ...prev, [risetId]: [...(prev[risetId] || []), mid] }));
  };

  const selectedMemberIdsSet = new Set((members[selected?.id || ""] || []).map((member: any) => member.user_id));
  const allAddable = [
    ...lecturers.map((item) => ({ user_id: item.id, name: item.name, initials: item.initials || item.name?.charAt(0), member_type: "Dosen" })),
    ...students.map((item) => ({ user_id: item.id, name: item.name, initials: item.initials || item.name?.charAt(0), member_type: "Mahasiswa" }))
  ].filter((item) => !selectedMemberIdsSet.has(item.user_id));

  const toggleNewMember = (userId: string) => {
    setSelectedNewMembers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleAddMembers = async () => {
    if (!selected?.id || selectedNewMembers.length === 0) return;
    try {
      setSavingMembers(true);
      for (const userId of selectedNewMembers) {
        const candidate = allAddable.find((item) => item.user_id === userId);
        await apiPost(`/research/${selected.id}/members`, {
          userId,
          memberType: candidate?.member_type || "Mahasiswa",
          peran: selectedPeran,
          status: "Aktif"
        });
      }
      const memberData = await apiGet<Array<any>>(`/research/${selected.id}/members`);
      setMembers((prev) => ({ ...prev, [selected.id]: memberData || [] }));
      setSelectedNewMembers([]);
      setAddMemberModal(false);
    } catch (err: any) {
      setError(err?.message || "Gagal menambah anggota.");
    } finally {
      setSavingMembers(false);
    }
  };

  const handleUpdateMemberPeran = async (projectId: string, userId: string, peran: string) => {
    try {
      await apiPatch(`/research/${projectId}/members/${userId}`, { peran });
      const memberData = await apiGet<Array<any>>(`/research/${projectId}/members`);
      setMembers((prev) => ({ ...prev, [projectId]: memberData || [] }));
    } catch (err: any) {
      setError(err?.message || "Gagal memperbarui peran anggota.");
    }
  };

  const handleRemoveMember = async (projectId: string, userId: string) => {
    try {
      await apiDelete(`/research/${projectId}/members/${userId}`);
      const memberData = await apiGet<Array<any>>(`/research/${projectId}/members`);
      setMembers((prev) => ({ ...prev, [projectId]: memberData || [] }));
      setBoardAccess((prev) => ({ ...prev, [projectId]: (prev[projectId] || []).filter((id) => id !== userId) }));
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus anggota.");
    }
  };

  const handleCreateResearch = async () => {
    if (!formData.title.trim() || !formData.supervisorId) {
      setError("Judul riset dan supervisor wajib diisi.");
      return;
    }

    setSavingRiset(true);
    setError("");
    try {
      const risetId = `R${Date.now()}`;
      const periodText = formData.startDate && formData.endDate
        ? `${new Date(formData.startDate).toLocaleDateString("id-ID")} - ${new Date(formData.endDate).toLocaleDateString("id-ID")}`
        : null;

      const payload = {
        id: risetId,
        title: formData.title.trim(),
        shortTitle: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim() || "Umum",
        status: formData.status,
        supervisorLecturerId: formData.supervisorId,
        periodText,
        mitra: formData.mitra.trim() || "-",
        funding: formData.funding.trim() || "-",
        progress: 0
      };

      await apiPost("/research", payload);

      // Add supervisor and students as members
      const memberPromises = [formData.supervisorId, ...formData.studentIds].map(userId => 
        apiPost(`/research/${risetId}/members`, {
          userId,
          memberType: formData.studentIds.includes(userId) ? "Mahasiswa" : "Dosen",
          peran: formData.studentIds.includes(userId) ? "Anggota" : "Pembimbing",
          status: "Aktif"
        })
      );
      await Promise.all(memberPromises);

      const milestonePromises = formData.milestones
        .map((label, index) => label.trim())
        .filter(Boolean)
        .map((label, index) => apiPost(`/research/${risetId}/milestones`, {
          label,
          done: false,
          sortOrder: index
        }));

      if (milestonePromises.length > 0) {
        await Promise.all(milestonePromises);
      }

      // Reload data
      const updatedResearch = await apiGet<ResearchProject[]>("/research");
      setResearch(updatedResearch || []);

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        status: "Aktif",
        supervisorId: "",
        studentIds: [],
        startDate: "",
        endDate: "",
        mitra: "",
        funding: "",
        milestones: []
      });
      setModalOpen(false);
      setStep(0);
    } catch (err: any) {
      setError(err?.message || "Gagal membuat riset baru.");
    } finally {
      setSavingRiset(false);
    }
  };


  if (loading) return <OperatorLayout title="Database Riset"><div className="p-8 text-center text-muted-foreground">Memuat data...</div></OperatorLayout>;
  if (error) return <OperatorLayout title="Database Riset"><div className="p-8 text-red-600">Error: {error}</div></OperatorLayout>;

  return (
    <OperatorLayout title="Database Riset">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[12px] w-56 focus-within:ring-2 focus-within:ring-[#0AB600]/30 transition-all">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul, supervisor..." className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 px-3 bg-white border border-border rounded-[10px] text-sm font-bold focus:outline-none cursor-pointer">
              {["Semua", "Aktif", "Selesai", "Ditangguhkan"].map(o => <option key={o}>{o}</option>)}
            </select>
            <div className="flex bg-white border border-border rounded-[10px] overflow-hidden">
              {([["grid", <LayoutGrid size={14} />], ["table", <List size={14} />]] as [string, React.ReactNode][]).map(([v, icon]) => (
                <button key={v} onClick={() => setView(v as "grid" | "table")} className={`h-9 w-9 flex items-center justify-center transition-colors ${view === v ? "bg-[#0AB600] text-white" : "text-muted-foreground hover:bg-slate-50"}`}>{icon}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setModalOpen(true); setStep(0); }}
            className="flex items-center gap-2 h-9 px-4 bg-[#0AB600] hover:bg-[#099800] text-white text-sm font-black rounded-[10px] shadow-sm transition-colors"
          >
            <Plus size={15} strokeWidth={3} /> Tambah Riset
          </button>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0">
            {view === "grid" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRiset.map(r => {
                  const projectMembers = members[r.id] || [];
                  const dosen = projectMembers.filter((m: any) => m.member_type === "Dosen");
                  return (
                    <div key={r.id} onClick={() => { setSelected(selected?.id === r.id ? null : r); setDetailTab("info"); }}
                      className={`bg-white border rounded-[14px] shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer ${selected?.id === r.id ? "border-[#0AB600]" : "border-border"}`}>
                      <div className="h-20 bg-gradient-to-br from-[#0AB600] to-[#065e00] relative overflow-hidden p-4 flex items-end">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
                        <div className="relative z-10 flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColor(r.status)} bg-white`}>{r.status}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-black text-foreground text-sm leading-snug mb-1 line-clamp-2">{r.title}</h3>
                        {/* Dosen list */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {dosen.map((d: any) => (
                            <span key={d.user_id} className={`text-[10px] font-black px-2 py-0.5 rounded ${d.peran === "Ketua Riset" || d.peran === "Pembimbing" ? "bg-[#E6FFE6] text-[#0AB600]" : "bg-slate-100 text-slate-600"}`}>
                              {d.initials || d.name?.charAt(0)?.toUpperCase()} {d.peran === "Ketua Riset" || d.peran === "Pembimbing" ? "(Ketua)" : "(Anggota)"}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{r.category} · {r.period_text}</p>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex -space-x-2">
                            {projectMembers.slice(0, 4).map((m: any) => <div key={m.user_id} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black bg-indigo-600 text-white">{m.initials || m.name?.charAt(0)?.toUpperCase()}</div>)}
                            {projectMembers.length > 4 && <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">+{projectMembers.length - 4}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className="bg-[#0AB600] h-1.5 rounded-full" style={{ width: `${r.progress}%` }} /></div>
                            <span className="text-[10px] font-black text-[#0AB600]">{r.progress}%</span>
                          </div>
                        </div>
                        {/* Progress Board Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/operator/progress-board", { state: { projectIds: [r.id] } }); }}
                          className="w-full h-8 flex items-center justify-center gap-2 text-[11px] font-black text-white bg-[#0AB600] hover:bg-[#099800] rounded-[8px] transition-colors"
                        >
                          <Kanban size={13} /> Lihat Progress Board
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead><tr className="bg-slate-50 border-b border-border">
                    {["Judul Riset", "Dosen", "Anggota", "Progress", "Status", ""].map(h => <th key={h} className="px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {filteredRiset.map(r => {
                      const mems = members[r.id] || [];
                      const dosen = mems.filter((m: any) => m.member_type === "Dosen");
                      return (
                        <tr key={r.id} onClick={() => { setSelected(selected?.id === r.id ? null : r); setDetailTab("info"); }} className={`cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === r.id ? "bg-green-50/30" : ""}`}>
                          <td className="px-5 py-3.5 font-black text-foreground max-w-[220px]"><p className="line-clamp-1">{r.title}</p></td>
                          <td className="px-5 py-3.5 text-xs">
                            <div className="flex flex-col gap-0.5">
                              {dosen.map((d: any) => <span key={d.user_id} className={`text-[10px] font-black ${d.peran === "Ketua Riset" || d.peran === "Pembimbing" ? "text-[#0AB600]" : "text-muted-foreground"}`}>{d.name} {d.peran === "Ketua Riset" || d.peran === "Pembimbing" ? "☆" : ""}</span>)}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">{mems.length} org</td>
                          <td className="px-5 py-3.5"><div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-slate-100 rounded-full"><div className="bg-[#0AB600] h-1.5 rounded-full" style={{ width: `${r.progress}%` }} /></div><span className="text-[10px] font-black text-[#0AB600]">{r.progress}%</span></div></td>
                          <td className="px-5 py-3.5"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColor(r.status)}`}>{r.status}</span></td>
                          <td className="px-5 py-3.5"><button onClick={(e) => { e.stopPropagation(); navigate("/operator/progress-board", { state: { projectIds: [r.id] } }); }} className="w-7 h-7 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-green-50 hover:text-[#0AB600] transition-colors"><Kanban size={13} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel – Riset */}
          {selected && (
            <div className="w-[330px] shrink-0 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden max-h-[75vh] overflow-y-auto">
              <div className="h-16 bg-gradient-to-br from-[#0AB600] to-[#065e00] relative">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-0 flex gap-1">
                  {(["info", "anggota", "akses"] as const).map(t => (
                    <button key={t} onClick={() => setDetailTab(t)} className={`px-3 py-2 text-[11px] font-black transition-colors rounded-t-[8px] ${detailTab === t ? "bg-white text-foreground" : "text-white/70 hover:text-white"}`}>
                      {t === "info" ? "Info" : t === "anggota" ? "Tim" : "Board Access"}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSelected(null)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"><X size={14} /></button>
              </div>
              <div className="p-5">
                {detailTab === "info" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColor(selected.status)}`}>{selected.status}</span><button className="flex items-center gap-1 text-[10px] font-black text-[#0AB600] hover:bg-green-50 px-2 py-1 rounded-[8px] transition-colors"><Pencil size={11} /> Edit</button></div>
                    <h3 className="font-black text-foreground leading-snug">{selected.title}</h3>
                    <p className="text-xs text-foreground">{selected.description}</p>
                    {[["Supervisor Ketua", selected.supervisor_name], ["Periode", selected.period_text], ["Mitra", selected.mitra], ["Pendanaan", selected.funding], ["Kategori", selected.category]].map(([l, v]) => (
                      <div key={l} className="flex gap-2 text-xs"><span className="font-black text-muted-foreground w-24 shrink-0">{l}</span><span className="font-bold text-foreground">{v}</span></div>
                    ))}
                    <button
                      onClick={() => navigate("/operator/progress-board", { state: { projectIds: [selected.id] } })}
                      className="w-full h-8 flex items-center justify-center gap-2 text-[11px] font-black text-white bg-[#0AB600] hover:bg-[#099800] rounded-[8px] transition-colors mt-2"
                    >
                      <Kanban size={13} /> Akses Progress Board
                    </button>
                  </div>
                )}

                {detailTab === "anggota" && (
                  <div>
                    {/* Dosen Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide flex items-center gap-1"><BookOpen size={10} /> Dosen Tim ({dosenInRiset.length})</p>
                        <button onClick={() => setAddMemberModal(true)} className="text-[10px] font-black text-[#0AB600] hover:bg-green-50 px-2 py-0.5 rounded-[8px] transition-colors flex items-center gap-0.5"><Plus size={9} strokeWidth={3} /> Tambah</button>
                      </div>
                      {dosenInRiset.map((m: any) => (
                        <div key={m.user_id} className="flex items-center gap-2 py-2 border-b border-border">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 bg-indigo-600 text-white">{m.initials || m.name?.charAt(0)?.toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-foreground truncate">{m.name}</p>
                            <select value={m.peran || "Anggota Dosen"} onChange={(e) => handleUpdateMemberPeran(selected.id, m.user_id, e.target.value)} className="text-[9px] font-black text-muted-foreground bg-transparent border-none outline-none cursor-pointer">
                              {PERAN_DOSEN.map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>
                          <button onClick={() => handleRemoveMember(selected.id, m.user_id)} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                        </div>
                      ))}
                    </div>
                    {/* Mahasiswa Section */}
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1"><Users size={10} /> Mahasiswa ({mahasiswaInRiset.length})</p>
                      {mahasiswaInRiset.map((m: any) => (
                        <div key={m.user_id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 bg-blue-600 text-white">{m.initials || m.name?.charAt(0)?.toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-foreground truncate">{m.name}</p>
                            <select value={m.peran || "Anggota Inti"} onChange={(e) => handleUpdateMemberPeran(selected.id, m.user_id, e.target.value)} className="text-[9px] font-black text-muted-foreground bg-transparent border-none outline-none cursor-pointer">
                              {["Anggota Inti", "Backend Dev", "Frontend Dev", "Hardware Dev", "Data Analyst", "Asisten Peneliti", "Fullstack Dev"].map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>
                          <button onClick={() => handleRemoveMember(selected.id, m.user_id)} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === "akses" && (
                  <div>
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[10px] text-xs text-green-700">
                      <p className="font-black mb-0.5">Board Access Control</p>
                      <p>Operator & Dosen Ketua selalu punya akses edit. Pilih mahasiswa yang juga mendapat akses edit board.</p>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2">Akses Permanen</p>
                    {[{ label: "Semua Operator", sub: "Full access", initials: "OP", color: "bg-amber-500 text-white" }, { label: selected.supervisor_name, sub: "Ketua Riset", initials: selected.supervisor_name?.split(" ").map((part: string) => part[0]).join("").slice(0,2).toUpperCase() || "DS", color: "bg-[#0AB600] text-white" }].map(item => (
                      <div key={item.label} className="flex items-center gap-2 py-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${item.color}`}>{item.initials}</div>
                        <div className="flex-1"><p className="text-xs font-black text-foreground">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.sub}</p></div>
                        <Shield size={12} className="text-emerald-500" />
                      </div>
                    ))}
                    <div className="flex items-center justify-between mt-4 mb-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Mahasiswa Edit Access</p>
                      {nonAccessMembers.length > 0 && <button onClick={() => setAddMemberModal(true)} className="text-[10px] font-black text-[#0AB600] hover:bg-green-50 px-2 py-0.5 rounded-[8px] transition-colors flex items-center gap-0.5"><Plus size={9} strokeWidth={3} /> Beri</button>}
                    </div>
                    {currentAccess.length === 0 ? <p className="text-xs text-muted-foreground italic py-2">Belum ada mahasiswa dengan akses edit.</p>
                      : currentAccess.map(mid => {
                        const m = mahasiswaInRiset.find((x: any) => x.user_id === mid);
                        if (!m) return null;
                        return (
                          <div key={mid} className="flex items-center gap-2 py-2 bg-green-50 border border-green-100 rounded-[10px] px-3 mb-1.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 bg-blue-600 text-white">{m.initials || m.name?.charAt(0)?.toUpperCase()}</div>
                            <div className="flex-1"><p className="text-xs font-black text-foreground">{m.name}</p></div>
                            <button onClick={() => revokeAccess(selected.id, mid)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 text-muted-foreground transition-colors"><X size={10} /></button>
                          </div>
                        );
                      })}
                    {nonAccessMembers.map((m: any) => (
                      <div key={m.user_id} className="flex items-center gap-2 py-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 bg-slate-400 text-white">{m.initials || m.name?.charAt(0)?.toUpperCase()}</div>
                        <div className="flex-1"><p className="text-xs font-black text-foreground">{m.name}</p><p className="text-[9px] text-muted-foreground">Tambah Kartu & Kerjakan Tugas</p></div>
                        <button onClick={() => grantAccess(selected.id, m.user_id)} className="w-6 h-6 rounded-full bg-green-100 hover:bg-[#0AB600] text-[#0AB600] hover:text-white flex items-center justify-center transition-all"><Plus size={10} strokeWidth={3} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {addMemberModal && selected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setAddMemberModal(false)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[480px]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Tambah Anggota</h3>
              <button onClick={() => setAddMemberModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                {allAddable.slice(0, 12).map((p: any) => (
                  <label key={p.user_id} className="flex items-center gap-3 p-3 rounded-[10px] border border-border hover:bg-slate-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedNewMembers.includes(p.user_id)} onChange={() => toggleNewMember(p.user_id)} className="accent-[#0AB600] shrink-0" />
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-indigo-600 text-white">{p.initials || p.name?.charAt(0)?.toUpperCase()}</div>
                    <div className="flex-1"><p className="text-sm font-black text-foreground">{p.name}</p><span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.member_type === "Dosen" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{p.member_type}</span></div>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-xs font-black text-foreground block mb-1.5">Peran</label>
                <select value={selectedPeran} onChange={e => setSelectedPeran(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none cursor-pointer">{[...PERAN_DOSEN, ...PERAN_OPTIONS].map(p => <option key={p}>{p}</option>)}</select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setAddMemberModal(false)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50">Batal</button>
              <button disabled={savingMembers || selectedNewMembers.length === 0} onClick={handleAddMembers} className="flex-1 h-10 bg-[#0AB600] hover:bg-[#099800] disabled:bg-[#8ad98a] text-white text-sm font-black rounded-[10px]">{savingMembers ? "Menyimpan..." : "Tambahkan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Riset Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-black text-foreground">Tambah Riset Baru</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Langkah {step + 1} dari {STEP_LABELS.length}: {STEP_LABELS[step]}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="px-6 pt-4 flex items-center gap-2">
              {STEP_LABELS.map((l, i) => (
                <div key={i} className="contents">
                  <div onClick={() => i < step && setStep(i)} className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-all cursor-pointer ${i === step ? "bg-amber-500 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}</div>
                  {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-emerald-300" : "bg-slate-100"}`} />}
                </div>
              ))}
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {step === 0 && <>
                <div className="col-span-2"><label className="text-xs font-black text-foreground block mb-1.5">Judul Riset</label><input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Judul lengkap penelitian" className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" /></div>
                <div className="col-span-2"><label className="text-xs font-black text-foreground block mb-1.5">Deskripsi</label><textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Ringkasan penelitian..." className="w-full px-3 py-2 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all resize-none" /></div>
                <div><label className="text-xs font-black text-foreground block mb-1.5">Kategori</label><input value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} placeholder="IoT, AI, Blockchain..." className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" /></div>
                <div><label className="text-xs font-black text-foreground block mb-1.5">Status</label><select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none cursor-pointer"><option>Aktif</option><option>Ditangguhkan</option></select></div>
              </>}
              {step === 1 && <>
                <div className="col-span-2"><label className="text-xs font-black text-foreground block mb-1.5">Ketua Dosen</label><select value={formData.supervisorId} onChange={(e) => setFormData(prev => ({ ...prev, supervisorId: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none cursor-pointer"><option value="">-- Pilih Dosen --</option>{lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="col-span-2"><label className="text-xs font-black text-foreground block mb-1.5">Anggota Mahasiswa</label><div className="flex flex-col gap-1.5">{students.map(s => <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground"><input type="checkbox" checked={formData.studentIds.includes(s.id)} onChange={(e) => { if (e.target.checked) { setFormData(prev => ({ ...prev, studentIds: [...prev.studentIds, s.id] })); } else { setFormData(prev => ({ ...prev, studentIds: prev.studentIds.filter(id => id !== s.id) })); } }} className="accent-[#0AB600]" />{s.name}</label>)}</div></div>
              </>}
              {step === 2 && <>
                <div><label className="text-xs font-black text-foreground block mb-1.5">Tanggal Mulai</label><input type="date" value={formData.startDate} onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" /></div>
                <div><label className="text-xs font-black text-foreground block mb-1.5">Tanggal Selesai</label><input type="date" value={formData.endDate} onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" /></div>
                <div className="col-span-2"><label className="text-xs font-black text-foreground block mb-1.5">Mitra</label><input value={formData.mitra} onChange={(e) => setFormData(prev => ({ ...prev, mitra: e.target.value }))} placeholder="Nama institusi mitra" className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" /></div>
                <div className="col-span-2"><label className="text-xs font-black text-foreground block mb-1.5">Sumber Pendanaan</label><input value={formData.funding} onChange={(e) => setFormData(prev => ({ ...prev, funding: e.target.value }))} placeholder="DIKTI, Industri, dll." className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all" /></div>
              </>}
              {step === 3 && <>
                <div className="col-span-2"><label className="text-xs font-black text-foreground block mb-1.5">Milestone</label>
                  <div className="flex flex-col gap-2">
                    {formData.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-2"><div className="flex-1 h-9 px-3 rounded-[10px] border border-border text-sm flex items-center text-foreground">{m}</div><button onClick={() => setFormData(prev => ({ ...prev, milestones: prev.milestones.filter((_, idx) => idx !== i) }))} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"><X size={13} /></button></div>
                    ))}
                    <button onClick={() => setFormData(prev => ({ ...prev, milestones: [...prev.milestones, `Milestone ${prev.milestones.length + 1}`] }))} className="h-9 border-2 border-dashed border-green-200 rounded-[10px] text-xs font-bold text-green-600 hover:bg-green-50 transition-colors">+ Tambah Milestone</button>
                  </div>
                </div>
              </>}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => step > 0 ? setStep(s => s - 1) : setModalOpen(false)} className="flex-1 h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">{step > 0 ? "← Kembali" : "Batal"}</button>
              <button onClick={() => step < STEP_LABELS.length - 1 ? setStep(s => s + 1) : handleCreateResearch()} disabled={savingRiset} className="flex-1 h-10 bg-[#0AB600] hover:bg-[#099800] text-white text-sm font-black rounded-[10px] transition-colors disabled:bg-green-400">
                {savingRiset ? "Menyimpan..." : step < STEP_LABELS.length - 1 ? "Lanjut →" : "Simpan Riset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}