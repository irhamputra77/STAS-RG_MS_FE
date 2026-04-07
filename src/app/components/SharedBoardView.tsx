/**
 * SharedBoardView — identik dengan BoardView di MyResearch.tsx
 * Digunakan oleh ProgressTim (Dosen) dan ProgressBoard (Operator)
 * Full access: add task, edit, delete, move, edit board, manage milestone
 */
import React, { useEffect, useState } from "react";
import {
  ChevronLeft, Edit2, AlertTriangle, Check, X,
  UploadCloud, Download, Send, FileText, Link,
  Image as ImageIcon, Folder, Calendar, Plus, Trash2, MessageSquare,
  Paperclip, GitBranch, ExternalLink,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getStoredUser } from "../lib/api";

type Milestone = {
  id?: number;
  label: string;
  done: boolean;
  sortOrder?: number;
};

type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
};

type BoardTask = {
  id: string;
  title: string;
  status: "TO DO" | "DOING" | "REVIEW" | "DONE";
  deadline?: string;
  statusText?: string;
  tag: string;
  sp: number;
  assignees: string[];
  comments: number;
  isOverdue: boolean;
  progress?: number;
};

type BoardColumns = {
  todo: BoardTask[];
  doing: BoardTask[];
  review: BoardTask[];
  done: BoardTask[];
};

type ProjectView = {
  id: string;
  shortTitle: string;
  period: string;
  mitra: string;
  progress: number;
  progressColor: string;
  status: string;
  ketuaInitials: string;
};

const EMPTY_BOARD_COLUMNS: BoardColumns = { todo: [], doing: [], review: [], done: [] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActiveMilestoneLabel(milestones: Milestone[]) {
  return milestones.find((m) => !m.done)?.label ?? "Semua Selesai ✓";
}

function getMilestoneProgress(milestones: Milestone[]) {
  return milestones.length
    ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
    : 0;
}

// ─── MilestoneBanner ─────────────────────────────────────────────────────────

function MilestoneBanner({
  milestones, progressColor, onToggle, onManage,
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
              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 hover:shadow-md focus:outline-none ${m.done ? `${progressColor} border-transparent text-white` : "bg-white border-[#A8E895] hover:border-[#0AB600]"
                }`}
            >
              {m.done ? (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
                  <path d="M1 6l3.5 3.5L11 2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-[#A8E895]" />
              )}
            </button>
            <span className={`text-[9px] font-bold whitespace-nowrap transition-colors ${m.done ? "text-[#0AB600]" : "text-[#5CC444]/70"}`}>
              {m.label}
            </span>
          </div>
          {i < arr.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${m.done && arr[i + 1].done ? progressColor
              : m.done ? `${progressColor} opacity-30`
                : "bg-[#D8F5D0]"
              }`} />
          )}
        </div>
      ))}
      <button
        onClick={onManage}
        className="ml-4 mb-4 shrink-0 flex items-center gap-1.5 px-3 py-1 bg-white border border-[#D8F5D0] hover:border-[#0AB600] hover:bg-[#F0FFF0] rounded-lg text-[10px] font-black text-[#4AB834] hover:text-[#0AB600] transition-all opacity-0 group-hover/banner:opacity-100 shadow-sm whitespace-nowrap"
      >
        <Edit2 size={10} strokeWidth={3} /> Kelola
      </button>
    </div>
  );
}

// ─── Tag color ────────────────────────────────────────────────────────────────

function getTagColor(tag: string) {
  switch (tag) {
    case "Backend": return "bg-teal-100 text-teal-700";
    case "Penulis TA": return "bg-cyan-100 text-cyan-700";
    case "Hardware": return "bg-slate-200 text-slate-700";
    case "Dokumentasi": return "bg-amber-100 text-amber-700";
    case "Jurnal": return "bg-blue-100 text-blue-700";
    case "Done": return "bg-emerald-100 text-emerald-700";
    default: return "bg-muted text-muted-foreground";
  }
}

// ─── Board tasks (same as mahasiswa) ──────────────────────────────────────────

