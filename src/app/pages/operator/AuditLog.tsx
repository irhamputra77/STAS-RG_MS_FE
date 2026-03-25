import React, { useEffect, useState, useMemo } from "react";
import { OperatorLayout } from "../../components/OperatorLayout";
import { Search, Download, ChevronDown, ChevronRight, X, Calendar } from "lucide-react";
import { apiGet } from "../../lib/api";

type AuditLogEntry = {
  id: string;
  timestamp: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userRole: string;
  action: string;
  target: string;
  ip: string;
  detail: string;
};

const ACTION_STYLE: Record<string, string> = {
  "Login":  "bg-blue-100 text-blue-700",
  "Create": "bg-emerald-100 text-emerald-700",
  "Update": "bg-amber-100 text-amber-700",
  "Delete": "bg-red-100 text-red-600",
  "Approve":"bg-emerald-100 text-emerald-700",
  "Export": "bg-purple-100 text-purple-700",
};
const ROLE_STYLE: Record<string, string> = {
  "Operator": "bg-amber-50 text-amber-700",
  "Mahasiswa": "bg-[#F8F5FF] text-[#6C47FF]",
  "Dosen": "bg-blue-50 text-blue-700",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("Semua");
  const [filterRole, setFilterRole] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    const loadLogs = async () => {
      setError("");
      try {
        const rows = await apiGet<Array<any>>("/audit-logs?limit=200");
        const mapped: AuditLogEntry[] = rows.map((item) => ({
          id: item.id,
          timestamp: new Date(item.logged_at).toLocaleString("id-ID"),
          userName: item.user_name || "System",
          userInitials: item.user_initials || "SY",
          userColor: "bg-amber-500 text-white",
          userRole: item.user_role === "operator" ? "Operator" : item.user_role === "dosen" ? "Dosen" : "Mahasiswa",
          action: item.action,
          target: item.target,
          ip: item.ip,
          detail: item.detail || "{}"
        }));
        setLogs(mapped);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat audit log.");
      }
    };

    loadLogs();
  }, []);

  const filtered = useMemo(() => logs.filter(l => {
    const q = search.toLowerCase();
    const mq = !q || l.userName.toLowerCase().includes(q) || l.target.toLowerCase().includes(q) || l.ip.includes(q);
    const ma = filterAction === "Semua" || l.action === filterAction;
    const mr = filterRole === "Semua" || l.userRole === filterRole;
    return mq && ma && mr;
  }), [logs, search, filterAction, filterRole]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleExpand = (id: string) => setExpanded(e => e === id ? null : id);

  let prettyJson = (str: string) => {
    try { return JSON.stringify(JSON.parse(str), null, 2); }
    catch { return str; }
  };

  return (
    <OperatorLayout title="Audit Log Sistem">
      <div className="flex flex-col gap-5 pb-4">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-border rounded-[14px] p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            {/* Date range */}
            <div className="flex items-center gap-2 bg-slate-50 border border-border rounded-[10px] px-3 py-2 text-xs">
              <Calendar size={13} className="text-muted-foreground" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="outline-none text-xs bg-transparent text-foreground" />
              <span className="text-muted-foreground">–</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="outline-none text-xs bg-transparent text-foreground" />
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-50 border border-border rounded-[10px] px-3 py-2 w-52 focus-within:ring-2 focus-within:ring-amber-300 transition-all">
              <Search size={13} className="text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari user, target, IP..." className="bg-transparent outline-none text-xs w-full placeholder:text-muted-foreground" />
              {search && <button onClick={() => setSearch("")}><X size={11} className="text-muted-foreground" /></button>}
            </div>
            {/* Action filter */}
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="h-9 px-3 bg-slate-50 border border-border rounded-[10px] text-xs font-bold focus:outline-none cursor-pointer">
              {["Semua", "Login", "Create", "Update", "Delete", "Approve", "Export"].map(o => <option key={o}>{o}</option>)}
            </select>
            {/* Role filter */}
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="h-9 px-3 bg-slate-50 border border-border rounded-[10px] text-xs font-bold focus:outline-none cursor-pointer">
              {["Semua", "Operator", "Mahasiswa", "Dosen"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <button className="flex items-center gap-2 h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-[10px] transition-colors shadow-sm">
            <Download size={14} /> Ekspor Log
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead><tr className="bg-slate-50 border-b border-border">
              {["Timestamp", "User", "Aksi", "Target Data", "IP Address", ""].map(h => (
                <th key={h} className="px-5 py-3 font-black text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paged.map(log => (
                <React.Fragment key={log.id}>
                  <tr onClick={() => toggleExpand(log.id)} className={`border-b border-border cursor-pointer transition-colors ${expanded === log.id ? "bg-amber-50/40" : "hover:bg-slate-50"}`}>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${log.userColor}`}>{log.userInitials}</div>
                        <div>
                          <p className="font-black text-foreground">{log.userName}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ROLE_STYLE[log.userRole]}`}>{log.userRole}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${ACTION_STYLE[log.action]}`}>{log.action}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <p className="font-bold text-foreground truncate">{log.target}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{log.ip}</td>
                    <td className="px-5 py-3.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground transition-transform ${expanded === log.id ? "rotate-180" : ""}`}>
                        <ChevronDown size={14} />
                      </div>
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="bg-amber-50/30 border-b border-border">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2">Detail Log</p>
                            <pre className="bg-slate-900 text-emerald-400 rounded-[10px] p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">
                              {prettyJson(log.detail)}
                            </pre>
                          </div>
                          <div className="w-[220px] shrink-0 flex flex-col gap-2 text-[11px]">
                            {[["Log ID", log.id], ["Timestamp", log.timestamp], ["User", log.userName], ["Role", log.userRole], ["IP", log.ip], ["Aksi", log.action]].map(([l, v]) => (
                              <div key={l} className="flex justify-between gap-2">
                                <span className="font-black text-muted-foreground">{l}</span>
                                <span className="font-bold text-foreground text-right">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-slate-50/50">
            <p className="text-xs font-medium text-muted-foreground">Menampilkan {paged.length} dari {filtered.length} entri log</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-[8px] text-xs font-black transition-colors ${page === i + 1 ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-slate-100"}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
