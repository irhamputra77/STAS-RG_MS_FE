import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, Users, FlaskConical, GraduationCap, Network,
  BookOpen, CalendarCheck, FileText, Download, Settings, History, Award,
  Bell, Search, Settings2, X, CheckCheck, ChevronRight,
  AlertTriangle, Kanban, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPatch } from "../lib/api";
import { useSystemBranding } from "../lib/useSystemBranding";

interface NotifItem { id: string; title: string; body: string; time: string; read: boolean; timeMs: number; }
interface NotificationApiRow { id: string; title: string; body: string; read_at: string | null; created_at: string; }

const INIT_NOTIFS: NotifItem[] = [];

interface LayoutProps { children: React.ReactNode; title?: string; }

export function OperatorLayout({ children, title = "Dashboard Operator" }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const branding = useSystemBranding();
  const [notifs, setNotifs] = useState<NotifItem[]>(INIT_NOTIFS);
  const [panelOpen, setPanelOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setPanelOpen(false); };
    if (panelOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [panelOpen]);

  useEffect(() => { setPanelOpen(false); }, [location.pathname]);

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
        setNotifs(rows.map((row) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          time: new Date(row.created_at).toLocaleString("id-ID"),
          read: !!row.read_at,
          timeMs: new Date(row.created_at).getTime()
        })).sort((a, b) => b.timeMs - a.timeMs));
      } catch {
        if (!active) return;
        setNotifs([]);
      }
    };
    loadNotifs();
    return () => { active = false; };
  }, [user?.id]);

  const markRead = (id: string) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    if (!user?.id) return;
    apiPatch<{ message: string }>(`/notifications/${id}/read`, { userId: user.id }).catch(() => {});
  };
  const markAll = () => {
    setNotifs(p => p.map(n => ({ ...n, read: true })));
    if (!user?.id) return;
    apiPatch<{ message: string }>("/notifications/read-all", { userId: user.id }).catch(() => {});
  };
  const dismiss = (id: string) => setNotifs(p => p.filter(n => n.id !== id));

  const navItems = [
    { name: "Dashboard",           path: "/operator/dashboard",    icon: LayoutDashboard },
    { name: "Database Mahasiswa",  path: "/operator/mahasiswa",    icon: Users },
    { name: "Database Riset & Dosen", path: "/operator/riset-dosen", icon: FlaskConical },
    { name: "Progress Board",      path: "/operator/progress-board",icon: Kanban },
    { name: "Logbook Mahasiswa",   path: "/operator/logbook",      icon: BookOpen },
    { name: "Persetujuan Cuti",    path: "/operator/cuti",         icon: CalendarCheck },
    { name: "Layanan Surat",       path: "/operator/surat",        icon: FileText },
    { name: "Sertifikat",          path: "/operator/sertifikat",   icon: Award },
    { name: "Ekspor Laporan",      path: "/operator/ekspor",       icon: Download },
    { name: "Pengaturan Sistem",   path: "/operator/pengaturan",   icon: Settings },
    { name: "Audit Log",           path: "/operator/audit",        icon: History },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden flex">
      <div className="w-full flex h-screen overflow-hidden bg-slate-50 relative">
        {/* ── Sidebar ── */}
        <aside className="w-[248px] bg-white border-r border-border flex flex-col shrink-0 z-20">
          {/* Logo */}
          <div className="h-[60px] flex items-center px-6 border-b border-border">
            <div className="font-black text-xl text-primary flex items-center gap-2">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="Logo aplikasi" className="w-8 h-8 rounded-[10px] object-contain bg-white border border-border" />
              ) : (
                <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center text-white">
                  <GraduationCap size={18} />
                </div>
              )}
              {branding.appName}
            </div>
          </div>

          {/* Role chip */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-[10px]">
              <div className="w-6 h-6 rounded-[6px] bg-amber-500 flex items-center justify-center text-white shrink-0">
                <Settings2 size={13} />
              </div>
              <div>
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Operator</p>
                <p className="text-[10px] font-medium text-amber-500">{user?.name || "Operator"}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-3 flex flex-col gap-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] font-medium transition-colors text-sm ${
                    isActive ? "bg-[#0AB600] text-white shadow-sm shadow-green-200" : "text-muted-foreground hover:bg-green-50 hover:text-[#0AB600]"
                  }`}
                >
                  <item.icon size={17} />
                  {item.name}
                  {item.path === "/operator/cuti" && unread > 0 && (
                    <span className="ml-auto w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">{unread}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-4 pb-4 border-t border-border pt-3">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-bold text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={17} /> Keluar
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0 z-10">
          {/* Topbar */}
          <header className="h-[60px] bg-white border-b border-border flex items-center justify-between px-8 shrink-0">
            <h1 className="font-black text-foreground">{title}</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-border rounded-[12px] w-60 focus-within:ring-2 focus-within:ring-amber-300 focus-within:border-amber-400 transition-all">
                <Search size={16} className="text-muted-foreground" />
                <input type="text" placeholder="Cari mahasiswa, riset..." className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground w-full" />
              </div>
              <div className="flex items-center gap-4">
                {/* Bell */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => setPanelOpen(v => !v)}
                    className={`relative p-1.5 rounded-[10px] transition-colors ${panelOpen ? "bg-amber-100 text-amber-600" : "text-muted-foreground hover:bg-slate-100"}`}
                  >
                    <Bell size={21} />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                  {panelOpen && (
                    <div className="absolute top-[calc(100%+10px)] right-0 w-[360px] bg-white rounded-[16px] shadow-2xl border border-border z-[300]">
                      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-foreground text-sm">Notifikasi</h3>
                          {unread > 0 && <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black">{unread}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {unread > 0 && <button onClick={markAll} className="text-xs font-bold text-amber-600 hover:bg-amber-50 px-2 py-1 rounded-[8px] flex items-center gap-1"><CheckCheck size={13} /> Baca Semua</button>}
                          <button onClick={() => setPanelOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-muted-foreground"><X size={14} /></button>
                        </div>
                      </div>
                      <div className="max-h-[340px] overflow-y-auto divide-y divide-border/50">
                        {notifs.map(n => (
                          <div key={n.id} onClick={() => markRead(n.id)}
                            className={`group flex gap-3 px-5 py-3.5 cursor-pointer transition-colors ${n.read ? "hover:bg-slate-50" : "bg-amber-50/40 hover:bg-amber-50"}`}
                          >
                            {!n.read && <div className="absolute left-2 mt-2 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug mb-0.5 ${n.read ? "font-medium text-foreground/70" : "font-black text-foreground"}`}>{n.title}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>
                              <p className={`text-[10px] font-bold mt-1 ${n.read ? "text-muted-foreground/60" : "text-amber-500"}`}>{n.time}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); dismiss(n.id); }} className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground"><X size={11} strokeWidth={3} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-white cursor-pointer">
                  {user?.initials || "OP"}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
