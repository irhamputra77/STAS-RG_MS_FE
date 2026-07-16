import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../context/AuthContext";
import { apiGet, apiPost } from "../../lib/api";
import { useSystemBranding } from "../../lib/useSystemBranding";

const ROLE_DESTINATION: Record<UserRole, string> = {
  mahasiswa: "/dashboard",
  operator: "/operator/dashboard",
  dosen: "/dosen/dashboard"
};

const ROLE_CHIPS = ["Mahasiswa", "Operator", "Dosen"];
const LOGIN_BACKGROUND_VIDEOS = ["/videos/v1.mp4", "/videos/v2.mp4", "/videos/v3.mp4", "/videos/v4.mp4", "/videos/v5.mp4"];

function getRandomLoginVideoIndex() {
  return Math.floor(Math.random() * LOGIN_BACKGROUND_VIDEOS.length);
}

function BuildingIllustration() {
  const windowMarks = [
    [42, 224], [62, 219], [82, 214], [42, 260], [62, 255], [82, 250], [42, 296], [62, 291], [82, 286],
    [142, 142], [162, 148], [182, 154], [202, 160], [142, 184], [162, 190], [182, 196], [202, 202], [142, 226], [162, 232], [182, 238], [202, 244],
    [284, 152], [306, 138], [328, 124], [350, 110], [284, 194], [306, 180], [328, 166], [350, 152], [284, 236], [306, 222], [328, 208], [350, 194],
    [458, 110], [484, 92], [548, 92], [574, 110], [458, 154], [484, 136], [548, 136], [574, 154], [458, 198], [484, 180], [548, 180], [574, 198],
    [668, 162], [694, 174], [720, 186], [668, 210], [694, 222], [720, 234], [668, 258], [694, 270], [720, 282]
  ];
  const foregroundMarks = [
    [336, 260], [364, 246], [392, 260], [420, 274], [336, 302], [364, 288], [392, 302], [420, 316],
    [588, 262], [616, 250], [644, 266], [588, 302], [616, 290], [644, 306]
  ];

  return (
    <svg viewBox="0 0 760 410" className="absolute -bottom-8 -right-16 h-[78%] w-[122%] text-[#214f59]" fill="none" aria-hidden="true">
      <path d="M6 404H752" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M-12 404V242L76 216L128 252V404" fill="#e7eedc" stroke="currentColor" strokeWidth="5" />
      <path d="M76 404V174L156 136L244 166V404" fill="#f8f4e2" stroke="currentColor" strokeWidth="5" />
      <path d="M244 404V186L336 106L430 138V404" fill="#fffdf0" stroke="currentColor" strokeWidth="5" />
      <path d="M430 404V96L526 32L632 92V404" fill="#f8f6e7" stroke="currentColor" strokeWidth="5" />
      <path d="M526 32V404" stroke="currentColor" strokeWidth="5" />
      <path d="M632 404V142L748 190V404" fill="#edf2de" stroke="currentColor" strokeWidth="5" />
      <path d="M22 404V304L116 284L194 328V404" fill="#f2f4df" stroke="currentColor" strokeWidth="5" />
      <path d="M304 404V264L382 226L466 278V404" fill="#f7d9c9" stroke="currentColor" strokeWidth="5" />
      <path d="M552 404V274L628 236L714 288V404" fill="#f8e2d2" stroke="currentColor" strokeWidth="5" />
      {windowMarks.map(([x, y], index) => (
        <path key={index} d={`M${x} ${y}L${x + 30} ${y - 11}`} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      ))}
      {foregroundMarks.map(([x, y], index) => (
        <path key={`front-${index}`} d={`M${x} ${y}L${x + 34} ${y - 16}`} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      ))}
      <circle cx="610" cy="354" r="38" fill="#fbfff4" stroke="currentColor" strokeWidth="5" />
      <path d="M610 404V322M586 366L610 404L636 366" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="366" r="31" fill="#fbfff4" stroke="currentColor" strokeWidth="5" />
      <path d="M96 404V336M76 374L96 404L120 374" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="706" cy="370" r="28" fill="#fbfff4" stroke="currentColor" strokeWidth="5" />
      <path d="M706 404V344M688 376L706 404L728 376" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoIndex, setVideoIndex] = useState(getRandomLoginVideoIndex);
  const { login } = useAuth();
  const navigate = useNavigate();
  const branding = useSystemBranding();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("ID / Email dan password wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost<{
        user: { id: string; name: string; initials: string; role: UserRole; prodi?: string; tipe?: string };
      }>("/auth/login", { identifier: identifier.trim(), password });

      const verifiedSession = await apiGet<{
        user: { id: string; name: string; initials: string; role: UserRole; prodi?: string; tipe?: string };
      }>("/auth/me").catch(() => {
        throw new Error("Login berhasil, tetapi sesi belum tersimpan di browser. Pastikan cookie accessToken dari API diizinkan.");
      });

      const sessionUser = verifiedSession.user || result.user;
      login({
        id: sessionUser.id,
        name: sessionUser.name,
        initials: sessionUser.initials,
        role: sessionUser.role,
        prodi: sessionUser.prodi,
        tipe: sessionUser.tipe,
        status: sessionUser.status,
        studentStatus: sessionUser.studentStatus
      });
      navigate(ROLE_DESTINATION[sessionUser.role] || "/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login gagal. Periksa kembali ID/Email dan password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07140e] p-4 text-[#06140d] sm:p-6 lg:p-8">
      <video
        className="fixed inset-0 z-0 h-full w-full object-cover"
        key={LOGIN_BACKGROUND_VIDEOS[videoIndex]}
        src={LOGIN_BACKGROUND_VIDEOS[videoIndex]}
        autoPlay
        loop
        muted
        playsInline
        onError={() => setVideoIndex((current) => (current + 1) % LOGIN_BACKGROUND_VIDEOS.length)}
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(115deg,rgba(7,20,14,0.88),rgba(18,61,40,0.55)_42%,rgba(7,20,14,0.76))]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[2] h-56 bg-[linear-gradient(to_top,rgba(255,255,255,0.12),transparent)]" />
      <div className="pointer-events-none fixed -left-24 top-16 z-[2] h-72 w-72 rounded-full bg-[#d8ef9a]/20 blur-3xl" />
      <div className="pointer-events-none fixed -right-28 bottom-10 z-[2] h-80 w-80 rounded-full bg-[#f4c7a1]/25 blur-3xl" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1160px] items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="grid w-full overflow-hidden rounded-[30px] border border-white/20 bg-[#f8f8ed] shadow-2xl shadow-black/30 lg:grid-cols-[0.98fr_1.02fr]">
          <section className="relative flex min-h-[660px] flex-col bg-[#ececde] px-6 py-7 sm:px-10 lg:px-12">
            <div className="flex items-center gap-3">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="Logo" className="h-10 w-10 rounded-[12px] bg-white object-contain p-1 shadow-sm" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#123d28] text-sm font-black text-[#f4f1df] shadow-sm">SR</div>
              )}
              <div>
                <p className="text-sm font-black tracking-tight text-[#07140e]">{branding.appName}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a6757]">{branding.universityName}</p>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[350px] flex-1 flex-col justify-center py-10">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7d7c7] bg-white/60 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#1b5b39]">
                  <ShieldCheck size={13} /> Secure Access
                </div>
                <h1 className="text-3xl font-black tracking-tight text-[#07140e]">Sign In</h1>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#6d6d61]">
                  Masuk untuk mengelola riset, logbook, absensi, dan dokumen STAS-RG.
                </p>
              </div>

              <div className="mb-6 rounded-full border border-[#dbdccb] bg-[#f7f7ed] p-1">
                <div className="grid grid-cols-3 gap-1">
                  {ROLE_CHIPS.map((role) => (
                    <span key={role} className="rounded-full px-2 py-2 text-center text-[11px] font-black text-[#214b33]">
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wide text-[#162218]">ID / NIM / Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#55705d]" size={17} />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                      placeholder="NIM atau alamat email"
                      autoComplete="username"
                      className="h-12 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-sm font-bold text-[#07140e] shadow-sm outline-none transition-all placeholder:text-[#9b9b8e] focus:border-[#1c6b43] focus:ring-4 focus:ring-[#1c6b43]/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-black uppercase tracking-wide text-[#162218]">Password</label>
                    <span className="text-[11px] font-black text-[#1c6b43]">Role otomatis</span>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#55705d]" size={17} />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      className="h-12 w-full rounded-full border border-transparent bg-white pl-11 pr-12 text-sm font-bold text-[#07140e] shadow-sm outline-none transition-all placeholder:text-[#9b9b8e] focus:border-[#1c6b43] focus:ring-4 focus:ring-[#1c6b43]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#55705d] transition-colors hover:text-[#07140e]"
                      aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-relaxed text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#17623d] px-5 text-sm font-black text-[#fffdf1] shadow-lg shadow-[#17623d]/20 transition-all hover:-translate-y-0.5 hover:bg-[#0f4d2e] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? "Memproses..." : "Masuk Sekarang"}
                  {!submitting && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <p className="mt-6 text-center text-xs font-semibold leading-relaxed text-[#777765]">
                Akun dan role ditentukan oleh data yang sudah dibuat admin/operator.
              </p>
            </div>
          </section>

          <aside className="relative hidden min-h-[660px] overflow-hidden bg-[#fffdf1] lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(247,160,72,0.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.75),rgba(255,253,241,0.9))]" />
            <div className="relative z-10 flex h-full flex-col justify-between p-12">
              <div className="max-w-[420px] pt-8">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#ff8a25]/10 text-[#ff7a00]">
                  <Sparkles size={24} />
                </div>
                <blockquote className="text-[26px] font-black leading-tight tracking-tight text-[#07140e]">
                  Ikuti Sistem Atau sistem yang buat anda hancur.
                </blockquote>
                <div className="mt-8 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#123d28] text-sm font-black text-[#fffdf1]">RG</div>
                  <div>
                    <p className="text-sm font-black text-[#07140e]">CoE STAS-RG</p>
                    <p className="text-xs font-bold text-[#6d6d61]">Research Management Platform</p>
                  </div>
                </div>
              </div>

              <div className="relative h-[430px]">
                <BuildingIllustration />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}



