import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { apiGet, getStoredUser } from "../lib/api";
import { FlaskConical } from "lucide-react";

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

export default function MyResearch() {
  const user = getStoredUser();
  const [research, setResearch] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiGet<ResearchProject[]>(`/research`);
        setResearch(data || []);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat riset");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Layout title="Riset Saya"><div className="p-8 text-center text-muted-foreground">Memuat data riset...</div></Layout>;
  if (error) return <Layout title="Riset Saya"><div className="p-8 text-red-600">Error: {error}</div></Layout>;

  return (
    <Layout title="Riset Saya">
      <div className="flex flex-col gap-6 max-w-[860px] mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Mahasiswa</p>
            <h1 className="text-2xl font-black text-foreground">Riset Saya</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Kamu terdaftar dalam{" "}
              <span className="font-black text-foreground">{research.filter((r) => r.status === "Aktif").length} program riset</span>{" "}
              aktif saat ini.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-[14px]">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-black text-emerald-700">{research.filter((r) => r.status === "Aktif").length} Riset Aktif</span>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          {research.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tidak ada riset yang terdaftar.</p>
          ) : (
            research.map((r) => (
              <div key={r.id} className="bg-white border border-border rounded-[20px] shadow-sm hover:shadow-lg transition-all p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                      <FlaskConical size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-foreground">{r.title}</h2>
                      <p className="text-xs text-muted-foreground mt-1">{r.supervisor_name}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${r.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
