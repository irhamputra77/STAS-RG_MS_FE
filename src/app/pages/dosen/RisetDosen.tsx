import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { DosenLayout } from "../../components/DosenLayout";
import { Pencil, Users, Target, X, Kanban, FileText, MessageSquare, Plus, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiDelete, getStoredUser } from "../../lib/api";

export default function RisetDosen() {
  const user = getStoredUser();
  const [researches, setResearches] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [panelTab, setPanelTab] = useState<"info" | "dokumen" | "catatan">("info");
  const [error, setError] = useState("");
  const [teamManageModal, setTeamManageModal] = useState<any | null>(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberType, setNewMemberType] = useState<"Dosen" | "Mahasiswa">("Mahasiswa");
  const [newMemberRole, setNewMemberRole] = useState("Anggota");

  useEffect(() => {
    const loadRiset = async () => {
      setError("");
      try {
        if (!user?.id) {
          setResearches([]);
          setMemberships({});
          return;
        }

        const [projects, assigned] = await Promise.all([
          apiGet<Array<any>>("/research"),
          apiGet<Array<any>>(`/research/assigned?userId=${encodeURIComponent(user.id)}`)
        ]);
        const assignedIds = new Set((assigned || []).map((item) => item.id));
        const assignedProjects = (projects || []).filter((item) => assignedIds.has(item.id));

        const mappedProjects = assignedProjects.map((item) => ({
          id: item.id,
          title: item.title,
          shortTitle: item.short_title || item.title,
          supervisor: item.supervisor_name || "-",
          supervisorInitials: item.supervisor_initials || "-",
          period: item.period_text || "-",
          mitra: item.mitra || "-",
          status: item.status,
          progress: Number(item.progress) || 0,
          mahasiswaCount: 0,
          dosenCount: 0,
          category: item.category || "-",
          description: item.description || "-",
          funding: item.funding || "-",
          milestones: [] as { label: string; done: boolean; date: string }[]
        }));

        const membershipsEntries = await Promise.all(
          mappedProjects.map(async (project) => {
            const members = await apiGet<Array<any>>(`/research/${project.id}/members`);
            const mappedMembers = members.map((member) => ({
              memberId: member.user_id,
              nama: member.name,
              initials: member.initials || member.name?.slice(0, 2)?.toUpperCase() || "M",
              color: member.role === "dosen" ? "bg-blue-500 text-white" : "bg-[#8B6FFF] text-white",
              tipe: member.member_type === "Dosen" || member.role === "dosen" ? "Dosen" : "Mahasiswa",
              peran: member.peran || "Anggota",
              bergabung: member.bergabung || "-",
              status: member.status || "Aktif"
            }));
            return [project.id, mappedMembers] as const;
          })
        );

        setResearches(mappedProjects as any);
        setMemberships(Object.fromEntries(membershipsEntries) as any);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data riset dosen.");
      }
    };

    loadRiset();
  }, [user?.id]);

  const handleAddTeamMember = async () => {
    if (!teamManageModal || !newMemberName.trim()) return;
    try {
      await apiPost(`/research/${teamManageModal.id}/members`, {
        memberId: `TM${Date.now()}`,
        name: newMemberName,
        memberType: newMemberType,
        peran: newMemberRole
      });

      const updatedMembers = await apiGet<Array<any>>(`/research/${teamManageModal.id}/members`);
      const mappedMembers = updatedMembers.map((member) => ({
        memberId: member.user_id,
        nama: member.name,
        initials: member.initials || member.name?.slice(0, 2)?.toUpperCase() || "M",
        color: member.role === "dosen" ? "bg-blue-500 text-white" : "bg-[#8B6FFF] text-white",
        tipe: member.member_type === "Dosen" || member.role === "dosen" ? "Dosen" : "Mahasiswa",
        peran: member.peran || "Anggota",
        bergabung: member.bergabung || "-",
        status: member.status || "Aktif"
      }));

      setMemberships(prev => ({ ...prev, [teamManageModal.id]: mappedMembers }));
      setTeamManageModal({ ...teamManageModal });
      setNewMemberName("");
      setNewMemberType("Mahasiswa");
      setNewMemberRole("Anggota");
    } catch (err: any) {
      setError(err?.message || "Gagal menambahkan anggota tim.");
    }
  };

  const handleRemoveTeamMember = async (projectId: string, memberId: string) => {
    try {
      await apiDelete(`/research/${projectId}/members/${memberId}`);
      const updatedMembers = await apiGet<Array<any>>(`/research/${projectId}/members`);
      const mappedMembers = updatedMembers.map((member) => ({
        memberId: member.user_id,
        nama: member.name,
        initials: member.initials || member.name?.slice(0, 2)?.toUpperCase() || "M",
        color: member.role === "dosen" ? "bg-blue-500 text-white" : "bg-[#8B6FFF] text-white",
        tipe: member.member_type === "Dosen" || member.role === "dosen" ? "Dosen" : "Mahasiswa",
        peran: member.peran || "Anggota",
        bergabung: member.bergabung || "-",
        status: member.status || "Aktif"
      }));

      setMemberships(prev => ({ ...prev, [projectId]: mappedMembers }));
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus anggota tim.");
    }
  };

  const myRiset = researches;

  return (
    <DosenLayout title="Riset yang Dipimpin">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-5 items-start">
        {/* Research Cards */}
        <div className="flex-1 flex flex-col gap-5">
          {myRiset.map(r => {
            const members = memberships[r.id] || [];
            const dosen = members.filter(m => m.tipe === "Dosen");
            const mahasiswa = members.filter(m => m.tipe === "Mahasiswa");
            const doneMilestone = r.milestones.filter(m => m.done).length;
            return (
              <div key={r.id} className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden hover:shadow-md transition-all">
                {/* Gradient header */}
                <div className="bg-gradient-to-br from-indigo-700 to-[#1A1A2E] p-6 text-white relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 90% 20%, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.status === "Aktif" ? "bg-emerald-400/30 text-emerald-200" : "bg-white/20 text-white/70"}`}>{r.status}</span>
                        <span className="text-[10px] text-white/60">{r.category}</span>
                      </div>
                      <h2 className="font-black text-lg leading-snug mb-1">{r.title}</h2>
                      <p className="text-sm text-white/70">{r.period} · {r.mitra.split("&")[0].trim()}</p>
                    </div>
                    <button className="w-9 h-9 rounded-[10px] bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0"><Pencil size={16} /></button>
                  </div>
                </div>

                <div className="p-5">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 pb-5 border-b border-border">
                    {[["Supervisor", r.supervisor], ["Mitra", r.mitra.split("&")[0].trim()], ["Pendanaan", r.funding.split("–")[0].trim()], ["Progress", `${r.progress}%`]].map(([l, v]) => (
                      <div key={l} className="bg-slate-50 border border-border rounded-[10px] p-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-0.5">{l}</p>
                        <p className="text-xs font-black text-foreground">{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-foreground">Progress Keseluruhan</span>
                      <span className="text-xs font-black text-indigo-600">{doneMilestone}/{r.milestones.length} milestone</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${r.progress}%` }} /></div>
                  </div>

                  {/* Milestone */}
                  <div className="mb-5 pb-5 border-b border-border">
                    <p className="text-xs font-black text-foreground mb-2 flex items-center gap-1"><Target size={13} /> Timeline Milestone</p>
                    <div className="flex items-center gap-0">
                      {r.milestones.map((m, i, arr) => (
                        <div key={i} className="contents">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${m.done ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 bg-white"}`}>
                              {m.done && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M1 5l3 3 5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
                            </div>
                            <span className="text-[8px] font-bold text-muted-foreground whitespace-nowrap">{m.label.length > 7 ? m.label.slice(0, 6) + "…" : m.label}</span>
                          </div>
                          {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-0.5 mb-3.5 ${m.done && arr[i + 1].done ? "bg-indigo-500" : "bg-slate-100"}`} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team */}
                  <div className="mb-5 pb-5 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-foreground flex items-center gap-1"><Users size={13} /> Tim Penelitian ({members.length})</p>
                      <button onClick={() => setTeamManageModal(r)} className="text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-2 py-0.5 rounded-[8px] transition-colors flex items-center gap-0.5"><Plus size={10} strokeWidth={3} /> Kelola Tim</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {members.map(m => (
                        <div key={m.memberId} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-[10px] border border-border">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${m.color}`}>{m.initials}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-foreground truncate">{m.nama}</p>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${m.tipe === "Dosen" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{m.tipe}</span>
                              <span className="text-[9px] text-muted-foreground">{m.peran}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-3">
                    <Link to="/dosen/progress" className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                      <Kanban size={14} /> Lihat Progress Board
                    </Link>
                    <button onClick={() => { setSelected(r); setPanelTab("info"); }} className="flex-1 h-10 bg-slate-50 hover:bg-slate-100 border border-border text-foreground text-xs font-black rounded-[10px] transition-colors flex items-center justify-center gap-2">
                      <FileText size={14} /> Detail & Dokumen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Float Detail Panel */}
        {selected && (
          <div className="w-[320px] shrink-0 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden max-h-[calc(100vh-140px)] overflow-y-auto sticky top-0">
            <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  {[["info", "Info"], ["dokumen", "Dokumen"], ["catatan", "Catatan"]].map(([t, l]) => (
                    <button key={t} onClick={() => setPanelTab(t as any)} className={`px-2.5 py-1 rounded-[8px] text-[11px] font-black transition-colors ${panelTab === t ? "bg-white text-indigo-700" : "text-white/70 hover:text-white"}`}>{l}</button>
                  ))}
                </div>
                <button onClick={() => setSelected(null)} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"><X size={12} /></button>
              </div>
              <h3 className="font-black text-sm leading-snug">{selected.shortTitle.split("–")[1]?.trim()}</h3>
            </div>
            <div className="p-4">
              {panelTab === "info" && (
                <div className="flex flex-col gap-3 text-xs">
                  {[["Periode", selected.period], ["Mitra", selected.mitra], ["Pendanaan", selected.funding], ["Kategori", selected.category]].map(([l, v]) => (
                    <div key={l}><p className="font-black text-muted-foreground mb-0.5">{l}</p><p className="font-bold text-foreground">{v}</p></div>
                  ))}
                  <div><p className="font-black text-muted-foreground mb-0.5">Deskripsi</p><p className="text-foreground leading-relaxed">{selected.description}</p></div>
                </div>
              )}
              {panelTab === "dokumen" && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-black text-muted-foreground mb-1">Dokumen Terlampir</p>
                  {["Proposal Penelitian v2.pdf", "Laporan Kemajuan Q1.pdf", "Data Sensor Export.xlsx"].map(d => (
                    <div key={d} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-border rounded-[10px]">
                      <FileText size={13} className="text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-foreground flex-1 truncate">{d}</span>
                    </div>
                  ))}
                  <button className="mt-2 h-9 border-2 border-dashed border-indigo-200 rounded-[10px] text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"><Plus size={12} /> Upload Dokumen</button>
                </div>
              )}
              {panelTab === "catatan" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-black text-muted-foreground">Catatan Rapat Tim</p>
                  {["12 Mar – Review Bab 3 metodologi", "05 Mar – Presentasi progress semester", "22 Feb – Kick-off meeting anggota baru"].map((c, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 border border-border rounded-[10px]">
                      <p className="text-xs font-bold text-foreground">{c}</p>
                    </div>
                  ))}
                  <textarea rows={2} placeholder="Tambah catatan rapat..." className="w-full px-3 py-2 rounded-[10px] border border-border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none" />
                  <button className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-[10px] transition-colors flex items-center justify-center gap-1"><MessageSquare size={12} /> Simpan Catatan</button>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Team Management Modal */}
      {teamManageModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setTeamManageModal(null)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Kelola Tim Penelitian</h3>
              <button onClick={() => setTeamManageModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {/* Current Members */}
              <div>
                <p className="text-xs font-black text-foreground mb-2">Anggota Tim Saat Ini</p>
                <div className="space-y-2">
                  {(memberships[teamManageModal.id] || []).map(m => (
                    <div key={m.memberId} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-border rounded-[10px]">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${m.color}`}>{m.initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{m.nama}</p>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${m.tipe === "Dosen" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{m.tipe}</span>
                          <span className="text-[9px] text-muted-foreground">{m.peran}</span>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveTeamMember(teamManageModal.id, m.memberId)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-[8px] transition-colors"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Add New Member */}
              <div>
                <p className="text-xs font-black text-foreground mb-2">Tambah Anggota Tim</p>
                <div className="space-y-2.5">
                  <input type="text" placeholder="Nama anggota..." value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newMemberType} onChange={e => setNewMemberType(e.target.value as any)} className="h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all">
                      <option>Mahasiswa</option>
                      <option>Dosen</option>
                    </select>
                    <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} className="h-10 px-3 rounded-[10px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all">
                      <option>Anggota</option>
                      <option>Ketua</option>
                      <option>Asisten</option>
                      <option>Analis Data</option>
                    </select>
                  </div>
                  <button onClick={handleAddTeamMember} disabled={!newMemberName.trim()} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-black rounded-[10px] transition-colors flex items-center justify-center gap-1">
                    <Plus size={14} /> Tambahkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DosenLayout>
  );
}
