import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { 
  ChevronDown, 
  MessageSquare,
  AlertTriangle,
  Check,
  X,
  Paperclip,
  UploadCloud,
  Link,
  Download,
  Send,
  FileText,
  Image as ImageIcon,
  Folder,
  Calendar,
  Plus,
  Trash2,
  Edit2
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";

type Milestone = { id?: number; label: string; done: boolean; sortOrder?: number };
type ResearchProject = any;

// ── Interactive Milestone Banner ──────────────────────────────────────────────
function MilestoneBanner({
  milestones,
  progressColor,
  onToggle,
  onManage,
}: {
  milestones: Milestone[];
  progressColor: string;
  onToggle: (i: number) => void;
  onManage: () => void;
}) {
  return (
    <div className="flex items-end gap-0 w-full group/banner">
      {milestones.map((m, i, arr) => (
        <div key={i} className="contents">
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => onToggle(i)}
              title={m.done ? `Tandai "${m.label}" belum selesai` : `Tandai "${m.label}" selesai`}
              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 hover:shadow-md focus:outline-none ${
                m.done
                  ? `${progressColor} border-transparent text-white`
                  : "bg-white border-[#D4C5FF] hover:border-[#9E8BFF]"
              }`}
            >
              {m.done ? (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
                  <path d="M1 6l3.5 3.5L11 2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4C5FF]" />
              )}
            </button>
            <span className={`text-[9px] font-bold whitespace-nowrap transition-colors ${
              m.done ? "text-[#9E8BFF]" : "text-[#C5AEFF]/70"
            }`}>
              {m.label}
            </span>
          </div>
          {i < arr.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${
              m.done && arr[i + 1].done ? progressColor
              : m.done ? `${progressColor} opacity-30`
              : "bg-[#E9E0FF]"
            }`} />
          )}
        </div>
      ))}
      <button
        onClick={onManage}
        className="ml-4 mb-4 shrink-0 flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E9E0FF] hover:border-[#9E8BFF] hover:bg-[#F8F5FF] rounded-lg text-[10px] font-black text-[#9E8BFF] hover:text-[#6C47FF] transition-all opacity-0 group-hover/banner:opacity-100 shadow-sm whitespace-nowrap"
      >
        <Edit2 size={10} strokeWidth={3} /> Kelola
      </button>
    </div>
  );
}

