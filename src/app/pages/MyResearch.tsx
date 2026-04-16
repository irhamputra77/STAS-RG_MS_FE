import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { apiGet, getStoredUser } from "../lib/api";
import { FlaskConical, ChevronRight } from "lucide-react";

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
  const navigate = useNavigate();

  const [research, setResearch] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiGet<ResearchProject[]>(
          user?.id
            ? `/research/assigned?userId=${encodeURIComponent(user.id)}`
            : "/research"
        );
        setResearch(data || []);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat riset");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const handleOpenResearchBoard = (researchId: string) => {
    navigate(`/scrum-board/${researchId}`);
  };

  if (loading) {
    return (
      <Layout title="Riset Saya">
        <div className="p-8 text-center text-muted-foreground">
          Memuat data riset...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Riset Saya">
        <div className="p-8 text-red-600">Error: {error}</div>
      </Layout>
    );
  }

  const activeResearchCount = research.filter((r) => r.status === "Aktif").length;

  return (
    <Layout title="Riset Saya">
      <div className="flex flex-col gap-6 max-w-[860px] mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
              Mahasiswa
            </p>
            <h1 className="text-2xl font-black text-foreground">Riset Saya</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Kamu terdaftar dalam{" "}
              <span className="font-black text-foreground">
                {activeResearchCount} program riset
              </span>{" "}
              aktif saat ini.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-[14px]">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-black text-emerald-700">
              {activeResearchCount} Riset Aktif
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {research.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Tidak ada riset yang terdaftar.
            </p>
          ) : (
            research.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleOpenResearchBoard(r.id)}
                className="w-full text-left bg-white border border-border rounded-[20px] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-6 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                      <FlaskConical size={22} strokeWidth={2} />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-base font-black text-foreground group-hover:text-[#6C47FF] transition-colors">
                        {r.title}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.supervisor_name || "-"}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {r.period_text && (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                            {r.period_text}
                          </span>
                        )}

                        {r.mitra && (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                            {r.mitra}
                          </span>
                        )}

                        {typeof r.progress === "number" && (
                          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold">
                            Progress {r.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-black px-2 py-1 rounded-full ${r.status === "Aktif"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {r.status}
                    </span>

                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#6C47FF] group-hover:border-[#6C47FF]/30 group-hover:bg-[#F8F5FF] transition-all">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
