import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { OperatorLayout } from "../../templates/OperatorLayout";
import {
  Kanban,
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  Zap,
  ArrowRight,
  Trash2,
  Pencil,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../lib/api";

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string | null;
  endDate: string | null;
  status: "planning" | "active" | "completed";
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
}

interface Project {
  id: string;
  title: string;
  short_title?: string;
}

interface Member {
  userId: string;
  name: string;
  initials?: string;
  role?: string;
}

export default function ScrumPlanning() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchBacklog, setSearchBacklog] = useState("");

  // Modal states
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: ""
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    id: "",
    title: "",
    description: "",
    storyPoints: 3,
    assigneeIds: [] as string[],
    sprintId: "" as string | null
  });
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Load Projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await apiGet<Project[]>("/research");
        const list = data || [];
        setProjects(list);
        if (list.length > 0) {
          const current = list.find((p) => p.id === selectedProjectId) || list[0];
          setActiveProject(current);
          if (current.id !== selectedProjectId) {
            setSearchParams({ projectId: current.id });
          }
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuat data penelitian");
      }
    };
    loadProjects();
  }, []);

  // Load Sprints, Tasks, and Members when activeProject changes
  const loadProjectData = async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [sprintsData, boardData, membersData] = await Promise.all([
        apiGet<Sprint[]>(`/research/${projectId}/sprints`).catch(() => []),
        apiGet<any>(`/research/${projectId}/board`).catch(() => ({ tasks: [] })),
        apiGet<any[]>(`/research/${projectId}/members`).catch(() => [])
      ]);

      setSprints(sprintsData || []);
      setTasks(boardData?.tasks || []);
      setMembers(
        (membersData || []).map((m: any) => ({
          userId: m.user_id || m.userId,
          name: m.name,
          initials: m.initials,
          role: m.peran || m.role || "Anggota"
        }))
      );
    } catch (err: any) {
      setError(err?.message || "Gagal memuat detail Scrum");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject?.id) {
      loadProjectData(activeProject.id);
    }
  }, [activeProject?.id]);

  const handleSelectProject = (projectId: string) => {
    const p = projects.find((item) => item.id === projectId) || null;
    setActiveProject(p);
    setSearchParams({ projectId });
  };

  // Sprint Actions
  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id || !sprintForm.name.trim()) return;

    try {
      await apiPost(`/research/${activeProject.id}/sprints`, {
        name: sprintForm.name.trim(),
        goal: sprintForm.goal.trim() || null,
        startDate: sprintForm.startDate || null,
        endDate: sprintForm.endDate || null,
        status: "planning"
      });

      setIsSprintModalOpen(false);
      setSprintForm({ name: "", goal: "", startDate: "", endDate: "" });
      await loadProjectData(activeProject.id);
    } catch (err: any) {
      alert(err?.message || "Gagal membuat sprint.");
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    if (!activeProject?.id) return;
    if (!confirm("Mulai Sprint ini sekarang? Sprint aktif sebelumnya akan diselesaikan otomatis.")) return;

    try {
      await apiPatch(`/research/${activeProject.id}/sprints/${sprintId}`, { status: "active" });
      await loadProjectData(activeProject.id);
    } catch (err: any) {
      alert(err?.message || "Gagal memulai sprint.");
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!activeProject?.id) return;
    if (!confirm("Selesaikan Sprint ini? Tugas yang belum selesai akan tetap tercatat.")) return;

    try {
      await apiPatch(`/research/${activeProject.id}/sprints/${sprintId}`, { status: "completed" });
      await loadProjectData(activeProject.id);
    } catch (err: any) {
      alert(err?.message || "Gagal menyelesaikan sprint.");
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!activeProject?.id) return;
    if (!confirm("Hapus Sprint ini? Semua tugas di dalamnya akan dikembalikan ke Product Backlog.")) return;

    try {
      await apiDelete(`/research/${activeProject.id}/sprints/${sprintId}`);
      await loadProjectData(activeProject.id);
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus sprint.");
    }
  };

  // Task Actions
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id || !taskForm.title.trim()) return;

    try {
      if (isEditingTask && taskForm.id) {
        await apiPatch(`/research/${activeProject.id}/board/tasks/${taskForm.id}`, {
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          storyPoints: taskForm.storyPoints,
          assigneeIds: taskForm.assigneeIds,
          sprintId: taskForm.sprintId
        });
      } else {
        await apiPost(`/research/${activeProject.id}/board/tasks`, {
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          storyPoints: taskForm.storyPoints,
          assigneeIds: taskForm.assigneeIds,
          sprintId: taskForm.sprintId,
          status: "TO DO"
        });
      }

      setIsTaskModalOpen(false);
      setTaskForm({ id: "", title: "", description: "", storyPoints: 3, assigneeIds: [], sprintId: null });
      await loadProjectData(activeProject.id);
    } catch (err: any) {
      alert(err?.message || "Gagal menyimpan task.");
    }
  };

  const handleMoveTaskToSprint = async (taskId: string, sprintId: string | null) => {
    if (!activeProject?.id) return;
    try {
      await apiPatch(`/research/${activeProject.id}/board/tasks/${taskId}`, {
        sprintId: sprintId
      });
      await loadProjectData(activeProject.id);
    } catch (err: any) {
      alert(err?.message || "Gagal memindahkan task.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeProject?.id) return;
    if (!confirm("Hapus tugas ini?")) return;
    try {
      await apiDelete(`/research/${activeProject.id}/board/tasks/${taskId}`);
      await loadProjectData(activeProject.id);
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus tugas.");
    }
  };

  const openEditTaskModal = (task: any) => {
    setIsEditingTask(true);
    setTaskForm({
      id: task.id,
      title: task.title,
      description: task.description || "",
      storyPoints: task.storyPoints ?? task.story_points ?? 3,
      assigneeIds: task.assigneeIds || task.assignee_ids || [],
      sprintId: task.sprintId ?? task.sprint_id ?? null
    });
    setIsTaskModalOpen(true);
  };

  const openCreateTaskModal = (defaultSprintId: string | null = null) => {
    setIsEditingTask(false);
    setTaskForm({
      id: "",
      title: "",
      description: "",
      storyPoints: 3,
      assigneeIds: [],
      sprintId: defaultSprintId
    });
    setIsTaskModalOpen(true);
  };

  // Group tasks
  const backlogTasks = tasks.filter((t) => !t.sprintId && !t.sprint_id).filter((t) => {
    if (!searchBacklog.trim()) return true;
    return t.title.toLowerCase().includes(searchBacklog.toLowerCase());
  });

  const activeSprint = sprints.find((s) => s.status === "active");

  return (
    <OperatorLayout title="Manajemen Scrum & Sprint">
      <div className="flex flex-col gap-6 pb-12">
        {/* Top Header & Project Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[20px] border border-border shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Kanban size={20} />
              </span>
              <h2 className="text-xl font-black text-foreground">Scrum & Sprint Planning</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Rencanakan siklus kerja (Sprint), tentukan bobot kesulitan (Fibonacci), dan tugaskan mahasiswa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={activeProject?.id || ""}
              onChange={(e) => handleSelectProject(e.target.value)}
              className="h-11 px-4 text-xs font-black bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[220px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.short_title || p.title}
                </option>
              ))}
            </select>

            {activeProject && (
              <button
                onClick={() => navigate(`/operator/riset?projectId=${activeProject.id}`)}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-foreground text-xs font-black rounded-xl transition-colors flex items-center gap-2"
                title="Buka Papan Kanban Utama"
              >
                <span>Live Kanban</span>
                <ExternalLink size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Stats Highlight Bar */}
        {activeProject && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Layers size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Sprint Aktif
                </span>
                <p className="text-sm font-black text-foreground truncate">
                  {activeSprint ? activeSprint.name : "Belum ada sprint aktif"}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Beban Sprint Aktif
                </span>
                <p className="text-sm font-black text-foreground">
                  {activeSprint ? `${activeSprint.totalPoints} Story Points` : "0 SP"}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Progres Pengerjaan
                </span>
                <p className="text-sm font-black text-foreground">
                  {activeSprint
                    ? `${activeSprint.completedTasks} / ${activeSprint.totalTasks} Selesai`
                    : "0 Selesai"}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Antrean Backlog
                </span>
                <p className="text-sm font-black text-foreground">{backlogTasks.length} Tugas Menunggu</p>
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Scrum Board (Product Backlog & Sprints) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Product Backlog (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-border rounded-[20px] shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground">Product Backlog</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {backlogTasks.length}
                </span>
              </div>

              <button
                onClick={() => openCreateTaskModal(null)}
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-primary/20"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Tambah Task</span>
              </button>
            </div>

            {/* Backlog Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari task di backlog..."
                value={searchBacklog}
                onChange={(e) => setSearchBacklog(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Backlog List */}
            <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
              {backlogTasks.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Backlog kosong</p>
                  <p className="text-[11px] text-muted-foreground">
                    Semua tugas sudah masuk ke dalam Sprint atau belum ada tugas yang ditambahkan.
                  </p>
                </div>
              ) : (
                backlogTasks.map((task) => {
                  const sp = task.storyPoints ?? task.story_points ?? 3;
                  const taskAssignees = task.assignees || [];

                  return (
                    <div
                      key={task.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-foreground leading-snug">{task.title}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditTaskModal(task)}
                            className="p-1 hover:bg-white text-muted-foreground hover:text-foreground rounded-md"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-md"
                            title="Hapus"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                            ⚡ {sp} SP
                          </span>

                          <div className="flex items-center -space-x-1">
                            {taskAssignees.map((a: any, i: number) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full bg-primary/20 text-primary border border-white flex items-center justify-center text-[8px] font-black"
                                title={a.name}
                              >
                                {a.initials || a.name?.slice(0, 2)?.toUpperCase()}
                              </div>
                            ))}
                            {taskAssignees.length === 0 && (
                              <span className="text-[10px] text-muted-foreground italic">Belum di-assign</span>
                            )}
                          </div>
                        </div>

                        {/* Move to Sprint action */}
                        {sprints.length > 0 && (
                          <div className="flex items-center gap-1">
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleMoveTaskToSprint(task.id, e.target.value);
                              }}
                              defaultValue=""
                              className="text-[10px] font-bold bg-white border border-border px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                            >
                              <option value="" disabled>
                                + Masukkan ke Sprint...
                              </option>
                              {sprints
                                .filter((s) => s.status !== "completed")
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} {s.status === "active" ? "(Aktif)" : ""}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Sprints Area (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-[20px] border border-border shadow-sm">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground">Daftar Sprint</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {sprints.length} Sprint
                </span>
              </div>

              <button
                onClick={() => setIsSprintModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Buat Sprint Baru</span>
              </button>
            </div>

            {/* Sprints List */}
            <div className="flex flex-col gap-4">
              {sprints.length === 0 ? (
                <div className="p-10 text-center bg-white border-2 border-dashed border-border rounded-[20px]">
                  <p className="text-sm font-black text-foreground mb-1">Belum ada Sprint</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                    Buat Sprint pertama untuk proyek riset ini, lalu masukkan tugas dari Product Backlog.
                  </p>
                  <button
                    onClick={() => setIsSprintModalOpen(true)}
                    className="px-4 py-2 bg-primary text-white text-xs font-black rounded-xl"
                  >
                    + Buat Sprint Pertama
                  </button>
                </div>
              ) : (
                sprints.map((sprint) => {
                  const sprintTasks = tasks.filter(
                    (t) => (t.sprintId ?? t.sprint_id) === sprint.id
                  );
                  const isActive = sprint.status === "active";
                  const isCompleted = sprint.status === "completed";

                  return (
                    <div
                      key={sprint.id}
                      className={`bg-white rounded-[20px] border transition-all p-5 flex flex-col gap-4 shadow-sm ${
                        isActive
                          ? "border-purple-300 ring-2 ring-purple-100 bg-purple-50/10"
                          : isCompleted
                          ? "border-slate-200 opacity-80"
                          : "border-border"
                      }`}
                    >
                      {/* Sprint Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-border/60">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-base font-black text-foreground">{sprint.name}</h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isActive
                                  ? "bg-purple-100 text-purple-700 animate-pulse"
                                  : isCompleted
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {isActive ? "Sedang Aktif" : isCompleted ? "Selesai" : "Planning"}
                            </span>
                            <span className="text-xs font-black text-purple-700">
                              ⚡ {sprint.totalPoints} SP
                            </span>
                          </div>
                          {sprint.goal && (
                            <p className="text-xs text-muted-foreground mt-0.5">{sprint.goal}</p>
                          )}
                          {(sprint.startDate || sprint.endDate) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                              <Calendar size={12} />
                              <span>
                                {sprint.startDate || "?"} s/d {sprint.endDate || "?"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Sprint Controls */}
                        <div className="flex items-center gap-2">
                          {!isCompleted && !isActive && (
                            <button
                              onClick={() => handleStartSprint(sprint.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <Play size={12} fill="currentColor" />
                              <span>Mulai Sprint</span>
                            </button>
                          )}

                          {isActive && (
                            <button
                              onClick={() => handleCompleteSprint(sprint.id)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 size={14} />
                              <span>Selesaikan Sprint</span>
                            </button>
                          )}

                          <button
                            onClick={() => openCreateTaskModal(sprint.id)}
                            className="p-1.5 hover:bg-slate-100 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                            title="Tambah task ke sprint ini"
                          >
                            <Plus size={16} />
                          </button>

                          <button
                            onClick={() => handleDeleteSprint(sprint.id)}
                            className="p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                            title="Hapus sprint"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Tasks in Sprint */}
                      <div className="flex flex-col gap-2">
                        {sprintTasks.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                            Belum ada task di dalam Sprint ini. Pindahkan dari Product Backlog di sebelah kiri.
                          </div>
                        ) : (
                          sprintTasks.map((task) => {
                            const sp = task.storyPoints ?? task.story_points ?? 3;
                            const taskAssignees = task.assignees || [];
                            const isTaskDone = task.status === "DONE";

                            return (
                              <div
                                key={task.id}
                                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                  isTaskDone
                                    ? "bg-emerald-50/40 border-emerald-200/60 text-muted-foreground"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      task.status === "DONE"
                                        ? "bg-emerald-500"
                                        : task.status === "DOING"
                                        ? "bg-blue-500"
                                        : task.status === "REVIEW"
                                        ? "bg-amber-500"
                                        : "bg-slate-300"
                                    }`}
                                  />
                                  <span
                                    className={`text-xs font-bold truncate ${
                                      isTaskDone ? "line-through text-muted-foreground" : "text-foreground"
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                                    ⚡ {sp} SP
                                  </span>

                                  <div className="flex items-center -space-x-1">
                                    {taskAssignees.map((a: any, i: number) => (
                                      <div
                                        key={i}
                                        className="w-5 h-5 rounded-full bg-primary/20 text-primary border border-white flex items-center justify-center text-[8px] font-black"
                                        title={a.name}
                                      >
                                        {a.initials || a.name?.slice(0, 2)?.toUpperCase()}
                                      </div>
                                    ))}
                                  </div>

                                  <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                      task.status === "DONE"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : task.status === "DOING"
                                        ? "bg-blue-100 text-blue-700"
                                        : task.status === "REVIEW"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {task.status}
                                  </span>

                                  {/* Quick move back to backlog */}
                                  <button
                                    onClick={() => handleMoveTaskToSprint(task.id, null)}
                                    className="text-[10px] font-bold text-muted-foreground hover:text-red-500 px-1.5 py-0.5 border border-border rounded hover:bg-slate-50 transition-colors"
                                    title="Kembalikan ke Backlog"
                                  >
                                    Ke Backlog
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Buat Sprint Baru */}
      {isSprintModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsSprintModalOpen(false)}
        >
          <div
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-foreground">Buat Sprint Baru</h3>

            <form onSubmit={handleCreateSprint} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-black text-foreground block mb-1">Nama Sprint</label>
                <input
                  type="text"
                  placeholder="Contoh: Sprint 1 - Otentikasi & Setup"
                  value={sprintForm.name}
                  onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Tujuan / Goal Sprint</label>
                <textarea
                  placeholder="Target utama yang harus diselesaikan pada sprint ini..."
                  value={sprintForm.goal}
                  onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-foreground block mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={sprintForm.startDate}
                    onChange={(e) => setSprintForm({ ...sprintForm, startDate: e.target.value })}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-foreground block mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={sprintForm.endDate}
                    onChange={(e) => setSprintForm({ ...sprintForm, endDate: e.target.value })}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSprintModalOpen(false)}
                  className="flex-1 h-10 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white text-xs font-black rounded-xl transition-colors shadow-sm shadow-primary/20"
                >
                  Simpan Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Task */}
      {isTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsTaskModalOpen(false)}
        >
          <div
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-foreground">
              {isEditingTask ? "Edit Tugas Scrum" : "Tambah Tugas Baru"}
            </h3>

            <form onSubmit={handleSaveTask} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-black text-foreground block mb-1">Judul Tugas</label>
                <input
                  type="text"
                  placeholder="Contoh: Implementasi JWT Auth & Middleware"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Deskripsi Pengerjaan</label>
                <textarea
                  placeholder="Petunjuk atau spesifikasi fitur yang perlu dikerjakan..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary min-h-[70px]"
                />
              </div>

              {/* Fibonacci Story Points */}
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5 flex items-center gap-1">
                  <span>Tingkat Kesulitan (Fibonacci Story Points)</span>
                  <span className="text-purple-600">⚡</span>
                </label>
                <div className="flex items-center gap-2">
                  {FIBONACCI_POINTS.map((points) => (
                    <button
                      key={points}
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, storyPoints: points })}
                      className={`flex-1 h-9 rounded-xl text-xs font-black transition-all border ${
                        taskForm.storyPoints === points
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                          : "bg-slate-50 hover:bg-slate-100 text-foreground border-slate-200"
                      }`}
                    >
                      {points}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  1-2: Mudah | 3-5: Sedang | 8-13: Sulit/Kompleks | 21: Sangat Besar
                </p>
              </div>

              {/* Assignees Selection */}
              <div>
                <label className="text-xs font-black text-foreground block mb-1.5">
                  Tugaskan ke Mahasiswa (Assignee)
                </label>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-border rounded-xl">
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Belum ada anggota di riset ini.
                    </p>
                  ) : (
                    members.map((member) => {
                      const isSelected = taskForm.assigneeIds.includes(member.userId);
                      return (
                        <label
                          key={member.userId}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "bg-purple-50 text-purple-900 font-bold" : "hover:bg-slate-100 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTaskForm({
                                    ...taskForm,
                                    assigneeIds: [...taskForm.assigneeIds, member.userId]
                                  });
                                } else {
                                  setTaskForm({
                                    ...taskForm,
                                    assigneeIds: taskForm.assigneeIds.filter((id) => id !== member.userId)
                                  });
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-xs">{member.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{member.role}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sprint Destination */}
              <div>
                <label className="text-xs font-black text-foreground block mb-1">Tujuan Sprint</label>
                <select
                  value={taskForm.sprintId || ""}
                  onChange={(e) => setTaskForm({ ...taskForm, sprintId: e.target.value || null })}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Simpan di Product Backlog (Belum dijadwalkan)</option>
                  {sprints
                    .filter((s) => s.status !== "completed")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.status === "active" ? "(Sedang Aktif)" : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 h-10 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white text-xs font-black rounded-xl transition-colors shadow-sm shadow-primary/20"
                >
                  {isEditingTask ? "Simpan Perubahan" : "Tambahkan Tugas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
}
