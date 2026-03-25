import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, BookOpen, FileText, Settings, Bell, Search,
  GraduationCap, MapPin, Award, ScrollText, FlaskConical,
  Check, X, CheckCheck, BookMarked, MessageSquare, CalendarClock,
  FileCheck, Megaphone, AlertTriangle, ChevronRight, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPatch } from "../lib/api";
import { useSystemBranding } from "../lib/useSystemBranding";

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION DATA & TYPES
// ─────────────────────────────────────────────────────────────────────────────

type NotifType = "logbook" | "riset" | "komentar" | "cuti" | "deadline" | "pengumuman" | "dokumen";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;           // display string
  timeMs: number;         // for sorting
  read: boolean;
  link?: string;
}

interface NotificationApiRow {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

const INITIAL_NOTIFS: Notif[] = [];

function toNotifType(raw: string): NotifType {
  const known: NotifType[] = ["logbook", "riset", "komentar", "cuti", "deadline", "pengumuman", "dokumen"];
  return known.includes(raw as NotifType) ? (raw as NotifType) : "pengumuman";
}

function formatNotifTime(createdAt: string) {
  const date = new Date(createdAt);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Baru saja";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} menit lalu`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} jam lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ICON helper
// ─────────────────────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: NotifType }) {
  const map: Record<NotifType, { icon: React.ReactNode; bg: string; text: string }> = {
    logbook:     { icon: <BookMarked size={15} />,    bg: "bg-green-100",  text: "text-green-700" },
    riset:       { icon: <FlaskConical size={15} />,  bg: "bg-green-100",  text: "text-green-700" },
    komentar:    { icon: <MessageSquare size={15} />, bg: "bg-blue-100",    text: "text-blue-600"   },
    cuti:        { icon: <FileCheck size={15} />,     bg: "bg-emerald-100", text: "text-emerald-600"},
    deadline:    { icon: <AlertTriangle size={15} />, bg: "bg-red-100",     text: "text-red-500"    },
    pengumuman:  { icon: <Megaphone size={15} />,     bg: "bg-amber-100",   text: "text-amber-600"  },
    dokumen:     { icon: <FileCheck size={15} />,     bg: "bg-slate-100",   text: "text-slate-500"  },
  };
  const c = map[type];
  return (
    <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
      {c.icon}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

function NotificationPanel({
  notifs,
  onRead,
  onReadAll,
  onDismiss,
  onClose,
}: {
  notifs: Notif[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = notifs.filter((n) => !n.read).length;
  const visible = filter === "unread" ? notifs.filter((n) => !n.read) : notifs;

  return (
    <div className="absolute top-[calc(100%+10px)] right-0 w-[400px] bg-white rounded-[18px] shadow-2xl border border-border z-[300] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-foreground">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-white rounded-full text-[11px] font-black">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onReadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-bold text-primary hover:bg-green-50 transition-colors"
                title="Tandai semua sebagai dibaca"
              >
                <CheckCheck size={14} /> Semua dibaca
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-muted/40 p-0.5 rounded-[10px]">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                filter === f
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? `Semua (${notifs.length})` : `Belum Dibaca (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
              <Bell size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Tidak ada notifikasi</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                {filter === "unread" ? "Semua notifikasi sudah dibaca." : "Belum ada notifikasi masuk."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {visible.map((n) => (
              <div
                key={n.id}
                className={`group relative flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors ${
                  n.read ? "hover:bg-slate-50/60" : "bg-green-50/40 hover:bg-green-50"
                }`}
                onClick={() => { onRead(n.id); onClose(); }}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#0AB600]" />
                )}

                <NotifIcon type={n.type} />

                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug mb-0.5 ${n.read ? "font-medium text-foreground/80" : "font-bold text-foreground"}`}>
                    {n.title}
                  </p>
                  <p className="text-[12px] font-medium text-muted-foreground leading-relaxed line-clamp-2">
                    {n.body}
                  </p>
                  <p className={`text-[11px] font-bold mt-1.5 ${n.read ? "text-muted-foreground/70" : "text-[#0AB600]"}`}>
                    {n.time}
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                  title="Hapus notifikasi"
                >
                  <X size={13} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3 bg-slate-50/60 flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">
          {unreadCount === 0 ? "Semua sudah dibaca" : `${unreadCount} belum dibaca`}
        </p>
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-1 text-xs font-bold text-[#0AB600] hover:gap-1.5 transition-all"
        >
          Atur Notifikasi <ChevronRight size={13} strokeWidth={3} />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title = "Dashboard" }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const branding = useSystemBranding();
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [warningPopup, setWarningPopup] = useState<{ id: string; title: string; body: string } | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user?.id) {
      setNotifs([]);
      return;
    }

    let active = true;
    const loadNotifs = async () => {
      try {
        const rows = await apiGet<NotificationApiRow[]>(`/notifications?userId=${encodeURIComponent(user.id)}&limit=100`);
        if (!active) return;

        const mapped: Notif[] = rows.map((row) => {
          const timeMs = new Date(row.created_at).getTime();
          return {
            id: row.id,
            type: toNotifType(row.type),
            title: row.title,
            body: row.body,
            time: formatNotifTime(row.created_at),
            timeMs,
            read: !!row.read_at
          };
        }).sort((a, b) => b.timeMs - a.timeMs);

        setNotifs(mapped);
      } catch {
        if (!active) return;
        setNotifs([]);
      }
    };

    loadNotifs();
    return () => { active = false; };
  }, [user?.id]);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false);
      }
    }
    if (isPanelOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isPanelOpen]);

  // Close panel on route change
  useEffect(() => { setIsPanelOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (user?.role !== "mahasiswa") {
      setWarningPopup(null);
      return;
    }

    const firstUnreadWarning = notifs.find((n) => !n.read && n.type === "pengumuman");
    if (firstUnreadWarning) {
      setWarningPopup({ id: firstUnreadWarning.id, title: firstUnreadWarning.title, body: firstUnreadWarning.body });
      return;
    }
    setWarningPopup(null);
  }, [notifs, user?.role]);

  const markRead = (id: string) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    if (!user?.id) return;
    apiPatch<{ message: string }>(`/notifications/${id}/read`, { userId: user.id }).catch(() => {});
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!user?.id) return;
    apiPatch<{ message: string }>("/notifications/read-all", { userId: user.id }).catch(() => {});
  };

  const dismiss = (id: string) =>
    setNotifs((prev) => prev.filter((n) => n.id !== id));

  const navItems = [
    { name: "Dashboard",           path: "/dashboard",  icon: LayoutDashboard },
    { name: "Kehadiran (GPS)",     path: "/attendance", icon: MapPin },
    { name: "Logbook",             path: "/logbook",    icon: BookOpen },
    { name: "Riset Saya",          path: "/research",   icon: FlaskConical },
    { name: "Pengajuan Cuti",      path: "/leave",      icon: FileText },
    { name: "Dokumen & Sertifikat",path: "/documents",  icon: Award },
    { name: "Draft TA / Jurnal",   path: "/draft",      icon: ScrollText },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="h-screen w-screen bg-background text-foreground overflow-hidden flex">
      <div className="w-full flex h-screen overflow-hidden bg-background relative">
        {/* ── Sidebar ── */}
        <aside className="w-[248px] bg-white border-r border-border flex flex-col shrink-0 z-20">
          <div className="h-[60px] flex items-center px-6 border-b border-border">
            <div className="font-bold text-xl text-primary flex items-center gap-2">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="Logo aplikasi" className="w-8 h-8 rounded-[14px] object-contain bg-white border border-border" />
              ) : (
                <div className="w-8 h-8 rounded-[14px] bg-primary flex items-center justify-center text-white">
                  <GraduationCap size={20} />
                </div>
              )}
              {branding.appName}
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== "/dashboard");
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-colors ${isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                  <item.icon size={20} /> {item.name}
                </Link>
              );
            })}

            <div className="mt-auto flex flex-col gap-1">
              <Link to="/settings"
                className={`flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-colors ${location.pathname === "/settings" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                <Settings size={20} /> Pengaturan
              </Link>
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-colors text-muted-foreground hover:bg-red-50 hover:text-red-600 w-full text-left">
                <LogOut size={20} /> Keluar
              </button>
            </div>
          </nav>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0 z-10">
          <header className="h-[60px] bg-white border-b border-border flex items-center justify-between px-8 shrink-0">
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 bg-background border border-border rounded-[14px] w-64 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <Search size={18} className="text-muted-foreground" />
                <input type="text" placeholder="Cari kelas, tugas..." className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
              </div>
              <div className="flex items-center gap-5">
                <div ref={bellRef} className="relative">
                  <button onClick={() => setIsPanelOpen((v) => !v)}
                    className={`relative p-1.5 rounded-[10px] transition-colors ${isPanelOpen ? "bg-[#F0FFF0] text-[#0AB600]" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {isPanelOpen && (
                    <NotificationPanel notifs={notifs} onRead={markRead} onReadAll={markAllRead} onDismiss={dismiss} onClose={() => setIsPanelOpen(false)} />
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-[#0AB600] flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-white cursor-pointer">
                  {user?.initials || "IR"}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </div>

      {/* Operator Warning Popup */}
      {warningPopup && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[440px] overflow-hidden">
            <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0"><AlertTriangle size={20} className="text-white" /></div>
              <div><p className="font-black text-white">Peringatan dari Operator</p><p className="text-xs text-white/80">STAS-RG Management System</p></div>
            </div>
            <div className="p-6">
              <h3 className="font-black text-foreground mb-2">{warningPopup.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{warningPopup.body}</p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => {
                if (warningPopup) markRead(warningPopup.id);
                setWarningPopup(null);
              }} className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-[12px] transition-colors">
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
