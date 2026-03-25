import React, { useState } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { Kanban, Shield, Users, Check, X, Plus, Trash2, Eye } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../../lib/api";

export default function BoardControl() {
  const [researchList, setResearchList] = useState<Array<any>>([]);
  const [membersMap, setMembersMap] = useState<Record<string, any[]>>({});
  const [boardCountsMap, setBoardCountsMap] = useState<Record<string, { todo: number; doing: number; review: number; done: number }>>({});
  const [selectedRiset, setSelectedRiset] = useState("");
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({});
  const [addModal, setAddModal] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    const loadResearch = async () => {
      try {
        const rows = await apiGet<Array<any>>("/research");
        setResearchList(rows || []);
        if ((rows || []).length > 0) {
          setSelectedRiset(rows[0].id);
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data riset");
      }
    };

    loadResearch();
  }, []);

  React.useEffect(() => {
    const loadMembers = async () => {
      if (!selectedRiset) return;
      try {
        const [members, accessRows, boardData] = await Promise.all([
          apiGet<Array<any>>(`/research/${selectedRiset}/members`),
          apiGet<Array<any>>(`/research/${selectedRiset}/board-access`),
          apiGet<any>(`/research/${selectedRiset}/board`)
        ]);
        setMembersMap((prev) => ({
          ...prev,
          [selectedRiset]: (members || []).map((member) => ({
            memberId: member.user_id,
            nama: member.name,
            initials: member.initials,
            tipe: member.member_type,
            peran: member.peran || "Anggota",
            color: member.member_type === "Mahasiswa" ? "bg-[#8B6FFF] text-white" : "bg-blue-500 text-white"
          }))
        }));
        setAccessMap((prev) => ({
          ...prev,
          [selectedRiset]: (accessRows || []).map((item) => item.user_id)
        }));
        setBoardCountsMap((prev) => ({
          ...prev,
          [selectedRiset]: boardData?.counts || { todo: 0, doing: 0, review: 0, done: 0 }
        }));
      } catch (err: any) {
        setError(err?.message || "Gagal memuat akses board");
      }
    };

    loadMembers();
  }, [selectedRiset]);

  const riset = researchList.find(r => r.id === selectedRiset);
  const mahasiswaMembers = (membersMap[selectedRiset] || []).filter(m => m.tipe === "Mahasiswa");
  const currentAccess = accessMap[selectedRiset] || [];
  const bc = boardCountsMap[selectedRiset] || { todo: 0, doing: 0, review: 0, done: 0 };

  const revokeAccess = async (id: string) => {
    try {
      await apiDelete(`/research/${selectedRiset}/board-access/${id}`);
      setAccessMap(prev => ({ ...prev, [selectedRiset]: prev[selectedRiset].filter(x => x !== id) }));
    } catch (err: any) {
      setError(err?.message || "Gagal mencabut akses");
    }
  };
  const grantAccess = async (id: string) => {
    try {
      await apiPost(`/research/${selectedRiset}/board-access`, { userId: id });
      setAccessMap(prev => ({ ...prev, [selectedRiset]: [...(prev[selectedRiset] || []), id] }));
      setAddModal(false);
    } catch (err: any) {
      setError(err?.message || "Gagal memberi akses");
    }
  };

  const nonAccessMembers = mahasiswaMembers.filter(m => !currentAccess.includes(m.memberId));

  return (
    <OperatorLayout title="Control Progress Board">
      <div className="flex gap-5 items-start pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Left: Research Selector */}
        <div className="w-[240px] shrink-0 bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2"><Kanban size={15} className="text-amber-500" /> Daftar Board Riset</h3>
          </div>
          <div className="divide-y divide-border">
            {researchList.map(r => {
              const bc2 = boardCountsMap[r.id] || { todo: 0, doing: 0, review: 0, done: 0 };
              const total = bc2.todo + bc2.doing + bc2.review + bc2.done;
              const isActive = selectedRiset === r.id;
              return (
                <button key={r.id} onClick={() => setSelectedRiset(r.id)}
                  className={`w-full text-left px-4 py-4 transition-colors hover:bg-amber-50/40 ${isActive ? "bg-amber-50 border-l-[3px] border-amber-500" : "border-l-[3px] border-transparent"}`}>
                  <p className={`text-xs font-black leading-snug ${isActive ? "text-amber-700" : "text-foreground"}`}>{(r.short_title || r.title || "").split("–")[1]?.trim() || r.short_title || r.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{total} tugas total</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${r.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                    <span className="text-[9px] text-muted-foreground">{(accessMap[r.id] || []).length} punya akses edit</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Main Content */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">

          {/* Research Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[14px] p-5 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 90% 50%, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full mb-2 inline-block ${riset?.status === "Aktif" ? "bg-emerald-400/30 text-emerald-300" : "bg-white/20 text-white/70"}`}>{riset?.status || "-"}</span>
                <h2 className="font-black text-lg">{riset?.title || "-"}</h2>
                <p className="text-sm text-white/70 mt-0.5">{riset?.supervisor_name || "-"} · {riset?.period_text || "-"}</p>
              </div>
              <div className="grid grid-cols-4 gap-3 shrink-0">
                {[["To Do", bc?.todo, "bg-slate-600"], ["Doing", bc?.doing, "bg-blue-600"], ["Review", bc?.review, "bg-amber-600"], ["Done", bc?.done, "bg-emerald-600"]].map(([l, v, c]) => (
                  <div key={String(l)} className={`${c} rounded-[10px] px-3 py-2 text-center`}>
                    <p className="text-xl font-black text-white">{v}</p>
                    <p className="text-[9px] font-black text-white/70 uppercase">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Access Control Panel */}
          <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-foreground flex items-center gap-2"><Shield size={15} className="text-amber-500" /> Kontrol Akses Board</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Operator dan Dosen Ketua selalu memiliki akses edit. Pilih mahasiswa yang juga mendapat akses.</p>
              </div>
              <button onClick={() => setAddModal(true)} disabled={nonAccessMembers.length === 0}
                className="flex items-center gap-2 h-9 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-black rounded-[10px] transition-colors shadow-sm">
                <Plus size={14} strokeWidth={3} /> Beri Akses Mahasiswa
              </button>
            </div>

            {/* Always has access */}
            <div className="p-5 border-b border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-3">Akses Permanen (Tidak Dapat Diubah)</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Semua Operator", color: "bg-amber-500 text-white", initials: "OP", sub: "Akses penuh ke semua board" },
                  { label: riset?.supervisor_name || "Dosen", color: "bg-indigo-600 text-white", initials: riset?.supervisor_initials || "DS", sub: "Dosen Ketua Riset" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-[12px]">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${item.color}`}>{item.initials}</div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={10} strokeWidth={3} /> Full Access</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mahasiswa with edit access */}
            <div className="p-5 border-b border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-3">Mahasiswa dengan Akses Edit Board</p>
              {currentAccess.length === 0 ? (
                <div className="py-6 text-center">
                  <Shield size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">Belum ada mahasiswa dengan akses edit</p>
                  <p className="text-xs text-muted-foreground mt-1">Klik "Beri Akses Mahasiswa" untuk menambah</p>
                </div>
              ) : currentAccess.map(mid => {
                const m = mahasiswaMembers.find(x => x.memberId === mid);
                if (!m) return null;
                return (
                  <div key={mid} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-[12px] mb-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${m.color}`}>{m.initials}</div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground">{m.nama}</p>
                      <p className="text-[10px] text-muted-foreground">{m.peran}</p>
                    </div>
                    <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full">Edit Access</span>
                    <button onClick={() => revokeAccess(mid)} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Regular members */}
            <div className="p-5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-3">Anggota Mahasiswa (Akses Terbatas)</p>
              <div className="flex flex-col gap-2">
                {mahasiswaMembers.filter(m => !currentAccess.includes(m.memberId)).map(m => (
                  <div key={m.memberId} className="flex items-center gap-3 p-3 bg-slate-50 border border-border rounded-[12px]">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${m.color}`}>{m.initials}</div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground">{m.nama}</p>
                      <p className="text-[10px] text-muted-foreground">{m.peran}</p>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">Tambah Kartu & Kerjakan Tugas</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-slate-50 border border-border rounded-[10px]">
                <p className="text-[10px] font-black text-muted-foreground mb-1">Hak Akses Mahasiswa Biasa:</p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                  <li>✅ Menambah kartu baru di kolom To Do</li>
                  <li>✅ Mengerjakan kartu yang ditugaskan ke dirinya</li>
                  <li>❌ Tidak dapat memindahkan kartu anggota lain</li>
                  <li>❌ Tidak dapat mengedit/menghapus kartu anggota lain</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Access Modal */}
      {addModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setAddModal(false)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-foreground">Pilih Mahasiswa</h3>
              <button onClick={() => setAddModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-4 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {nonAccessMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Semua mahasiswa sudah punya akses edit.</p>
              ) : nonAccessMembers.map(m => (
                <button key={m.memberId} onClick={() => grantAccess(m.memberId)}
                  className="flex items-center gap-3 p-3 rounded-[12px] border border-border hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${m.color}`}>{m.initials}</div>
                  <div className="flex-1">
                    <p className="font-black text-foreground">{m.nama}</p>
                    <p className="text-xs text-muted-foreground">{m.peran}</p>
                  </div>
                  <Plus size={15} className="text-amber-500" strokeWidth={3} />
                </button>
              ))}
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => setAddModal(false)} className="w-full h-10 border border-border rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
