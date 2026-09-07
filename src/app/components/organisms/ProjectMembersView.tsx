import React, { useState } from "react";
import { Download, GraduationCap, UserCheck, UserX } from "lucide-react";

type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  memberType: "Mahasiswa" | "Dosen" | string;
  color: string;
  status?: string;
  mahasiswaTipe?: string;
  bergabung?: string;
  selesai?: string;
};

type Props = {
  members: TeamMember[];
  onExport?: (type: string) => void;
};

export function ProjectMembersView({ members, onExport }: Props) {
  const [activeTab, setActiveTab] = useState<"aktif" | "alumni" | "mengundurkan_diri">("aktif");

  // Only filter Mahasiswa
  const mahasiswaMembers = members.filter(m => m.memberType === "Mahasiswa");

  const aktifMembers = mahasiswaMembers.filter(m => m.status === "Aktif" || !m.status);
  const alumniMembers = mahasiswaMembers.filter(m => m.status === "Alumni" || m.status === "Lulus");
  const undurMembers = mahasiswaMembers.filter(m => m.status === "Mengundurkan Diri" || m.status === "Dikeluarkan" || m.status === "Nonaktif");

  const handleExport = (type: string) => {
    if (onExport) {
      onExport(type);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 p-1">
      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-border p-2">
        <button
          onClick={() => setActiveTab("aktif")}
          className={`flex-1 flex flex-col items-start p-4 rounded-lg transition-all border-b-2 ${
            activeTab === "aktif"
              ? "border-[#0AB600] bg-emerald-50/50"
              : "border-transparent hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={18} className={activeTab === "aktif" ? "text-[#0AB600]" : "text-slate-400"} strokeWidth={2.5} />
            <span className={`font-black ${activeTab === "aktif" ? "text-foreground" : "text-slate-500"}`}>Anggota Aktif</span>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Mahasiswa riset & magang yang sedang aktif</span>
        </button>

        <button
          onClick={() => setActiveTab("alumni")}
          className={`flex-1 flex flex-col items-start p-4 rounded-lg transition-all border-b-2 ${
            activeTab === "alumni"
              ? "border-blue-500 bg-blue-50/50"
              : "border-transparent hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={18} className={activeTab === "alumni" ? "text-blue-500" : "text-slate-400"} strokeWidth={2.5} />
            <span className={`font-black ${activeTab === "alumni" ? "text-foreground" : "text-slate-500"}`}>Alumni</span>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Mahasiswa yang sudah menyelesaikan program</span>
        </button>

        <button
          onClick={() => setActiveTab("mengundurkan_diri")}
          className={`flex-1 flex flex-col items-start p-4 rounded-lg transition-all border-b-2 ${
            activeTab === "mengundurkan_diri"
              ? "border-red-500 bg-red-50/50"
              : "border-transparent hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <UserX size={18} className={activeTab === "mengundurkan_diri" ? "text-red-500" : "text-slate-400"} strokeWidth={2.5} />
            <span className={`font-black ${activeTab === "mengundurkan_diri" ? "text-foreground" : "text-slate-500"}`}>Mengundurkan Diri</span>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Mahasiswa yang mengundurkan diri</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white border border-border rounded-[16px] shadow-sm p-6">
        {activeTab === "aktif" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground text-[#0AB600]">Anggota Aktif ({aktifMembers.length})</h2>
                <p className="text-xs font-medium text-muted-foreground mt-1">Mahasiswa riset & magang yang sedang aktif dalam program ini</p>
              </div>
              <button onClick={() => handleExport("aktif")} className="flex items-center gap-2 px-4 py-2 border border-[#0AB600]/30 text-[#0AB600] hover:bg-emerald-50 rounded-xl text-xs font-bold transition-colors">
                <Download size={14} strokeWidth={2.5} /> Export Daftar Aktif
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {aktifMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-[#0AB600]/40 hover:shadow-sm transition-all bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${m.color || "bg-indigo-500 text-white"}`}>
                      {m.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-800 truncate">{m.name}</span>
                      <span className="text-[10px] font-medium text-slate-500">{m.mahasiswaTipe || "Riset"}</span>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg">
                    {m.role || "Peneliti"}
                  </span>
                </div>
              ))}
              {aktifMembers.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-slate-500 font-medium border border-dashed rounded-xl border-slate-200">
                  Tidak ada anggota aktif
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "alumni" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-blue-600">Alumni ({alumniMembers.length})</h2>
                <p className="text-xs font-medium text-muted-foreground mt-1">Mahasiswa yang telah menyelesaikan program ini</p>
              </div>
              <button onClick={() => handleExport("alumni")} className="flex items-center gap-2 px-4 py-2 border border-blue-500/30 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors">
                <Download size={14} strokeWidth={2.5} /> Export Daftar Alumni
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {alumniMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl hover:border-blue-400 hover:shadow-sm transition-all bg-white">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-blue-100 text-blue-600">
                    <GraduationCap size={16} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-800 truncate">{m.name}</span>
                    <span className="text-[10px] font-medium text-slate-500">Alumni {m.selesai ? m.selesai.substring(0, 4) : ""}</span>
                  </div>
                </div>
              ))}
              {alumniMembers.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-slate-500 font-medium border border-dashed rounded-xl border-slate-200">
                  Tidak ada data alumni
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "mengundurkan_diri" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-red-500">Mengundurkan Diri ({undurMembers.length})</h2>
                <p className="text-xs font-medium text-muted-foreground mt-1">Mahasiswa yang mengundurkan diri dari program ini</p>
              </div>
              <button onClick={() => handleExport("mengundurkan_diri")} className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors">
                <Download size={14} strokeWidth={2.5} /> Export Daftar Undur Diri
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {undurMembers.map(m => {
                const undurDate = m.selesai ? new Date(m.selesai).toLocaleDateString("id-ID", { month: "short", year: "numeric" }) : "";
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl hover:border-red-400 hover:shadow-sm transition-all bg-white">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-red-100 text-red-500">
                      <UserX size={16} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-800 truncate">{m.name}</span>
                      <span className="text-[10px] font-medium text-slate-500">Undur diri: {undurDate || "-"}</span>
                    </div>
                  </div>
                );
              })}
              {undurMembers.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-slate-500 font-medium border border-dashed rounded-xl border-slate-200">
                  Tidak ada data mahasiswa mengundurkan diri
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