interface SharedBoardViewProps {
  /** Which projects to show in the switcher */
  projectIds?: string[];
  strictProjectFilter?: boolean;
  /** Label for the "back" button — if provided, show back button instead of switcher */
  backLabel?: string;
  onBack?: () => void;
  /** Accent color class for active tab/button (default: bg-[#6C47FF]) */
  accentBg?: string;
  accentText?: string;
  accentHover?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SharedBoardView({
  projectIds = [],
  strictProjectFilter = false,
  backLabel,
  onBack,
  accentBg = "bg-[#0AB600]",
  accentText = "text-[#0AB600]",
  accentHover = "hover:text-[#0AB600]",
}: SharedBoardViewProps) {
  const currentUser = getStoredUser();

  const [availableProjects, setAvailableProjects] = useState<ProjectView[]>([]);
  const [activeId, setActiveId] = useState("");
  const [milestonesMap, setMilestonesMap] = useState<Record<string, Milestone[]>>({});
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TeamMember[]>>({});
  const [tasksMap, setTasksMap] = useState<Record<string, BoardColumns>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const projectIdsKey = projectIds.join("|");

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const projectRows = await apiGet<Array<any>>("/research");
        const filteredRows = strictProjectFilter
          ? (projectRows || []).filter((row) => projectIds.includes(row.id))
          : projectIds.length
            ? (projectRows || []).filter((row) => projectIds.includes(row.id))
            : (projectRows || []);

        const detailRows = await Promise.all(
          filteredRows.map(async (row) => {
            const [members, milestones] = await Promise.all([
              apiGet<Array<any>>(`/research/${row.id}/members`).catch(() => []),
              apiGet<Array<any>>(`/research/${row.id}/milestones`).catch(() => [])
            ]);
            return { row, members, milestones };
          })
        );

        const nextTeamMembersMap: Record<string, TeamMember[]> = {};
        const nextMilestonesMap: Record<string, Milestone[]> = {};

        const mappedProjects: ProjectView[] = detailRows.map(({ row, members, milestones }) => {
          const teamMembers: TeamMember[] = (members || []).map((member, index) => {
            const fallbackInitials = String(member?.name || "TM")
              .split(" ")
              .map((chunk: string) => chunk[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase() || "TM";
            return {
              id: member.user_id,
              name: member.name || "Anggota Tim",
              initials: member.initials || fallbackInitials,
              role: member.peran || member.member_type || "Anggota",
              color: member.member_type === "Dosen"
                ? "bg-blue-500 text-white"
                : index % 2 === 0
                  ? "bg-[#8B6FFF] text-white"
                  : "bg-emerald-500 text-white"
            };
          });

          nextTeamMembersMap[row.id] = teamMembers;
          nextMilestonesMap[row.id] = (milestones || []).map((item: any) => ({
            id: item.id,
            label: item.label,
            done: Boolean(item.done),
            sortOrder: item.sort_order
          }));

          const ketuaByPeran = teamMembers.find((member) => /ketua/i.test(member.role || ""));
          const ketuaByInitial = teamMembers.find((member) => member.initials === row.supervisor_initials);

          return {
            id: row.id,
            shortTitle: row.short_title || row.title || "Riset",
            period: row.period_text || "-",
            mitra: row.mitra || "-",
            progress: Number(row.progress) || 0,
            progressColor: "bg-[#6C47FF]",
            status: row.status || "Aktif",
            ketuaInitials: ketuaByInitial?.initials || ketuaByPeran?.initials || teamMembers[0]?.initials || "TM"
          };
        });

        setAvailableProjects(mappedProjects);
        setTeamMembersMap(nextTeamMembersMap);
        setMilestonesMap(nextMilestonesMap);
        setActiveId((prev) => {
          if (mappedProjects.some((project) => project.id === prev)) return prev;
          return mappedProjects[0]?.id || "";
        });
      } catch (error: any) {
        setLoadError(error?.message || "Gagal memuat data board.");
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [projectIdsKey]);

  useEffect(() => {
    const loadBoard = async () => {
      if (!activeId) return;
      try {
        const data = await apiGet<any>(`/research/${activeId}/board`);
        const fallbackAssignee = teamMembersMap[activeId]?.[0]?.initials;
        const mapColumn = (rows: Array<any> = [], status: BoardTask["status"]) =>
          rows.map((item) => ({
            id: item.id,
            title: item.title,
            status,
            deadline: item.deadline,
            statusText: item.statusText,
            tag: status === "DONE" ? "Done" : "Riset",
            sp: 3,
            assignees: fallbackAssignee ? [fallbackAssignee] : [],
            comments: Number(item.commentsCount) || 0,
            isOverdue: false,
            progress: status === "DOING" ? Number(item.progress || 45) : undefined
          }));

        setTasksMap((prev) => ({
          ...prev,
          [activeId]: {
            todo: mapColumn(data?.columns?.todo, "TO DO"),
            doing: mapColumn(data?.columns?.doing, "DOING"),
            review: mapColumn(data?.columns?.review, "REVIEW"),
            done: mapColumn(data?.columns?.done, "DONE")
          }
        }));
      } catch {
        setTasksMap((prev) => ({ ...prev, [activeId]: EMPTY_BOARD_COLUMNS }));
      }
    };

    loadBoard();
  }, [activeId, teamMembersMap]);

  // Modal state
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "lampiran" | "komentar">("detail");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [subtasks, setSubtasks] = useState([""]);
  const [newMilestoneLabel, setNewMilestoneLabel] = useState("");
  const [editingMsIndex, setEditingMsIndex] = useState<number | null>(null);
  const [editingMsLabel, setEditingMsLabel] = useState("");
  const [taskComments, setTaskComments] = useState<Array<any>>([]);
  const [taskCommentsLoading, setTaskCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  // Attachment link state
  const [attachmentLink, setAttachmentLink] = useState("");
  const [isEditingAttachment, setIsEditingAttachment] = useState(false);
  const [savingAttachment, setSavingAttachment] = useState(false);

  // Add member modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [availableCandidates, setAvailableCandidates] = useState<Array<{ user_id: string; name: string; initials: string; member_type: string }>>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [newMemberPeran, setNewMemberPeran] = useState("Anggota");
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Computed values (AFTER all hooks)
  const project = availableProjects.find((row) => row.id === activeId) ?? availableProjects[0];
  const milestones = milestonesMap[activeId] ?? [];
  const tasks = tasksMap[activeId] ?? EMPTY_BOARD_COLUMNS;

  // Initialize attachment link when project changes
  React.useEffect(() => {
    if (project?.attachment_link) {
      setAttachmentLink(project.attachment_link);
    }
  }, [project?.id]);

  const toggleMilestone = async (i: number) => {
    const current = milestones[i];
    if (!current) return;
    if (current.id) {
      await apiPatch(`/research/${activeId}/milestones/${current.id}`, { done: !current.done });
    }
    setMilestonesMap((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] || []).map((item, index) =>
        index === i ? { ...item, done: !item.done } : item
      )
    }));
  };

  if (loading) {
    return (
      <div className="-m-8 flex min-h-[calc(100vh-60px)] items-center justify-center bg-slate-50/30 p-8">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-sm text-sm text-muted-foreground">
          Memuat progress board...
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="-m-8 flex min-h-[calc(100vh-60px)] items-center justify-center bg-slate-50/30 p-8">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Progress Board</p>
          <h2 className="mt-2 text-xl font-black text-foreground">Belum ada proyek riset</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {loadError || "Data board akan muncul setelah operator menambahkan data riset di menu database riset."}
          </p>
        </div>
      </div>
    );
  }

  const teamMembers = teamMembersMap[activeId] || [];
  const ketuaMember = teamMembers.find((m) => m.role.toLowerCase().includes("ketua"));
  const activeMsLabel = getActiveMilestoneLabel(milestones);
  const milestoneProgress = getMilestoneProgress(milestones);

  const getAssigneeColor = (initials: string) =>
    teamMembers.find((m) => m.initials === initials)?.color ?? "bg-slate-300 text-white";
  const getMemberName = (initials: string) =>
    teamMembers.find((m) => m.initials === initials)?.name ?? initials;

  // ─── Add Member Functions ───────────────────────────────────────────────────

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const [studentsData, lecturersData] = await Promise.all([
        apiGet<Array<any>>("/students").catch(() => []),
        apiGet<Array<any>>("/lecturers").catch(() => [])
      ]);