export default function ScrumBoard() {
  const [researchProjects, setResearchProjects] = React.useState<ResearchProject[]>([]);
  const [boardTasks, setBoardTasks] = React.useState<any>({ todo: [], doing: [], review: [], done: [] });
  const [activeProjectId, setActiveProjectId] = React.useState("A");
  const activeProject = researchProjects.find((r) => r.id === activeProjectId) || {
    id: "-",
    shortTitle: "Belum ada riset",
    period: "-",
    mitra: "-",
    progress: 0,
    tugasSelesai: 0,
    tugasTotal: 0,
    progressColor: "bg-[#6C47FF]",
    teamMembers: [],
    ketuaInitials: ""
  };

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await apiGet<Array<any>>(`/research`);
        const mapped = await Promise.all(
          (projects || []).map(async (item) => {
            const milestones = await apiGet<Array<any>>(`/research/${item.id}/milestones`).catch(() => []);
            return {
              id: item.id,
              shortTitle: item.short_title || item.title,
              period: item.period_text || "-",
              mitra: item.mitra || "-",
              progress: Number(item.progress) || 0,
              tugasSelesai: Math.max(0, Math.round((Number(item.progress) || 0) / 10)),
              tugasTotal: 10,
              progressColor: "bg-[#6C47FF]",
              teamMembers: [],
              ketuaInitials: "",
              milestones: (milestones || []).map((milestone) => ({
                id: milestone.id,
                label: milestone.label,
                done: Boolean(milestone.done),
                sortOrder: milestone.sort_order
              }))
            };
          })
        );

        setResearchProjects(mapped);
        if (mapped.length > 0) {
          setActiveProjectId(mapped[0].id);
        }
      } catch {
      }
    };

    loadProjects();
  }, []);

  React.useEffect(() => {
    const loadBoard = async () => {
      if (!activeProjectId) return;
      try {
        const data = await apiGet<any>(`/research/${activeProjectId}/board`);
        const mapTask = (task: any, status: string) => ({
          ...task,
          status,
          assignees: ["TM"],
          comments: 0,
          tag: "Riset",
          isOverdue: false,
          sp: 3
        });
        setBoardTasks({
          todo: (data?.columns?.todo || []).map((task: any) => mapTask(task, "TO DO")),
          doing: (data?.columns?.doing || []).map((task: any) => mapTask(task, "DOING")),
          review: (data?.columns?.review || []).map((task: any) => mapTask(task, "REVIEW")),
          done: (data?.columns?.done || []).map((task: any) => mapTask(task, "DONE"))
        });
      } catch {
      }
    };

    loadBoard();
  }, [activeProjectId]);

  // ── Milestone state (editable, per project) ──────────────────────────────
  const [milestonesMap, setMilestonesMap] = React.useState<Record<string, Milestone[]>>({});
  React.useEffect(() => {
    if (researchProjects.length === 0) return;
    setMilestonesMap(Object.fromEntries(researchProjects.map((r) => [r.id, (r.milestones || []).map((m: any) => ({ ...m }))])));
  }, [researchProjects]);
  const milestones = milestonesMap[activeProjectId] || [];

  const toggleMilestone = async (index: number) => {
    const current = milestones[index];
    if (!current?.id) return;
    await apiPatch(`/research/${activeProjectId}/milestones/${current.id}`, {
      done: !current.done
    });
    setMilestonesMap((prev) => {
      const updated = (prev[activeProjectId] || []).map((m, i) => i === index ? { ...m, done: !m.done } : m);
      return { ...prev, [activeProjectId]: updated };
    });
  };

  const addMilestone = async (label: string) => {
    if (!label.trim()) return;
    const response = await apiPost<any>(`/research/${activeProjectId}/milestones`, {
      label: label.trim(),
      done: false,
      sortOrder: milestones.length
    });
    setMilestonesMap((prev) => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), { id: response?.id, label: label.trim(), done: false, sortOrder: milestones.length }],
    }));
  };

  const deleteMilestone = async (index: number) => {
    const current = milestones[index];
    if (current?.id) {
      await apiDelete(`/research/${activeProjectId}/milestones/${current.id}`);
    }
    setMilestonesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).filter((_, i) => i !== index),
    }));
  };

  const renameMilestone = async (index: number, label: string) => {
    const current = milestones[index];
    if (current?.id) {
      await apiPatch(`/research/${activeProjectId}/milestones/${current.id}`, { label });
    }
    setMilestonesMap((prev) => {
      const updated = (prev[activeProjectId] || []).map((m, i) => i === index ? { ...m, label } : m);
      return { ...prev, [activeProjectId]: updated };
    });
  };

  const moveMilestone = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= milestones.length) return;
    setMilestonesMap((prev) => {
      const arr = [...(prev[activeProjectId] || [])];
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...prev, [activeProjectId]: arr };
    });
  };

  // Derived: active milestone label
  const activeMilestoneLabel = milestones.find((m) => !m.done)?.label ?? "Semua Selesai ✓";
  // Derived: progress % from done/total milestones
  const milestoneProgress = milestones.length
    ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
    : 0;

  // ── Milestone modal state ────────────────────────────────────────────────
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = React.useState(false);
  const [newMilestoneLabel, setNewMilestoneLabel] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingLabel, setEditingLabel] = React.useState("");

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'detail' | 'lampiran' | 'komentar'>('detail');
  
  // New states for the modals
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditBoardModalOpen, setIsEditBoardModalOpen] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [subtasks, setSubtasks] = useState([""]); // For Add Task form

  const columns = [
    { 
      id: 'todo', 
      title: 'TO DO', 
      count: (boardTasks.todo || []).length, 
      bg: 'bg-slate-50', 
      iconColor: 'bg-slate-300', 
      textColor: 'text-slate-600',
      pillBg: 'bg-slate-200 text-slate-700'
    },
    { 
      id: 'doing', 
      title: 'DOING', 
      count: (boardTasks.doing || []).length, 
      bg: 'bg-blue-50/50', 
      iconColor: 'bg-blue-400', 
      textColor: 'text-blue-600',
      pillBg: 'bg-blue-100 text-blue-700'
    },
    { 
      id: 'review', 
      title: 'REVIEW', 
      count: (boardTasks.review || []).length, 
      bg: 'bg-amber-50/50', 
      iconColor: 'bg-amber-400', 
      textColor: 'text-amber-600',
      pillBg: 'bg-amber-100 text-amber-700'
    },
    { 
      id: 'done', 
      title: 'DONE', 
      count: (boardTasks.done || []).length, 
      bg: 'bg-emerald-50/50', 
      iconColor: 'bg-emerald-400', 
      textColor: 'text-emerald-600',
      pillBg: 'bg-emerald-100 text-emerald-700'
    },
  ];

  // ── Helpers derived from shared research data ──────────────────────────────
  const teamMembers = activeProject.teamMembers;

  const getAssigneeColor = (initials: string) =>
    teamMembers.find((m) => m.initials === initials)?.color ?? "bg-slate-300 text-white";

  const getMemberName = (initials: string) =>
    teamMembers.find((m) => m.initials === initials)?.name ?? initials;

  const ketuaMember = teamMembers.find((m) => m.initials === activeProject.ketuaInitials);

  const tasks = {
    todo: [
      { 
        id: '1', 
        title: 'Analisis Dataset Sensor Suhu dari Node Ke-8', 
        deadline: '10 Mar 2026', 
        isOverdue: true,
        tag: 'Backend', 
        sp: 3,
        status: 'TO DO',
        assignees: ['IR'], 
        comments: 2 
      },
      { 
        id: '2', 
        title: 'Tulis Bab 3 Metodologi untuk Laporan TA', 
        deadline: '15 Mar 2026', 
        isOverdue: false,
        tag: 'Penulis TA', 
        sp: 5,
        status: 'TO DO',
        assignees: ['IR'], 
        comments: 0 
      },
      { 
        id: '3', 
        title: 'Optimasi Hyperparameter Model LSTM', 
        deadline: '20 Mar 2026', 
        isOverdue: false,
        tag: 'Backend', 
        sp: 8,
        status: 'TO DO',
        assignees: ['IR', 'RP'], 
        comments: 1 
      },
    ],
    doing: [
      { 
        id: '4', 
        title: 'Implementasi Model LSTM dengan TensorFlow', 
        deadline: '8 Mar 2026', 
        isOverdue: true,
        progress: 70,
        tag: 'Backend', 
        sp: 13,
        status: 'DOING',
        assignees: ['IR'], 
        comments: 5 
      },
      { 
        id: '5', 
        title: 'Integrasi Sensor Node dengan MQTT Broker', 
        deadline: '12 Mar 2026', 
        isOverdue: false,
        progress: 40,
        tag: 'Hardware', 
        sp: 5,
        status: 'DOING',
        assignees: ['RP', 'DA'], 
        comments: 3 
      },
    ],
    review: [
      { 
        id: '6', 
        title: 'Dokumentasi API Endpoint v1.0', 
        statusText: 'Menunggu review dosen',
        tag: 'Dokumentasi', 
        sp: 2,
        status: 'REVIEW',
        assignees: ['IR'], 
        comments: 2 
      },
      { 
        id: '7', 
        title: 'Draft Jurnal Konferensi ICACSIS 2026', 
        statusText: 'Review oleh: Dr. Andi Kurniawan',
        tag: 'Jurnal', 
        sp: 8,
        status: 'REVIEW',
        assignees: ['IR', 'RP'], 
        comments: 4 
      },
    ],
    done: [
      { 
        id: '8', 
        title: 'Setup Environment TensorFlow + CUDA', 
        statusText: 'Selesai 28 Feb 2026',
        tag: 'Done', 
        sp: 3,
        status: 'DONE',
        assignees: ['IR'], 
        comments: 1 
      },
      { 
        id: '9', 
        title: 'Studi Literatur & Survey Paper', 
        statusText: 'Selesai 25 Feb 2026',
        tag: 'Done', 
        sp: 5,
        status: 'DONE',
        assignees: ['IR', 'RP'], 
        comments: 2 
      },
      { 
        id: '10', 
        title: 'Perancangan Arsitektur Sistem', 
        statusText: 'Selesai 20 Feb 2026',
        tag: 'Done', 
        sp: 8,
        status: 'DONE',
        assignees: ['IR'], 
        comments: 0 
      },
    ],
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Backend': return 'bg-purple-100 text-purple-700';
      case 'Penulis TA': return 'bg-indigo-100 text-indigo-700';
      case 'Hardware': return 'bg-slate-200 text-slate-700';
      case 'Dokumentasi': return 'bg-amber-100 text-amber-700';
      case 'Jurnal': return 'bg-blue-100 text-blue-700';
      case 'Done': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const openTaskModal = (task: any) => {
    setSelectedTask(task);
    setActiveTab('detail');
    setShowDeleteWarning(false);
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
    setShowDeleteWarning(false);
  };

  const addSubtaskRow = () => setSubtasks([...subtasks, ""]);
  const removeSubtaskRow = (index: number) => setSubtasks(subtasks.filter((_, i) => i !== index));

  return (
    <Layout title="Progress Board">
      <div className="-m-8 flex flex-col min-h-[calc(100vh-60px)] bg-slate-50/30">
        
        <div className="p-8 flex flex-col gap-6 flex-1">
          
          {/* Topbar Row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Mahasiswa</p>
              <h1 className="text-2xl font-black text-foreground">Progress Board</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={activeProjectId}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="appearance-none bg-white border border-border rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold shadow-sm hover:bg-muted/30 transition-colors text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20"
                >
                  {researchProjects.map((r) => (
                    <option key={r.id} value={r.id}>{r.shortTitle}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <button 
                title="Edit Board Settings"
                onClick={() => setIsEditBoardModalOpen(true)}
                className="flex items-center justify-center bg-white border border-border rounded-xl w-10 h-10 text-slate-500 hover:text-[#6C47FF] hover:bg-slate-50 hover:border-[#6C47FF]/30 transition-all shadow-sm"
              >
                <Edit2 size={16} strokeWidth={2.5} />
              </button>
              <div className="w-px h-6 bg-border mx-1"></div>
              <button 
                onClick={() => setIsAddTaskModalOpen(true)}
                className="bg-[#6C47FF] hover:bg-[#5835e5] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all shadow-[#6C47FF]/20 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> Tambah Tugas
              </button>
            </div>
          </div>

          {/* Purple Metadata Banner */}
          <div className="bg-[#F8F5FF] border border-[#E9E0FF] rounded-[16px] overflow-hidden">
            {/* Top Row: Project title + meta + progress */}
            <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E9E0FF]">
              <div className="flex flex-col gap-1 group">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">📌</span>
                  <h2 className="text-lg font-bold text-[#6C47FF] mr-1">{activeProject.shortTitle}</h2>
                  <button 
                    onClick={() => setIsEditBoardModalOpen(true)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/60 border border-[#E9E0FF] text-[#9E8BFF] hover:text-[#6C47FF] hover:bg-white rounded-lg transition-all shadow-sm" title="Edit Board Details"
                  >
                    <Edit2 size={14} strokeWidth={2.5} />
                  </button>
                </div>
                {/* Metadata pills */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-[#B8A0FF] uppercase tracking-wider">Ketua</span>
                    <span className="text-xs font-bold text-[#6C47FF]">{ketuaMember?.name}</span>
                  </div>
                  <div className="w-px h-3 bg-[#D4C5FF]"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-[#B8A0FF] uppercase tracking-wider">Periode</span>
                    <span className="text-xs font-bold text-[#6C47FF]">{activeProject.period}</span>
                  </div>
                  <div className="w-px h-3 bg-[#D4C5FF]"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-[#B8A0FF] uppercase tracking-wider">Mitra</span>
                    <span className="text-xs font-bold text-[#6C47FF]">{activeProject.mitra.split(" Hibah")[0]}</span>
                  </div>
                  <div className="w-px h-3 bg-[#D4C5FF]"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-[#B8A0FF] uppercase tracking-wider">Milestone</span>
                    <span className="text-xs font-bold text-[#6C47FF]">{activeMilestoneLabel}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5 min-w-[180px] shrink-0">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-[#9E8BFF]">Progress</span>
                  <span className="text-sm font-black text-[#6C47FF]">{activeProject.progress}%</span>
                </div>
                <div className="w-full bg-[#E9E0FF] rounded-full h-2">
                  <div className="bg-[#6C47FF] h-2 rounded-full" style={{ width: `${activeProject.progress}%` }}></div>
                </div>
                <span className="text-[10px] font-medium text-[#9E8BFF]">{activeProject.tugasSelesai} dari {activeProject.tugasTotal} tugas selesai</span>
              </div>
            </div>

            {/* Bottom Row: Milestone steps + Team Members */}
            <div className="px-5 pt-4 pb-2 border-b border-[#E9E0FF]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-[#B8A0FF] uppercase tracking-wider">
                  Milestone Progress — {milestones.filter(m => m.done).length}/{milestones.length} Selesai
                </span>
                <button
                  onClick={() => setIsMilestoneModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E9E0FF] hover:border-[#9E8BFF] hover:bg-[#F8F5FF] rounded-lg text-[10px] font-black text-[#9E8BFF] hover:text-[#6C47FF] transition-all shadow-sm"
                >
                  <Edit2 size={10} strokeWidth={3} /> Kelola Milestone
                </button>
              </div>
              <MilestoneBanner
                milestones={milestones}
                progressColor={activeProject.progressColor}
                onToggle={toggleMilestone}
                onManage={() => setIsMilestoneModalOpen(true)}
              />
            </div>

            <div className="px-5 py-4">
              <span className="text-[10px] font-black text-[#B8A0FF] uppercase tracking-wider block mb-3">Anggota Tim</span>
              <div className="flex flex-wrap gap-2.5">
                {teamMembers.map((member, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2.5 bg-white border border-[#E9E0FF] rounded-xl px-3 py-2 shadow-sm hover:shadow-md hover:border-[#C5AEFF] transition-all cursor-default"
                  >
                    <div 
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAssigneeColor(member.initials)}`}
                    >
                      {member.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 whitespace-nowrap">{member.name}</span>
                      <span className="text-[10px] font-medium text-[#9E8BFF] whitespace-nowrap">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
            {columns.map((col) => (
              <div key={col.id} className={`flex flex-col min-w-[320px] w-[320px] rounded-[20px] ${col.bg} p-4`}>
                
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className={`w-3 h-3 rounded-sm ${col.iconColor}`}></div>
                  <h3 className={`text-sm font-bold ${col.textColor} uppercase tracking-wider`}>{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${col.pillBg} ml-1`}>
                    {col.count}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                  {((boardTasks as any)[col.id] || []).map((task: any) => (
                    <div 
                      key={task.id} 
                      onClick={() => openTaskModal(task)}
                      className={`bg-white rounded-[16px] p-5 shadow-sm border ${task.isOverdue && col.id !== 'done' ? 'border-[#6C47FF]' : 'border-border/60'} hover:shadow-md transition-all cursor-pointer`}
                    >
                      {/* Title */}
                      <p className="font-bold text-sm text-foreground mb-2.5 leading-snug">
                        {task.title}
                      </p>

                      {/* Deadline / Status */}
                      {task.deadline && (
                        <div className="flex items-center gap-1.5 mb-3">
                          {task.isOverdue && <AlertTriangle size={12} className="text-red-500" strokeWidth={3} />}
                          <span className={`text-[11px] font-bold ${task.isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                            Deadline: {task.deadline}
                          </span>
                        </div>
                      )}
                      {task.statusText && (
                        <div className="flex items-center gap-1.5 mb-3">
                          {col.id === 'done' && <Check size={12} className="text-emerald-500" strokeWidth={3} />}
                          <span className={`text-[11px] font-bold ${col.id === 'done' ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {task.statusText}
                          </span>
                        </div>
                      )}

                      {/* Progress Bar (if doing) */}
                      {task.progress !== undefined && (
                        <div className="mb-4">
                          <span className="text-[10px] font-bold text-muted-foreground block mb-1.5">{task.progress}% selesai</span>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-[#6C47FF] h-1.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
                          </div>
                        </div>
                      )}

                      {/* Footer: Tag, Assignees, Comments */}
                      <div className="flex items-center justify-between mt-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${getTagColor(task.tag)}`}>
                          {task.tag}
                        </span>
                        
                        <div className="flex items-center gap-3">
                          {/* Assignees */}
                          <div className="flex items-center -space-x-1.5">
                            {task.assignees.map((assignee: string, i: number) => (
                              <div 
                                key={i} 
                                className={`group relative w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border-[1.5px] border-white shadow-sm cursor-pointer ${getAssigneeColor(assignee)}`}
                                style={{ zIndex: 5 - i }}
                              >
                                {assignee}
                                {/* Tooltip */}
                                <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible whitespace-nowrap z-50 transition-all shadow-lg pointer-events-none">
                                  {getMemberName(assignee)}
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Comments */}
                          <div className="flex items-center gap-1 text-slate-300">
                            <MessageSquare size={12} fill="currentColor" className="text-slate-300" />
                            <span className="text-[11px] font-bold">{task.comments}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* + N Tugas Lainnya for Done column */}
                  {col.id === 'done' && (
                    <div className="text-center py-2">
                      <span className="text-xs font-bold text-emerald-400/80 cursor-pointer hover:text-emerald-500 transition-colors">
                        + 4 tugas lainnya
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Project Attachments */}
          <div className="mt-2 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Paperclip className="text-[#6C47FF]" size={20} />
              <h2 className="text-lg font-bold text-foreground">Lampiran Proyek</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Frontend Attachments */}
              <div className="bg-white rounded-[16px] border border-border/60 p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-4 text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> Front End
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">3 Files</span>
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                      <ImageIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors">UI_Design_v2.fig</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Figma Design • 12 MB</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                      <Folder size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-emerald-600 transition-colors">react_components.zip</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Archive • 4.2 MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backend Attachments */}
              <div className="bg-white rounded-[16px] border border-border/60 p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-4 text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-500"></div> Back End
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">2 Files</span>
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-amber-600 transition-colors">API_Schema_v1.pdf</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">PDF Document • 2.1 MB</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <Link size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-slate-900 transition-colors">Postman Collection</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">External Link</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware Attachments */}
              <div className="bg-white rounded-[16px] border border-border/60 p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-4 text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div> Hardware
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">1 File</span>
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-rose-600 transition-colors">Sensor_Datasheet.pdf</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">PDF Document • 5.4 MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentation Attachments */}
              <div className="bg-white rounded-[16px] border border-border/60 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm mb-4 text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#6C47FF]"></div> Dokumentasi
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">0 Files</span>
                  </h3>
                  <div className="flex flex-col items-center justify-center text-center py-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                      <UploadCloud size={20} />
                    </div>
                    <p className="text-xs font-medium text-slate-500">Belum ada lampiran</p>
                  </div>
                </div>
                <button className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:text-[#6C47FF] hover:border-[#6C47FF] hover:bg-[#6C47FF]/5 transition-all">
                  + Upload File
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Task Detail Modal */}
      {selectedTask && !isEditModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[600px] max-h-[88vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative transition-all ease-out">
            
            {/* Delete Warning Overlay */}
            {showDeleteWarning && (
              <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 text-center animate-in fade-in duration-200">
                <div className="max-w-xs w-full bg-white p-6 rounded-2xl shadow-xl border border-border">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-lg font-black text-foreground mb-2">Hapus Tugas?</h3>
                  <p className="text-sm text-slate-500 mb-6">Tugas ini akan dihapus permanen dan tidak dapat dikembalikan lagi.</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowDeleteWarning(false)} 
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={closeTaskModal} 
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                      Ya, Hapus
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header Section */}
            <div className="p-6 border-b border-border bg-white shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide
                    ${selectedTask.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 
                      selectedTask.status === 'DOING' ? 'bg-blue-100 text-blue-700' : 
                      selectedTask.status === 'REVIEW' ? 'bg-amber-100 text-amber-700' : 
                      'bg-slate-100 text-slate-700'}`}
                  >
                    {selectedTask.status}
                  </span>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${getTagColor(selectedTask.tag)}`}>
                    {selectedTask.tag}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                    {selectedTask.sp} SP
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select defaultValue="" className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none hover:bg-slate-100 cursor-pointer transition-colors">
                    <option value="" disabled>Pindah ke...</option>
                    <option value="todo">TO DO</option>
                    <option value="doing">DOING</option>
                    <option value="review">REVIEW</option>
                    <option value="done">DONE</option>
                  </select>
                  
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors border border-transparent hover:border-slate-200"
                  >
                    <Edit2 size={14} />
                  </button>
                  
                  <button 
                    onClick={() => setShowDeleteWarning(true)}
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-red-200"
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  <div className="w-px h-5 bg-border mx-1"></div>

                  <button 
                    onClick={closeTaskModal}
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors ml-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <h2 className="text-xl font-black text-foreground mb-4 leading-tight pr-4">
                {selectedTask.title}
              </h2>

              {selectedTask.progress !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-muted-foreground">Progress</span>
                    <span className="text-xs font-black text-[#6C47FF]">{selectedTask.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-[#6C47FF] h-2 rounded-full transition-all" style={{ width: `${selectedTask.progress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex px-6 border-b border-border bg-white shrink-0">
              <button 
                onClick={() => setActiveTab('detail')}
                className={`py-3 px-2 mr-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'detail' ? 'border-[#6C47FF] text-[#6C47FF]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                📋 Detail
              </button>
              <button 
                onClick={() => setActiveTab('lampiran')}
                className={`py-3 px-2 mr-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'lampiran' ? 'border-[#6C47FF] text-[#6C47FF]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                📎 Lampiran (2)
              </button>
              <button 
                onClick={() => setActiveTab('komentar')}
                className={`py-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'komentar' ? 'border-[#6C47FF] text-[#6C47FF]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                💬 Komentar ({selectedTask.comments || 0})
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 relative">
              
              {/* Tab: Detail */}
              {activeTab === 'detail' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col">
                  {/* Alert Banner */}
                  {selectedTask.isOverdue ? (
                    <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 mb-6 flex items-start gap-3">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">Tugas ini telah melewati tenggat waktu!</p>
                        <p className="text-xs text-red-500/80 mt-1">Harap segera selesaikan atau diskusikan dengan pembimbing.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3.5 mb-6 flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">On Track</p>
                        <p className="text-xs text-emerald-600/80 mt-1">Tugas ini berjalan sesuai jadwal sprint saat ini.</p>
                      </div>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-y-5 gap-x-6 mb-8">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Prioritas</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
                        Tinggi
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Deadline</span>
                      <span className={`text-sm font-bold ${selectedTask.isOverdue ? 'text-red-500' : 'text-foreground'}`}>
                        {selectedTask.deadline || 'Belum diatur'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Ditugaskan Ke</span>
                      <div className="flex flex-col gap-2">
                        {selectedTask.assignees.map((assignee: string, i: number) => {
                          const member = teamMembers.find(m => m.initials === assignee);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${getAssigneeColor(assignee)}`}>
                                {assignee}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground">{getMemberName(assignee)}</span>
                                {member && <span className="text-[10px] font-medium text-muted-foreground">{member.role}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Dibuat Oleh</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">
                          AK
                        </div>
                        <span className="text-sm font-bold text-foreground">Dr. Andi K.</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-8">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">Deskripsi Tugas</span>
                    <div className="text-sm text-foreground leading-relaxed space-y-3 bg-white p-4 rounded-xl border border-border shadow-sm">
                      <p>Implementasikan model LSTM berdasarkan arsitektur yang sudah disepakati pada sprint sebelumnya. Fokus pada:</p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        <li>Pengaturan hyperparameter awal (learning rate 0.001)</li>
                        <li>Pembuatan data loader pipeline untuk dataset sensor</li>
                        <li>Penyimpanan checkpoint setiap 10 epoch</li>
                      </ul>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sub-tugas (2/4)</span>
                      <span className="text-xs font-bold text-emerald-500">50%</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { title: 'Setup environment TensorFlow & CUDA', done: true },
                        { title: 'Import dataset dan buat preprocessing script', done: true },
                        { title: 'Bangun arsitektur Sequential LSTM', done: false },
                        { title: 'Tulis script training & validasi', done: false },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border shadow-sm hover:border-[#6C47FF]/30 transition-colors">
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 cursor-pointer transition-colors ${item.done ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 border-2 border-slate-300 hover:border-[#6C47FF]'}`}>
                            {item.done && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className={`text-sm font-medium ${item.done ? 'text-muted-foreground line-through decoration-slate-300' : 'text-foreground'}`}>
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Lampiran */}
              {activeTab === 'lampiran' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                  
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#6C47FF]/50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-[#F8F5FF] text-[#6C47FF] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1">Klik untuk mengunggah atau seret file ke sini</p>
                    <p className="text-xs font-medium text-muted-foreground">Maksimal 10MB per file. (PDF, PNG, CSV, ZIP)</p>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 bg-white border border-border py-3 rounded-xl text-sm font-bold text-foreground shadow-sm hover:bg-slate-50 transition-colors">
                    <Link size={16} /> Tambahkan Tautan Eksternal
                  </button>

                  {/* Attachment List */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Daftar Lampiran</h3>
                    
                    <div className="flex items-center p-3 bg-white rounded-xl border border-border shadow-sm group">
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mr-3">
                        <ImageIcon size={20} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold text-foreground truncate group-hover:text-[#6C47FF] transition-colors cursor-pointer">Arsitektur_Sistem_LSTM.png</span>
                        <span className="text-[10px] font-medium text-muted-foreground">Diunggah 2 hari lalu • 1.2 MB</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500">
                          <Download size={14} />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center p-3 bg-white rounded-xl border border-border shadow-sm group">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mr-3">
                        <FileText size={20} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold text-foreground truncate group-hover:text-[#6C47FF] transition-colors cursor-pointer">Dataset_Sensor_v2.csv</span>
                        <span className="text-[10px] font-medium text-muted-foreground">Diunggah kemarin • 4.5 MB</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500">
                          <Download size={14} />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Komentar */}
              {activeTab === 'komentar' && (
                <div className="flex flex-col h-full absolute inset-0">
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                    
                    {/* Chat Bubble 1 */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">AK</div>
                      <div className="flex flex-col gap-1.5 items-start max-w-[85%]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">Dr. Andi Kurniawan</span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-bold tracking-wider">DOSEN</span>
                          <span className="text-[10px] font-medium text-muted-foreground">Kemarin, 14:30</span>
                        </div>
                        <div className="bg-white border border-border p-3.5 rounded-2xl rounded-tl-none text-sm text-foreground shadow-sm leading-relaxed">
                          Pastikan arsitektur LSTM-nya menggunakan dropout minimal 0.2 ya untuk mencegah overfitting. Dataset yang dipakai versi v2 kan?
                        </div>
                      </div>
                    </div>

                    {/* Chat Bubble 2 (Self) */}
                    <div className="flex gap-3 flex-row-reverse">
                      <div className={`w-8 h-8 rounded-full ${getAssigneeColor('IR')} flex items-center justify-center text-xs font-bold shrink-0`}>IR</div>
                      <div className="flex flex-col gap-1.5 items-end max-w-[85%]">
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <span className="text-xs font-bold text-foreground">{getMemberName('IR')}</span>
                          <span className="px-1.5 py-0.5 bg-[#F8F5FF] text-[#6C47FF] rounded text-[8px] font-bold tracking-wider border border-[#E9E0FF]">MAHASISWA</span>
                          <span className="text-[10px] font-medium text-muted-foreground">Hari ini, 09:15</span>
                        </div>
                        <div className="bg-[#6C47FF] text-white p-3.5 rounded-2xl rounded-tr-none text-sm shadow-md leading-relaxed">
                          Baik Pak Budi. Saya sudah set dropout di 0.2 dan menggunakan dataset_sensor_v2.csv. Saat ini model sedang di-train, epoch ke-15 akurasinya sudah mencapai 82%.
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Pinned Input Area */}
                  <div className="p-4 bg-white border-t border-border flex items-end gap-3 shrink-0">
                    <div className={`w-8 h-8 rounded-full ${getAssigneeColor('IR')} flex items-center justify-center text-xs font-bold shrink-0 mb-1`}>
                      IR
                    </div>
                    <div className="flex-1 bg-slate-50 border border-border rounded-xl focus-within:ring-2 focus-within:ring-[#6C47FF]/20 focus-within:border-[#6C47FF] transition-all p-1 flex">
                      <textarea 
                        placeholder="Tulis komentar..." 
                        className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm p-2.5 min-h-[40px] max-h-[120px] custom-scrollbar"
                        rows={1}
                      />
                      <button className="w-10 h-10 bg-[#6C47FF] hover:bg-[#5835e5] text-white rounded-lg flex items-center justify-center shrink-0 transition-colors self-end m-0.5">
                        <Send size={16} className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating Add / Edit Task Modal */}
      {(isAddTaskModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[600px] max-h-[88vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative transition-all ease-out">
            
            {/* Header */}
            <div className="p-5 border-b border-border bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {isEditModalOpen ? (
                  <Edit2 className="text-[#6C47FF]" size={24} />
                ) : (
                  <Folder className="text-amber-400" size={24} fill="#FCD34D" />
                )}
                <h2 className="text-lg font-black text-foreground">
                  {isEditModalOpen ? "Edit Tugas" : "Tambah Tugas Baru"}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setIsAddTaskModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-5">
              
              {/* Riset Terkait */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">
                  Riset Terkait <span className="text-red-500">*</span>
                </label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none appearance-none transition-all">
                  {researchProjects.map((r) => (
                    <option key={r.id}>{r.shortTitle}</option>
                  ))}
                </select>
              </div>

              {/* Judul Tugas */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">
                  Judul Tugas <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  defaultValue={isEditModalOpen && selectedTask ? selectedTask.title : ""}
                  placeholder="Contoh: Implementasi model training pipeline..." 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all"
                />
              </div>

              {/* Status & Prioritas Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Status</label>
                  <select 
                    defaultValue={isEditModalOpen && selectedTask ? selectedTask.status : "To Do"}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all"
                  >
                    <option value="TO DO">To Do</option>
                    <option value="DOING">Doing</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Prioritas</label>
                  <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all">
                    <option>🔴 Tinggi</option>
                    <option>🟡 Menengah</option>
                    <option>🟢 Rendah</option>
                  </select>
                </div>
              </div>

              {/* Deadline & Ditugaskan ke Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Deadline</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      defaultValue={isEditModalOpen && selectedTask ? selectedTask.deadline : ""}
                      placeholder="dd/mm/yyyy" 
                      className="w-full p-3 pr-10 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all"
                    />
                    <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Ditugaskan ke</label>
                  <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all">
                    {teamMembers.map((m) => (
                      <option key={m.initials}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deskripsi Tugas */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">Deskripsi Tugas</label>
                <textarea 
                  placeholder="Jelaskan detail tugas yang harus dikerjakan..." 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none min-h-[100px] resize-y transition-all"
                />
              </div>

              {/* Jobdesk di Tugas Ini */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">Jobdesk di Tugas Ini</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Penulisan Bab 3, implementasi API..." 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all"
                />
              </div>

              {/* Sub-tugas / Checklist */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">Sub-tugas / Checklist</label>
                <div className="flex flex-col gap-2">
                  {subtasks.map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder={`Sub-tugas ${idx + 1}...`} 
                        className="flex-1 p-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all"
                      />
                      <button 
                        onClick={() => removeSubtaskRow(idx)}
                        className="w-11 h-11 shrink-0 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 flex items-center justify-center transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={addSubtaskRow}
                    className="self-start mt-1 flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-bold hover:bg-slate-50 hover:border-[#6C47FF]/50 hover:text-[#6C47FF] transition-all"
                  >
                    <Plus size={14} strokeWidth={3} /> Tambah item checklist
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border bg-white flex items-center justify-end gap-3 shrink-0">
              <button 
                onClick={() => {
                  setIsAddTaskModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setIsAddTaskModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#6C47FF] hover:bg-[#5835e5] shadow-sm shadow-[#6C47FF]/20 transition-colors flex items-center gap-2"
              >
                <Check size={16} strokeWidth={3} /> {isEditModalOpen ? "Simpan Perubahan" : "Buat Tugas"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {isEditBoardModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[500px] rounded-[20px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative">
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:px-6 border-b border-border/50 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#6C47FF] flex items-center justify-center shadow-sm">
                  <Edit2 size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Edit Detail Proyek</h2>
                  <p className="text-[11px] font-bold text-muted-foreground">Pengaturan informasi board</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditBoardModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 md:p-6 flex flex-col gap-5 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Nama Proyek</label>
                <input 
                  type="text" 
                  defaultValue={activeProject.shortTitle}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Mitra / Organisasi</label>
                <input 
                  type="text" 
                  defaultValue="DIKTI"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700">Ketua Tim</label>
                  <input 
                    type="text" 
                    defaultValue={ketuaMember?.name}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700">Periode</label>
                  <input 
                    type="text" 
                    defaultValue="Jan – Jun 2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Anggota Tim</label>
                <div className="flex flex-col gap-2">
                  {teamMembers.map((member, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 group hover:border-[#6C47FF]/30 hover:bg-[#F8F5FF] transition-all">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAssigneeColor(member.initials)}`}>
                        {member.initials}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800">{member.name}</span>
                        <span className="text-[10px] font-medium text-slate-400">{member.role}</span>
                      </div>
                      <button className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1"><X size={13} strokeWidth={3} /></button>
                    </div>
                  ))}
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:text-[#6C47FF] hover:border-[#6C47FF] hover:bg-[#6C47FF]/5 transition-all mt-1">
                    <Plus size={12} strokeWidth={3} /> Tambah Anggota
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 md:px-6 border-t border-border/50 bg-slate-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditBoardModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => setIsEditBoardModalOpen(false)}
                className="bg-[#6C47FF] hover:bg-[#5835e5] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all shadow-[#6C47FF]/20"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Milestone Management Modal ─────────────────────────────────────── */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[520px] max-h-[88vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-foreground">Kelola Milestone</h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{activeProject.shortTitle}</p>
              </div>
              <button
                onClick={() => { setIsMilestoneModalOpen(false); setEditingIndex(null); }}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Progress summary */}
            <div className="px-6 py-4 bg-[#F8F5FF] border-b border-[#E9E0FF] shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#9E8BFF]">
                  {milestones.filter(m => m.done).length} dari {milestones.length} milestone selesai
                </span>
                <span className="text-sm font-black text-[#6C47FF]">{milestoneProgress}%</span>
              </div>
              <div className="w-full bg-[#E9E0FF] rounded-full h-2">
                <div className="bg-[#6C47FF] h-2 rounded-full transition-all duration-500" style={{ width: `${milestoneProgress}%` }} />
              </div>
              {activeMilestoneLabel !== "Semua Selesai ✓" && (
                <p className="text-[11px] font-medium text-[#9E8BFF] mt-1.5">
                  Aktif: <span className="font-black text-[#6C47FF]">{activeMilestoneLabel}</span>
                </p>
              )}
            </div>

            {/* Milestone list */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
              {milestones.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm font-medium">
                  Belum ada milestone. Tambahkan di bawah.
                </div>
              )}
              {milestones.map((m, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  m.done ? "bg-[#F8F5FF] border-[#E9E0FF]" : "bg-white border-border hover:border-slate-200"
                }`}>
                  <span className="text-[10px] font-black text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>

                  {/* Toggle circle */}
                  <button
                    onClick={() => toggleMilestone(i)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110 ${
                      m.done ? `${activeProject.progressColor} border-transparent text-white` : "bg-white border-slate-300 hover:border-[#6C47FF]"
                    }`}
                    title={m.done ? "Tandai belum selesai" : "Tandai selesai"}
                  >
                    {m.done && (
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
                        <path d="M1 6l3.5 3.5L11 2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Label — inline editable */}
                  {editingIndex === i ? (
                    <input
                      autoFocus
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={() => { if (editingLabel.trim()) renameMilestone(i, editingLabel.trim()); setEditingIndex(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { if (editingLabel.trim()) renameMilestone(i, editingLabel.trim()); setEditingIndex(null); }
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                      className="flex-1 text-sm font-bold bg-white border border-[#6C47FF] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20"
                    />
                  ) : (
                    <span
                      className={`flex-1 text-sm font-bold cursor-pointer hover:text-[#6C47FF] transition-colors ${
                        m.done ? "text-[#9E8BFF] line-through decoration-[#C5AEFF]" : "text-foreground"
                      }`}
                      onDoubleClick={() => { setEditingIndex(i); setEditingLabel(m.label); }}
                      title="Double-click untuk ubah nama"
                    >
                      {m.label}
                    </span>
                  )}

                  {/* Reorder + edit + delete */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => moveMilestone(i, -1)} disabled={i === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#6C47FF] hover:bg-[#F8F5FF] disabled:opacity-25 disabled:cursor-not-allowed transition-all" title="Naik">
                      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => moveMilestone(i, 1)} disabled={i === milestones.length - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#6C47FF] hover:bg-[#F8F5FF] disabled:opacity-25 disabled:cursor-not-allowed transition-all" title="Turun">
                      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><path d="M8 4v8M4 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => { setEditingIndex(i); setEditingLabel(m.label); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#6C47FF] hover:bg-[#F8F5FF] transition-all" title="Ubah nama">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => deleteMilestone(i)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Hapus">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="px-6 py-4 border-t border-border shrink-0 bg-slate-50/50">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Tambah Milestone Baru</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMilestoneLabel}
                  onChange={(e) => setNewMilestoneLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { addMilestone(newMilestoneLabel); setNewMilestoneLabel(""); } }}
                  placeholder="Contoh: Uji Lapangan, Revisi Jurnal..."
                  className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all bg-white"
                />
                <button
                  onClick={() => { addMilestone(newMilestoneLabel); setNewMilestoneLabel(""); }}
                  disabled={!newMilestoneLabel.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#6C47FF] hover:bg-[#5835e5] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shrink-0"
                >
                  <Plus size={16} strokeWidth={3} /> Tambah
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                💡 Klik lingkaran untuk toggle · Double-click nama untuk ubah · Ikon ↑↓ untuk reorder
              </p>
            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}