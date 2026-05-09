import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../context/AuthContext";
import { apiGet, apiPost } from "../../lib/api";
import { useSystemBranding } from "../../lib/useSystemBranding";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

const ROLE_DESTINATION: Record<UserRole, string> = {
  mahasiswa: "/dashboard",
  operator: "/operator/dashboard",
  dosen: "/dosen/dashboard"
};

const FLOATING_CARDS = [
  { id: 1, x: 20,  y: 20,  rotate: -12, video: "/videos/v1.mp4" },
  { id: 2, x: 200, y: 10,  rotate: 14,  video: "/videos/v2.mp4" },
  { id: 3, x: 110, y: 100, rotate: -8,  video: "/videos/v3.mp4" },
  { id: 4, x: 20,  y: 220, rotate: 18,  video: "/videos/v4.mp4" },
  { id: 5, x: 210, y: 190, rotate: -18, video: "/videos/v5.mp4" },
  { id: 6, x: 110, y: 350, rotate: 10,  video: "/videos/v2.mp4" },
  { id: 7, x: 220, y: 380, rotate: -14, video: "/videos/v4.mp4" },
  { id: 8, x: 15,  y: 430, rotate: 16,  video: "/videos/v1.mp4" },
];

function VideoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl mx-4 rounded-3xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.7, opacity: 0, rotateY: 20 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        style={{ perspective: 1000 }}
      >
        <video
          className="w-full aspect-video object-cover"
          src={src}
          autoPlay
          loop
          muted={false}
          playsInline
          controls
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center text-lg font-black hover:bg-black/80 transition-colors backdrop-blur-sm"
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
}

function DraggableCard({ card, constraintsRef, onOpen }: {
  card: typeof FLOATING_CARDS[0];
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  onOpen: (video: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(30 + card.id);
  const dragDistance = React.useRef(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rawRx = useTransform(y, [-200, 200], [25, -25]);
  const rawRy = useTransform(x, [-200, 200], [-25, 25]);
  const rotateX = useSpring(rawRx, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(rawRy, { stiffness: 150, damping: 20 });

  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragElastic={0.15}
      dragTransition={{ bounceStiffness: 180, bounceDamping: 18 }}
      onPointerDown={() => setZIndex(200)}
      onDragStart={() => { setIsDragging(true); dragDistance.current = 0; }}
      onDrag={(_, info) => { dragDistance.current = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2); }}
      onDragEnd={() => { setIsDragging(false); setZIndex(30 + card.id); }}
      whileDrag={{ scale: 1.1 }}
      animate={{
        rotate: isDragging ? 0 : [card.rotate, card.rotate + 3, card.rotate - 2, card.rotate],
      }}
      transition={{
        rotate: { duration: 4 + card.id, repeat: Infinity, ease: "easeInOut" }
      }}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{ left: card.x, top: card.y, rotate: card.rotate, zIndex, x, y, perspective: 800 }}
      onClick={() => { if (dragDistance.current < 8) onOpen(card.video); }}
    >
      <motion.div
        className="w-45 h-64 rounded-2xl overflow-hidden shadow-2xl select-none"
        style={{
          border: "2px solid rgba(255,255,255,0.3)",
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale: 1.05, boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <video
          className="w-full h-full object-cover pointer-events-none"
          src={card.video}
          autoPlay
          loop
          muted
          playsInline
          style={{ imageRendering: "auto", WebkitBackfaceVisibility: "hidden" }}
        />

        {/* Play hint on hover */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-2xl"
          initial={{ opacity: 0, backgroundColor: "rgba(0,0,0,0)" }}
          whileHover={{ opacity: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center"
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1 }}
          >
            <span className="text-white text-lg ml-1">▶</span>
          </motion.div>
        </motion.div>

        {/* Shine overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: useTransform(
              [rotateX, rotateY],
              ([rx, ry]: number[]) =>
                `radial-gradient(circle at ${50 + ry * 2}% ${50 - rx * 2}%, rgba(255,255,255,0.18) 0%, transparent 65%)`
            ),
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function CardPanel({ branding }: { branding: any }) {
  const constraintsRef = React.useRef<HTMLDivElement>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <>
      {activeVideo && (
        <VideoModal src={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      <div
        ref={constraintsRef}
        className="hidden md:flex w-2/5 relative overflow-hidden bg-gradient-to-br from-[#0AB600] to-[#065e00] select-none"
        style={{ perspective: 1000 }}
      >
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0 bg-black/20" />

        {FLOATING_CARDS.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            constraintsRef={constraintsRef}
            onOpen={setActiveVideo}
          />
        ))}

        <div className="relative z-[25] flex flex-col justify-between p-14 text-white w-full pointer-events-none">
          <div className="flex items-center gap-4">
            {branding.logoDataUrl ? (
              <img src={branding.logoDataUrl} alt="Logo" className="w-14 h-14 rounded-[18px] object-contain bg-white shadow-lg p-1" />
            ) : (
              <div className="w-14 h-14 bg-white rounded-[18px] flex items-center justify-center font-black text-2xl text-[#0AB600] shadow-lg">SR</div>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight drop-shadow">{branding.appName}</h1>
              <p className="text-white/70 text-sm font-medium mt-0.5">{branding.universityName}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-4xl font-black leading-tight drop-shadow-lg">
              STAS-RG<br />Management<br />System
            </h2>
            <p className="text-white/80 text-base leading-relaxed max-w-[260px] drop-shadow">
              Platform terpadu manajemen riset, akademik, dan kehadiran Anggota STAS-RG.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {["Riset", "Logbook", "Absensi GPS", "Laporan", "Multi-Role"].map((tag) => (
                <span key={tag} className="px-3 py-1.5 bg-white/20 border border-white/30 rounded-full text-xs font-bold text-white backdrop-blur-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/40 font-medium">© 2026 STAS-RG MS · All rights reserved.</p>
        </div>
      </div>
    </>
  );
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
        tipe: sessionUser.tipe
      });
      navigate(ROLE_DESTINATION[sessionUser.role] || "/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login gagal. Periksa kembali ID/Email dan password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <div className="w-full h-full bg-white flex">

        <CardPanel branding={branding} />

        <div className="flex-1 flex items-center justify-center p-8 lg:p-14 bg-white overflow-y-auto">
          <div className="w-full max-w-[400px]">

            <div className="flex flex-col items-center text-center mb-10">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="Logo" className="w-14 h-14 rounded-[14px] object-contain bg-white border border-border shadow-sm mb-3 p-1" />
              ) : (
                <div className="w-14 h-14 bg-[#0AB600] rounded-[14px] flex items-center justify-center text-white font-black text-xl shadow-sm mb-3">SR</div>
              )}
              <h1 className="font-black text-foreground text-xl">{branding.appName}</h1>
              <p className="text-muted-foreground text-sm mt-1">Masuk ke sistem dengan akun Anda</p>
            </div>

            <h2 className="text-2xl font-black text-foreground mb-1">Selamat Datang 👋</h2>
            <p className="text-muted-foreground text-sm mb-5">Masukkan ID / NIM / Email dan password Anda.</p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-black text-foreground">NIM / Email</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
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
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="w-full h-12 px-4 pr-12 rounded-[14px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#0AB600]/30 focus:border-[#0AB600] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-xs font-bold text-red-600">
                  {error}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-[#0AB600] hover:bg-[#099800] text-white font-black rounded-[14px] transition-all shadow-sm shadow-[#0AB600]/20 disabled:opacity-60 disabled:cursor-not-allowed"
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