      const currentMemberIds = new Set(teamMembers.map(m => m.id));

      const candidates = [
        ...(studentsData || []).map((s: any) => ({
          user_id: s.user_id,
          name: s.name,
          initials: s.initials,
          member_type: "Mahasiswa"
        })),
        ...(lecturersData || []).map((l: any) => ({
          user_id: l.user_id,
          name: l.name,
          initials: l.initials,
          member_type: "Dosen"
        }))
      ].filter((c: any) => !currentMemberIds.has(c.user_id));

      setAvailableCandidates(candidates);
      setSelectedCandidateIds([]);
      setNewMemberPeran("Anggota");
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openAddMemberModal = async () => {
    await loadCandidates();
    setIsAddMemberOpen(true);
  };

  const toggleCandidate = (userId: string) => {
    setSelectedCandidateId(prev => prev === userId ? null : userId);
  };

  const handleAddMembers = async () => {
    if (!selectedCandidateId) return;
    
    const candidate = availableCandidates.find(c => c.user_id === selectedCandidateId);
    const hasKetua = teamMembers.some(m => m.role.toLowerCase().includes("ketua"));
    
    // Validate Ketua role
    if (newMemberPeran === "Ketua") {
      if (hasKetua) {
        alert("Sudah ada Ketua di riset ini. Hanya boleh ada 1 Ketua.");
        return;
      }
      if (candidate?.member_type !== "Dosen") {
        alert("Ketua tim wajib Dosen. Mahasiswa tidak bisa menjadi Ketua.");
        return;
      }
    }
    
    console.log("[Add Member] Payload:", {
      userId: selectedCandidateId,
      memberType: candidate?.member_type,
      peran: newMemberPeran,
      status: "Aktif"
    });
    
    try {
      await apiPost(`/research/${activeId}/members`, {
        userId: selectedCandidateId,
        memberType: candidate?.member_type || "Mahasiswa",
        peran: newMemberPeran,
        status: "Aktif"
      });

      // Reload members dari API
      const members = await apiGet<Array<any>>(`/research/${activeId}/members`);
      console.log("[Add Member] API Response:", members);
      
      const updatedTeamMembers: TeamMember[] = (members || []).map((member, index) => {
        const fallbackInitials = String(member?.name || "TM")
          .split(" ")
          .map((chunk: string) => chunk[0] || "")
          .join("")
          .slice(0, 2)
          .toUpperCase() || "TM";
        const mappedMember = {
          id: member.user_id,
          name: member.name || "Anggota Tim",
          initials: member.initials || fallbackInitials,
          role: member.peran || member.member_type || "Anggota",
          color: member.member_type === "Dosen"
            ? "bg-blue-500 text-white"
            : index % 2 === 0
              ? "bg-[#8B6FFF] text-white"
              : "bg-emerald-500 text-white"
        };
        console.log("[Add Member] Mapped member:", mappedMember);
        return mappedMember;
      });

      console.log("[Add Member] Updated team members:", updatedTeamMembers);
      
      // Update map dan trigger re-render
      setTeamMembersMap(prev => {
        const newMap = { ...prev, [activeId]: updatedTeamMembers };
        console.log("[Add Member] New teamMembersMap:", newMap);
        return newMap;
      });
      
      setIsAddMemberOpen(false);
      setSelectedCandidateId(null);
      setNewMemberPeran("Anggota");
    } catch (err: any) {
      console.error("[Add Member] Error:", err);
      alert(err?.message || "Gagal menambah anggota");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    if (!member) return;

    if (!confirm(`Hapus ${member.name} dari tim riset?`)) return;

    try {
      await apiDelete(`/research/${activeId}/members/${userId}`);

      // Reload members
      const members = await apiGet<Array<any>>(`/research/${activeId}/members`);
      const updatedTeamMembers: TeamMember[] = (members || []).map((m, index) => {
        const fallbackInitials = String(m?.name || "TM")
          .split(" ")
          .map((chunk: string) => chunk[0] || "")
          .join("")
          .slice(0, 2)
          .toUpperCase() || "TM";
        return {
          id: m.user_id,
          name: m.name || "Anggota Tim",
          initials: m.initials || fallbackInitials,
          role: m.peran || m.member_type || "Anggota",
          color: m.member_type === "Dosen"
            ? "bg-blue-500 text-white"
            : index % 2 === 0
              ? "bg-[#8B6FFF] text-white"
              : "bg-emerald-500 text-white"
        };
      });
      setTeamMembersMap(prev => ({ ...prev, [activeId]: updatedTeamMembers }));
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      alert(err?.message || "Gagal menghapus anggota");
    }
  };

  const columns = [
    { id: "todo", title: "TO DO", bg: "bg-slate-50", iconColor: "bg-slate-300", textColor: "text-slate-600", pillBg: "bg-slate-200 text-slate-700" },
    { id: "doing", title: "DOING", bg: "bg-blue-50/50", iconColor: "bg-blue-400", textColor: "text-blue-600", pillBg: "bg-blue-100 text-blue-700" },
    { id: "review", title: "REVIEW", bg: "bg-amber-50/50", iconColor: "bg-amber-400", textColor: "text-amber-600", pillBg: "bg-amber-100 text-amber-700" },
    { id: "done", title: "DONE", bg: "bg-emerald-50/50", iconColor: "bg-emerald-400", textColor: "text-emerald-600", pillBg: "bg-emerald-100 text-emerald-700" },
  ];

  const openTask = async (task: any) => {
    setSelectedTask(task);
    setActiveTab("detail");
    setShowDeleteWarning(false);
    setNewCommentText("");
    setTaskComments([]);
    setTaskCommentsLoading(true);
    try {
      const rows = await apiGet<Array<any>>(`/logbooks?projectId=${encodeURIComponent(activeId)}`);
      const detail = (rows || []).find((item) => item.id === task.id);
      setTaskComments(Array.isArray(detail?.comments) ? detail.comments : []);
    } catch {
      setTaskComments([]);
    } finally {
      setTaskCommentsLoading(false);
    }
  };
  const closeTask = () => { setSelectedTask(null); setShowDeleteWarning(false); };
  const addSubtaskRow = () => setSubtasks([...subtasks, ""]);
  const removeSubtaskRow = (i: number) => setSubtasks(subtasks.filter((_, idx) => idx !== i));

  const deleteTask = () => {
    if (!selectedTask) return;
    const col = selectedTask.status.toLowerCase().replace(" ", "");
    const colKey: keyof BoardColumns = col === "todo" ? "todo" : col === "doing" ? "doing" : col === "review" ? "review" : "done";
    setTasksMap(prev => ({
      ...prev,
      [activeId]: {
        ...(prev[activeId] || EMPTY_BOARD_COLUMNS),
        [colKey]: ((prev[activeId] || EMPTY_BOARD_COLUMNS)[colKey] || []).filter((t: any) => t.id !== selectedTask.id)
      }
    }));
    closeTask();
  };

  const addMilestone = async () => {
    if (!newMilestoneLabel.trim()) return;
    const response = await apiPost<{ id?: number }>(`/research/${activeId}/milestones`, {
      label: newMilestoneLabel.trim(),
      done: false,
      sortOrder: milestones.length
    });
    setMilestonesMap(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), { id: response?.id, label: newMilestoneLabel.trim(), done: false }]
    }));
    setNewMilestoneLabel("");
  };

  const renameMilestone = async (index: number, label: string) => {
    const current = milestones[index];
    if (!current || !label.trim()) return;
    if (current.id) {
      await apiPatch(`/research/${activeId}/milestones/${current.id}`, { label: label.trim() });
    }
    setMilestonesMap((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] || []).map((item, idx) =>
        idx === index ? { ...item, label: label.trim() } : item
      )
    }));
  };

  const removeMilestone = async (index: number) => {
    const current = milestones[index];
    if (!current) return;
    if (current.id) {
      await apiDelete(`/research/${activeId}/milestones/${current.id}`);
    }
    setMilestonesMap((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] || []).filter((_, idx) => idx !== index)
    }));
  };

  // ─── Attachment Link Functions ──────────────────────────────────────────────

  const saveAttachmentLink = async () => {
    setSavingAttachment(true);
    try {
      await apiPut(`/research/${activeId}`, { attachmentLink: attachmentLink.trim() || null });
      setIsEditingAttachment(false);
      // Update availableProjects state agar UI langsung ter-update
      setAvailableProjects(prev =>
        prev.map(p =>
          p.id === activeId
            ? { ...p, attachment_link: attachmentLink.trim() || undefined }
            : p
        )
      );
    } catch (err: any) {
      console.error("Failed to save attachment link:", err);
      alert(err?.message || "Gagal menyimpan link lampiran");
    } finally {
      setSavingAttachment(false);
    }
  };

  const sendTaskComment = async () => {
    if (!selectedTask?.id || !currentUser?.id) return;
    const text = newCommentText.trim();
    if (!text) return;

    const payload = {
      id: `LCM-${Date.now()}`,
      logbookId: selectedTask.id,
      authorId: currentUser.id,
      authorName: currentUser.name || null,
      text
    };

    await apiPost(`/logbooks/${selectedTask.id}/comments`, payload);

    const createdComment = {
      id: payload.id,
      authorId: payload.authorId,
      authorName: payload.authorName || "Pengguna",
      text: payload.text,
      createdAt: new Date().toISOString()
    };

    setTaskComments((prev) => [createdComment, ...prev]);
    setNewCommentText("");
    setSelectedTask((prev: any) => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : prev);
    setTasksMap((prev) => {
      const columns = prev[activeId] || EMPTY_BOARD_COLUMNS;
      const patch = (rows: any[]) => rows.map((row) => row.id === selectedTask.id ? { ...row, comments: (row.comments || 0) + 1 } : row);
      return {
        ...prev,
        [activeId]: {
          todo: patch(columns.todo || []),
          doing: patch(columns.doing || []),
          review: patch(columns.review || []),
          done: patch(columns.done || [])
        }
      };
    });
  };

  return (
    <>
      <div className="-m-8 flex flex-col min-h-[calc(100vh-60px)] bg-slate-50/30">
        <div className="p-8 flex flex-col gap-6 flex-1">

          {/* ── Topbar row ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {backLabel && onBack ? (
                <button
                  onClick={onBack}
                  className={`flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-xl text-sm font-bold text-slate-600 ${accentHover} hover:border-[#0AB600]/30 hover:bg-[#F0FFF0] transition-all shadow-sm`}
                >
                  <ChevronLeft size={16} strokeWidth={3} /> {backLabel}
                </button>
              ) : (
                /* Project tabs switcher */
                <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1 shadow-sm">
                  {availableProjects.map(r => (
                    <button key={r.id} onClick={() => setActiveId(r.id)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeId === r.id ? `${accentBg} text-white shadow-sm` : "text-muted-foreground hover:text-foreground"}`}>
                      {r.shortTitle.split("–")[0].trim()}
                    </button>
                  ))}
                </div>
              )}
              <div className="w-px h-6 bg-border" />
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Progress Board</p>
                <h1 className="text-xl font-black text-foreground">{project.shortTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                title="Edit Board Settings"
                onClick={() => setIsEditBoardOpen(true)}
                className={`flex items-center justify-center bg-white border border-border rounded-xl w-10 h-10 text-slate-500 ${accentHover} hover:bg-slate-50 hover:border-[#0AB600]/30 transition-all shadow-sm`}
              >
                <Edit2 size={16} strokeWidth={2.5} />
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={() => setIsAddTaskOpen(true)}
                className={`${accentBg} hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2`}
              >
                <Plus size={16} strokeWidth={3} /> Tambah Tugas
              </button>
            </div>
          </div>

          {/* ── Metadata Banner ── */}
          <div className="bg-[#F0FFF0] border border-[#D8F5D0] rounded-[16px] overflow-hidden">
            {/* Top row */}
            <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#D8F5D0]">
              <div className="flex flex-col gap-1 group">
                <div className="flex items-center gap-2">
                  <span>📌</span>
                  <h2 className={`text-lg font-bold ${accentText}`}>{project.shortTitle}</h2>
                  <button
                    onClick={() => setIsEditBoardOpen(true)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/60 border border-[#D8F5D0] text-[#4AB834] hover:text-[#0AB600] hover:bg-white rounded-lg transition-all shadow-sm"
                  >
                    <Edit2 size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5">
                  {[
                    { label: "Ketua", value: ketuaMember?.name },
                    { label: "Periode", value: project.period },
                    { label: "Mitra", value: project.mitra.split(" Hibah")[0] },
                    { label: "Milestone", value: activeMsLabel },
                  ].map((item, i, arr) => (
                    <React.Fragment key={item.label}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-[#5CC444] uppercase tracking-wider">{item.label}</span>
                        <span className={`text-xs font-bold ${accentText}`}>{item.value}</span>
                      </div>
                      {i < arr.length - 1 && <div className="w-px h-3 bg-[#A8E895]" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 min-w-[180px] shrink-0">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-[#4AB834]">Progress</span>
                  <span className={`text-sm font-black ${accentText}`}>{milestoneProgress}%</span>
                </div>
                <div className="w-full bg-[#D8F5D0] rounded-full h-2">
                  <div className={`${accentBg} h-2 rounded-full transition-all duration-500`} style={{ width: `${milestoneProgress}%` }} />
                </div>
                <span className="text-[10px] font-medium text-[#4AB834]">
                  {milestones.filter(m => m.done).length} dari {milestones.length} milestone selesai
                </span>
              </div>
            </div>

            {/* Milestone bar */}
            <div className="px-5 pt-4 pb-2 border-b border-[#D8F5D0]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-[#5CC444] uppercase tracking-wider">
                  Milestone Progress — {milestones.filter(m => m.done).length}/{milestones.length} Selesai
                </span>
                <button
                  onClick={() => setIsMilestoneOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D8F5D0] hover:border-[#0AB600] hover:bg-[#F0FFF0] rounded-lg text-[10px] font-black text-[#4AB834] hover:text-[#0AB600] transition-all shadow-sm"
                >
                  <Edit2 size={10} strokeWidth={3} /> Kelola Milestone
                </button>
              </div>
              <MilestoneBanner
                milestones={milestones}
                progressColor={project.progressColor}
                onToggle={toggleMilestone}
                onManage={() => setIsMilestoneOpen(true)}
              />
            </div>

            {/* Team members */}
            <div className="px-5 py-4">
              <span className="text-[10px] font-black text-[#5CC444] uppercase tracking-wider block mb-3">Anggota Tim</span>
              <div className="flex flex-wrap gap-2.5">
                {teamMembers.map((member, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-white border border-[#D8F5D0] rounded-xl px-3 py-2 shadow-sm hover:shadow-md hover:border-[#0AB600]/40 transition-all cursor-default">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAssigneeColor(member.initials)}`}>
                      {member.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 whitespace-nowrap">{member.name}</span>
                      <span className="text-[10px] font-medium text-[#4AB834] whitespace-nowrap">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachment Link */}
            <div className="px-5 py-4 border-t border-[#D8F5D0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-[#5CC444] uppercase tracking-wider">Lampiran</span>
                <button
                  onClick={() => { setAttachmentLink(project.attachment_link || ""); setIsEditingAttachment(!isEditingAttachment); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D8F5D0] hover:border-[#0AB600] hover:bg-[#F0FFF0] rounded-lg text-[10px] font-black text-[#4AB834] hover:text-[#0AB600] transition-all shadow-sm"
                >
                  <Link size={10} strokeWidth={3} /> {isEditingAttachment ? "Batal" : "Edit"}
                </button>
              </div>
              {isEditingAttachment ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={attachmentLink}
                    onChange={e => setAttachmentLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 px-3 py-2 bg-white border border-[#D8F5D0] rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0AB600]/20 focus:border-[#0AB600]"
                  />
                  <button
                    onClick={saveAttachmentLink}
                    disabled={savingAttachment}
                    className="px-3 py-2 bg-[#0AB600] hover:bg-[#099800] disabled:opacity-50 text-white rounded-lg text-xs font-black transition-colors"
                  >
                    {savingAttachment ? "..." : "Simpan"}
                  </button>
                </div>
              ) : project.attachment_link ? (
                <a
                  href={project.attachment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-[#D8F5D0] rounded-lg text-xs text-[#0AB600] hover:bg-[#F0FFF0] transition-all break-all"
                >
                  <Link size={12} /> {project.attachment_link}
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada lampiran</p>
              )}
            </div>
          </div>

          {/* ── Kanban Board ── */}
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
            {columns.map((col) => (
              <div key={col.id} className={`flex flex-col min-w-[300px] w-[300px] rounded-[20px] ${col.bg} p-4`}>
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className={`w-3 h-3 rounded-sm ${col.iconColor}`} />
                  <h3 className={`text-sm font-bold ${col.textColor} uppercase tracking-wider`}>{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${col.pillBg} ml-1`}>{(tasks[col.id] || []).length}</span>
                </div>
                <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
                  {(tasks[col.id] || []).map((task: any) => (
                    <div
                      key={task.id}
                      onClick={() => openTask(task)}
                      className={`bg-white rounded-[16px] p-5 shadow-sm border ${task.isOverdue && col.id !== "done" ? "border-red-400" : "border-border/60"} hover:shadow-md transition-all cursor-pointer`}
                    >
                      <p className="font-bold text-sm text-foreground mb-2.5 leading-snug">{task.title}</p>
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
                          {col.id === "done" && <Check size={12} className="text-emerald-500" strokeWidth={3} />}
                          <span className={`text-[11px] font-bold ${col.id === "done" ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {task.statusText}
                          </span>
                        </div>
                      )}
                      {task.progress !== undefined && (
                        <div className="mb-4">
                          <span className="text-[10px] font-bold text-muted-foreground block mb-1.5">{task.progress}% selesai</span>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className={`${accentBg} h-1.5 rounded-full`} style={{ width: `${task.progress}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${getTagColor(task.tag)}`}>{task.tag}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center -space-x-1.5">
                            {task.assignees.map((a: string, i: number) => (
                              <div
                                key={i}
                                className={`group/avatar relative w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border-[1.5px] border-white shadow-sm cursor-pointer ${getAssigneeColor(a)}`}
                                style={{ zIndex: 5 - i }}
                              >
                                {a}
                                <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible whitespace-nowrap z-50 transition-all shadow-lg pointer-events-none">
                                  {getMemberName(a)}
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-1 text-slate-300">
                            <MessageSquare size={12} fill="currentColor" />
                            <span className="text-[11px] font-bold">{task.comments}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {col.id === "done" && (tasks[col.id] || []).length > 0 && (
                    <div className="text-center py-2">
                      <span className="text-xs font-bold text-emerald-400/80 cursor-pointer hover:text-emerald-500 transition-colors">+ tugas lainnya</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Project Attachments ── */}
          <div className="mt-2 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Paperclip className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-foreground">Lampiran Proyek</h2>
            </div>
            <div className="rounded-[16px] border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
              Lampiran proyek belum terintegrasi dengan API.
            </div>
          </div>

          {/* ──   Links ── */}
          <div className="mt-2 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-foreground">Repository</h2>
            </div>
            <div className="bg-white rounded-[16px] border border-border/60 p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Data repository belum terintegrasi dengan API.</p>
            </div>
          </div>

        </div>
      </div>

      {/* ══ Task Detail Modal ══ */}
      {selectedTask && !isEditModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[600px] max-h-[88vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative">
            {showDeleteWarning && (
              <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 text-center">
                <div className="max-w-xs w-full bg-white p-6 rounded-2xl shadow-xl border border-border">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
                  <h3 className="text-lg font-black text-foreground mb-2">Hapus Tugas?</h3>
                  <p className="text-sm text-slate-500 mb-6">Tugas ini akan dihapus permanen dan tidak dapat dikembalikan.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowDeleteWarning(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm">Batal</button>
                    <button onClick={deleteTask} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm">Ya, Hapus</button>
                  </div>
                </div>
              </div>
            )}
            <div className="p-6 border-b border-border bg-white shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${selectedTask.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
                    selectedTask.status === "DOING" ? "bg-blue-100 text-blue-700" :
                      selectedTask.status === "REVIEW" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                    }`}>{selectedTask.status}</span>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${getTagColor(selectedTask.tag)}`}>{selectedTask.tag}</span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">{selectedTask.sp} SP</span>
                </div>
                <div className="flex items-center gap-2">
                  <select defaultValue="" className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none hover:bg-slate-100 cursor-pointer transition-colors">
                    <option value="" disabled>Pindah ke...</option>
                    <option value="todo">TO DO</option>
                    <option value="doing">DOING</option>
                    <option value="review">REVIEW</option>
                    <option value="done">DONE</option>
                  </select>
                  <button onClick={() => setIsEditModalOpen(true)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors border border-transparent hover:border-slate-200"><Edit2 size={14} /></button>
                  <button onClick={() => setShowDeleteWarning(true)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-red-200"><Trash2 size={14} /></button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <button onClick={closeTask} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors ml-1"><X size={18} /></button>
                </div>
              </div>
              <h2 className="text-xl font-black text-foreground mb-4 leading-tight pr-4">{selectedTask.title}</h2>
              {selectedTask.progress !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-muted-foreground">Progress</span>
                    <span className={`text-xs font-black ${accentText}`}>{selectedTask.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${accentBg} h-2 rounded-full`} style={{ width: `${selectedTask.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex px-6 border-b border-border bg-white shrink-0">
              {(["detail", "lampiran", "komentar"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-2 mr-6 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? `border-[#0AB600] ${accentText}` : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {tab === "detail" ? "Detail" : tab === "lampiran" ? "Lampiran (0)" : `Komentar (${selectedTask.comments || 0})`}
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 relative">
              {activeTab === "detail" && (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col">
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
                  <div className="grid grid-cols-2 gap-y-5 gap-x-6 mb-8">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Prioritas</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5" /> Tinggi
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Deadline</span>
                      <span className={`text-sm font-bold ${selectedTask.isOverdue ? "text-red-500" : "text-foreground"}`}>{selectedTask.deadline || "Belum diatur"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Ditugaskan Ke</span>
                      <div className="flex flex-col gap-2">
                        {selectedTask.assignees.map((a: string, i: number) => {
                          const member = teamMembers.find(m => m.initials === a);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${getAssigneeColor(a)}`}>{a}</div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground">{getMemberName(a)}</span>
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
                        <div className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-[9px] font-bold">SYS</div>
                        <span className="text-sm font-bold text-foreground">Sistem</span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-8">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">Deskripsi Tugas</span>
                    <div className="text-sm text-foreground leading-relaxed space-y-3 bg-white p-4 rounded-xl border border-border shadow-sm">
                      <p>{selectedTask.statusText || "Detail tugas belum disediakan oleh API."}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sub-tugas</span>
                    <div className="mt-2 rounded-xl border border-dashed border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                      Sub-tugas belum tersedia dari API.
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "lampiran" && (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                  <div className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                    Lampiran tugas belum terintegrasi ke API.
                  </div>
                </div>
              )}
              {activeTab === "komentar" && (
                <div className="flex flex-col h-full absolute inset-0">
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {taskCommentsLoading && <p className="text-sm text-muted-foreground">Memuat komentar...</p>}
                    {!taskCommentsLoading && taskComments.length === 0 && (
                      <p className="text-sm text-muted-foreground">Belum ada komentar.</p>
                    )}
                    {!taskCommentsLoading && taskComments.map((comment) => {
                      const initials = String(comment.authorName || "U")
                        .split(" ")
                        .map((chunk: string) => chunk[0] || "")
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "U";
                      const isOwn = comment.authorId && currentUser?.id && comment.authorId === currentUser.id;
                      return (
                        <div key={comment.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                          <div className={`w-8 h-8 rounded-full ${isOwn ? "bg-emerald-500" : "bg-blue-500"} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                            {initials}
                          </div>
                          <div className={`flex flex-col gap-1.5 max-w-[85%] ${isOwn ? "items-end" : "items-start"}`}>
                            <div className={`flex items-center gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                              <span className="text-xs font-bold text-foreground">{comment.authorName || "Pengguna"}</span>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {comment.createdAt ? new Date(comment.createdAt).toLocaleString("id-ID") : "-"}
                              </span>
                            </div>
                            <div className={`p-3.5 rounded-2xl text-sm text-foreground shadow-sm leading-relaxed ${isOwn ? "bg-[#F8F5FF] border border-[#E9E0FF] rounded-tr-none" : "bg-white border border-border rounded-tl-none"
                              }`}>
                              {comment.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 bg-white border-t border-border flex items-end gap-3 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
                      {String(currentUser?.initials || "U")}
                    </div>
                    <div className="flex-1 bg-slate-50 border border-border rounded-xl focus-within:ring-2 focus-within:ring-[#6C47FF]/20 focus-within:border-[#6C47FF] transition-all p-1 flex">
                      <textarea
                        placeholder="Tulis komentar..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm p-2.5 min-h-[40px] max-h-[120px]"
                        rows={1}
                      />
                      <button
                        onClick={sendTaskComment}
                        disabled={!newCommentText.trim() || !currentUser?.id}
                        className={`w-10 h-10 ${accentBg} hover:opacity-90 text-white rounded-lg flex items-center justify-center shrink-0 transition-colors self-end m-0.5 disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
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

      {/* ══ Add / Edit Task Modal ══ */}
      {(isAddTaskOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[600px] max-h-[88vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {isEditModalOpen ? <Edit2 className={accentText} size={24} /> : <Folder className="text-amber-400" size={24} fill="#FCD34D" />}
                <h2 className="text-lg font-black text-foreground">{isEditModalOpen ? "Edit Tugas" : "Tambah Tugas Baru"}</h2>
              </div>
              <button onClick={() => { setIsAddTaskOpen(false); setIsEditModalOpen(false); }} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">Judul Tugas <span className="text-red-500">*</span></label>
                <input type="text" defaultValue={isEditModalOpen && selectedTask ? selectedTask.title : ""} placeholder="Contoh: Implementasi model training pipeline..." className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Status</label>
                  <select defaultValue={isEditModalOpen && selectedTask ? selectedTask.status : "TO DO"} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all">
                    <option value="TO DO">To Do</option>
                    <option value="DOING">Doing</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Prioritas</label>
                  <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all">
                    <option>🔴 Tinggi</option><option>🟡 Menengah</option><option>🟢 Rendah</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Deadline</label>
                  <div className="relative">
                    <input type="text" defaultValue={isEditModalOpen && selectedTask ? selectedTask.deadline : ""} placeholder="dd/mm/yyyy" className="w-full p-3 pr-10 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all" />
                    <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Ditugaskan ke</label>
                  <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all">
                    {teamMembers.map((m) => <option key={m.initials}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">Deskripsi Tugas</label>
                <textarea placeholder="Jelaskan detail tugas yang harus dikerjakan..." className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none min-h-[100px] resize-y transition-all" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">Sub-tugas / Checklist</label>
                <div className="flex flex-col gap-2">
                  {subtasks.map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="text" placeholder={`Sub-tugas ${idx + 1}...`} className="flex-1 p-3 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] outline-none transition-all" />
                      <button onClick={() => removeSubtaskRow(idx)} className="w-11 h-11 shrink-0 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 flex items-center justify-center transition-colors"><X size={16} /></button>
                    </div>
                  ))}
                  <button onClick={addSubtaskRow} className="self-start mt-1 flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-bold hover:bg-slate-50 hover:border-[#6C47FF]/50 hover:text-[#6C47FF] transition-all">
                    <Plus size={14} strokeWidth={3} /> Tambah item checklist
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border bg-white flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => { setIsAddTaskOpen(false); setIsEditModalOpen(false); }} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={() => { setIsAddTaskOpen(false); setIsEditModalOpen(false); }} className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white ${accentBg} hover:opacity-90 shadow-sm transition-colors flex items-center gap-2`}>
                <Check size={16} strokeWidth={3} /> {isEditModalOpen ? "Simpan Perubahan" : "Buat Tugas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Edit Board Modal ══ */}
      {isEditBoardOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[500px] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 md:px-6 border-b border-border/50 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-[#F8F5FF] ${accentText} flex items-center justify-center shadow-sm`}><Edit2 size={20} strokeWidth={2.5} /></div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Edit Detail Proyek</h2>
                  <p className="text-[11px] font-bold text-muted-foreground">Pengaturan informasi board</p>
                </div>
              </div>
              <button onClick={() => setIsEditBoardOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="p-5 md:p-6 flex flex-col gap-5 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Nama Proyek</label>
                <input type="text" defaultValue={project.shortTitle} className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Mitra / Organisasi</label>
                <input type="text" defaultValue={project.mitra} className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700">Ketua Tim</label>
                  <div className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 text-sm font-semibold text-slate-600">
                    {ketuaMember?.name || "Belum ditentukan"}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700">Periode</label>
                  <input type="text" defaultValue={project.period} className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Anggota Tim</label>
                <div className="flex flex-col gap-2">
                  {teamMembers.map((member, i) => (
                    <div key={member.id || i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 group hover:border-[#6C47FF]/30 hover:bg-[#F8F5FF] transition-all">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAssigneeColor(member.initials)}`}>{member.initials}</div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800">{member.name}</span>
                        <span className="text-[10px] font-medium text-slate-400">{member.role}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1"
                      >
                        <X size={13} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={openAddMemberModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:text-[#6C47FF] hover:border-[#6C47FF] hover:bg-[#6C47FF]/5 transition-all mt-1"
                  >
                    <Plus size={12} strokeWidth={3} /> Tambah Anggota
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 md:px-6 border-t border-border/50 bg-slate-50/50 flex justify-end gap-3">
              <button onClick={() => setIsEditBoardOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={() => setIsEditBoardOpen(false)} className={`${accentBg} hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all`}>Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Milestone Modal ══ */}
      {isMilestoneOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[6vh] p-4 sm:p-6">
          <div className="bg-white w-full max-w-[520px] max-h-[88vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-foreground">Kelola Milestone</h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{project.shortTitle}</p>
              </div>
              <button onClick={() => { setIsMilestoneOpen(false); setEditingMsIndex(null); }} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 bg-[#F8F5FF] border-b border-[#E9E0FF] shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#9E8BFF]">{milestones.filter(m => m.done).length} dari {milestones.length} milestone selesai</span>
                <span className={`text-sm font-black ${accentText}`}>{milestoneProgress}%</span>
              </div>
              <div className="w-full bg-[#E9E0FF] rounded-full h-2">
                <div className={`${accentBg} h-2 rounded-full transition-all duration-500`} style={{ width: `${milestoneProgress}%` }} />
              </div>
              {activeMsLabel !== "Semua Selesai ✓" && (
                <p className="text-[11px] font-medium text-[#9E8BFF] mt-1.5">Aktif: <span className={`font-black ${accentText}`}>{activeMsLabel}</span></p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
              {milestones.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm font-medium">Belum ada milestone. Tambahkan di bawah.</div>}
              {milestones.map((m, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${m.done ? "bg-[#F8F5FF] border-[#E9E0FF]" : "bg-white border-border hover:border-slate-200"}`}>
                  <span className="text-[10px] font-black text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>
                  <button
                    onClick={() => toggleMilestone(i)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110 ${m.done ? `${project.progressColor} border-transparent text-white` : "bg-white border-slate-300 hover:border-[#6C47FF]"}`}
                  >
                    {m.done && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5"><path d="M1 6l3.5 3.5L11 2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  {editingMsIndex === i ? (
                    <input
                      autoFocus
                      value={editingMsLabel}
                      onChange={(e) => setEditingMsLabel(e.target.value)}
                      onBlur={async () => {
                        if (editingMsLabel.trim()) {
                          await renameMilestone(i, editingMsLabel);
                        }
                        setEditingMsIndex(null);
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          if (editingMsLabel.trim()) {
                            await renameMilestone(i, editingMsLabel);
                          }
                          setEditingMsIndex(null);
                        }
                        if (e.key === "Escape") setEditingMsIndex(null);
                      }}
                      className="flex-1 text-sm font-bold bg-white border border-[#6C47FF] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20"
                    />
                  ) : (
                    <span
                      className={`flex-1 text-sm font-bold cursor-pointer hover:text-[#6C47FF] transition-colors ${m.done ? "text-[#9E8BFF] line-through decoration-[#C5AEFF]" : "text-foreground"}`}
                      onDoubleClick={() => { setEditingMsIndex(i); setEditingMsLabel(m.label); }}
                      title="Double-click untuk ubah nama"
                    >{m.label}</span>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => { setEditingMsIndex(i); setEditingMsLabel(m.label); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#6C47FF] hover:bg-[#F8F5FF] transition-all"><Edit2 size={12} /></button>
                    <button onClick={() => removeMilestone(i)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-border shrink-0 bg-slate-50/50">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Tambah Milestone Baru</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMilestoneLabel}
                  onChange={(e) => setNewMilestoneLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newMilestoneLabel.trim()) addMilestone(); }}
                  placeholder="Contoh: Uji Lapangan, Revisi Jurnal..."
                  className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all bg-white"
                />
                <button onClick={addMilestone} disabled={!newMilestoneLabel.trim()} className={`flex items-center gap-1.5 px-4 py-2.5 ${accentBg} hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shrink-0`}>
                  <Plus size={16} strokeWidth={3} /> Tambah
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">💡 Klik lingkaran untuk toggle · Double-click nama untuk ubah</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ Add Member Modal ══ */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-[130] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-4 sm:p-6" onClick={() => setIsAddMemberOpen(false)}>
          <div className="bg-white w-full max-w-[480px] max-h-[80vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-foreground">Tambah Anggota Tim</h2>
                <p className="text-[11px] font-bold text-muted-foreground">{project.shortTitle}</p>
              </div>
              <button onClick={() => setIsAddMemberOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="p-5 md:p-6 flex flex-col gap-4 overflow-y-auto">
              {/* Role Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Peran</label>
                <select
                  value={newMemberPeran}
                  onChange={e => setNewMemberPeran(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
                >
                  {(() => {
                    const hasKetua = teamMembers.some(m => m.role.toLowerCase().includes("ketua"));
                    const selectedCandidate = availableCandidates.find(c => c.user_id === selectedCandidateId);
                    const isMahasiswa = selectedCandidate?.member_type === "Mahasiswa";
                    const allRoles = ["Ketua", "Pembimbing", "Anggota Inti", "Backend Dev", "Frontend Dev", "Hardware Dev", "Data Analyst", "Asisten Peneliti", "Fullstack Dev"];
                    
                    // Filter out "Ketua" if already exists or if candidate is Mahasiswa
                    const filteredRoles = allRoles.filter(role => {
                      if (role === "Ketua") {
                        return !hasKetua && !isMahasiswa;
                      }
                      return true;
                    });

                    return filteredRoles.map(p => <option key={p}>{p}</option>);
                  })()}
                </select>
                {teamMembers.some(m => m.role.toLowerCase().includes("ketua")) && (
                  <p className="text-[10px] text-amber-600 font-medium">⚠️ Ketua sudah ditentukan. Hanya bisa diubah, tidak bisa menambah Ketua baru.</p>
                )}
                {selectedCandidateId && availableCandidates.find(c => c.user_id === selectedCandidateId)?.member_type === "Mahasiswa" && (
                  <p className="text-[10px] text-amber-600 font-medium">⚠️ Mahasiswa tidak bisa menjadi Ketua. Ketua wajib Dosen.</p>
                )}
              </div>

              {/* Candidate List */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Pilih Anggota</label>
                {loadingCandidates ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">Memuat kandidat...</div>
                ) : availableCandidates.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">Semua user sudah menjadi anggota</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                    {availableCandidates.map((candidate) => {
                      const isSelected = selectedCandidateId === candidate.user_id;
                      return (
                        <label
                          key={candidate.user_id}
                          onClick={() => setSelectedCandidateId(candidate.user_id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-[#6C47FF] bg-[#F8F5FF]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="candidate-selection"
                            checked={isSelected}
                            onChange={() => setSelectedCandidateId(candidate.user_id)}
                            className="accent-[#6C47FF] shrink-0"
                          />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            candidate.member_type === "Dosen" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                          }`}>
                            {candidate.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{candidate.name}</p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              candidate.member_type === "Dosen" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {candidate.member_type}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 md:px-6 border-t border-border/50 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddMembers}
                disabled={!selectedCandidateId}
                className={`${accentBg} hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all`}
              >
                Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}