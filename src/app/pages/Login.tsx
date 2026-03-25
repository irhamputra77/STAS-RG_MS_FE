import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../context/AuthContext";
import { apiPost } from "../lib/api";
import { useSystemBranding } from "../lib/useSystemBranding";

const ROLE_DESTINATION: Record<UserRole, string> = {
  mahasiswa: "/dashboard",
  operator: "/operator/dashboard",
  dosen: "/dosen/dashboard"
};

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const branding = useSystemBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("ID / Email dan password wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost<{ user: { id: string; name: string; initials: string; role: UserRole; prodi?: string } }>("/auth/login", {
        identifier: identifier.trim(),
        password
      });

      const role = result.user.role;
      login({
        id: result.user.id,
        name: result.user.name,
        initials: result.user.initials,
        role,
        prodi: result.user.prodi
      });
      navigate(ROLE_DESTINATION[role] || "/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login gagal. Periksa kembali ID/Email dan password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-background flex overflow-hidden">
      <div className="w-full h-full bg-white flex">

        {/* ── Left: Brand Panel ── */}
        <div className="hidden md:flex flex-col w-2/5 bg-gradient-to-br from-[#0AB600] to-[#065e00] p-14 text-white justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 20% 120%, white 0%, transparent 50%)" }} />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-4">
            {branding.logoDataUrl ? (
              <img src={branding.logoDataUrl} alt="Logo aplikasi" className="w-16 h-16 rounded-[18px] object-contain bg-white shadow-lg shadow-black/20 p-1" />
            ) : (
              <div className="w-16 h-16 bg-white rounded-[18px] flex items-center justify-center font-black text-2xl text-[#0AB600] shadow-lg shadow-black/20">SR</div>
            )}
            <div>
              <h1 className="text-3xl font-black tracking-tight">{branding.appName}</h1>
              <p className="text-white/70 text-sm font-medium mt-0.5">{branding.universityName}</p>
            </div>
          </div>

          {/* Center Content */}
          <div className="relative z-10 flex flex-col gap-3">
            <h2 className="text-4xl font-black leading-tight mb-2">
              STAS-RG<br />Management<br />System
            </h2>
            <p className="text-white/80 text-base leading-relaxed max-w-[280px]">
              Platform terpadu manajemen riset, akademik, dan kehadiran mahasiswa Telkom University.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {["Riset", "Logbook", "Absensi GPS", "Laporan", "Multi-Role"].map(tag => (
                <span key={tag} className="px-3 py-1.5 bg-white/15 border border-white/20 rounded-full text-xs font-bold text-white/90 backdrop-blur-sm">{tag}</span>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-sm text-white/40 font-medium">© 2026 STAS-RG MS · All rights reserved.</div>
        </div>

        {/* ── Right: Form Panel ── */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-14 bg-white overflow-y-auto">
          <div className="w-full max-w-[400px]">

            {/* Logo (mobile) */}
            <div className="flex flex-col items-center text-center mb-10">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="Logo aplikasi" className="w-14 h-14 rounded-[14px] object-contain bg-white border border-border shadow-sm mb-3 p-1" />
              ) : (
                <div className="w-14 h-14 bg-[#0AB600] rounded-[14px] flex items-center justify-center text-white font-black text-xl shadow-sm mb-3">SR</div>
              )}
              <h1 className="font-black text-foreground text-xl">{branding.appName}</h1>
              <p className="text-muted-foreground text-sm mt-1">Masuk ke sistem dengan akun Anda</p>
            </div>

            {/* Form */}
            <h2 className="text-2xl font-black text-foreground mb-1">Selamat Datang 👋</h2>
            <p className="text-muted-foreground text-sm mb-5">Masukkan ID / NIM / Email dan password Anda.</p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-black text-foreground">NIM / Email</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setError(""); }}
                  placeholder="NIM atau alamat email"
                  autoComplete="username"
                  className="w-full h-12 px-4 rounded-[14px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 focus:border-[#0AB600] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-black text-foreground">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="w-full h-12 px-4 pr-12 rounded-[14px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 focus:border-[#0AB600] transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-xs font-bold text-red-600">{error}</div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-[#0AB600] hover:bg-[#099800] text-white font-black rounded-[14px] transition-all shadow-sm shadow-[#0AB600]/20"
                >
                  {submitting ? "Memproses..." : "Masuk Sekarang"}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Role ditentukan otomatis berdasarkan akun Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
