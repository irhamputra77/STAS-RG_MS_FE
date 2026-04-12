import React, { useState } from "react";
import { Layout } from "../components/Layout";
import {
  User, Info, Lock, Bell, LogOut, Eye, EyeOff, Check,
  Camera, Shield, AlertTriangle, ChevronRight, X,
  BookOpen, FlaskConical, MessageSquare, FileCheck, Calendar,
} from "lucide-react";
import { apiGet, apiPatch, apiPost, apiPut, getStoredUser } from "../lib/api";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Tab = "profil" | "akun" | "password" | "notifikasi" | "pengunduran";

function getInitials(name?: string | null) {
  const value = String(name || "").trim();
  if (!value) return "U";
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHARED UI ATOMS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-black text-foreground mb-1">{children}</h2>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-muted-foreground mb-7">{children}</p>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-foreground mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-[12px] border border-border bg-white text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all ${props.className ?? ""}`}
    />
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all resize-none"
    />
  );
}

function SaveButton({ label = "Simpan Perubahan", onClick, danger }: { label?: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-[12px] text-sm font-black text-white shadow-sm transition-all ${
        danger
          ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
          : "bg-[#6C47FF] hover:bg-[#5835e5] shadow-[#6C47FF]/20"
      }`}
    >
      {danger ? <AlertTriangle size={16} /> : <Check size={16} strokeWidth={3} />}
      {label}
    </button>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TAB: PROFIL & FOTO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TabProfil() {
  const user = getStoredUser();
  const [bio, setBio] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [nim, setNim] = useState("");
  const [phone, setPhone] = useState("");
  const [lastUpdate, setLastUpdate] = useState("-");

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const profile = await apiGet<any>(`/profile/${encodeURIComponent(user.id)}`);
        setName(profile.name || "");
        setNim(profile.nim || "");
        setPhone(profile.phone || "");
        const bioKey = `stas_profile_bio_${user.id}`;
        const savedBio = localStorage.getItem(bioKey);
        if (savedBio !== null) {
          setBio(savedBio);
        }
        setLastUpdate(new Date().toLocaleDateString("id-ID"));
      } catch {
      }
    };

    loadProfile();
  }, [user?.id]);

  const saveProfile = async () => {
    if (!user?.id) return;
    await apiPatch(`/profile/${encodeURIComponent(user.id)}`, { name, phone });
    localStorage.setItem(`stas_profile_bio_${user.id}`, bio);
    setLastUpdate(new Date().toLocaleDateString("id-ID"));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionTitle>Profil & Foto</SectionTitle>
        <SectionDesc>Informasi ini akan terlihat oleh dosen pembimbing dan anggota riset Anda.</SectionDesc>

        {/* Avatar + upload */}
        <div className="flex items-center gap-6 mb-8 p-5 bg-[#F8F5FF] border border-[#E9E0FF] rounded-[16px]">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6C47FF] to-[#9E8BFF] flex items-center justify-center text-white shadow-lg shadow-[#6C47FF]/20 shrink-0">
              <span className="text-3xl font-black tracking-tight">{getInitials(name)}</span>
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera size={22} className="text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-foreground">Foto Profil</p>
            <p className="text-xs font-medium text-muted-foreground">JPG, PNG, atau GIF. Maksimal 2 MB.</p>
            <div className="flex items-center gap-2 mt-1">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D4C5FF] text-[#6C47FF] text-sm font-bold rounded-[10px] hover:bg-[#F8F5FF] hover:border-[#9E8BFF] transition-all shadow-sm">
                <Camera size={14} /> Ganti Foto
              </button>
              <button className="px-4 py-2 bg-white border border-border text-sm font-bold text-muted-foreground rounded-[10px] hover:bg-muted/30 transition-colors">
                Hapus
              </button>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label required>Nama Lengkap</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap Anda" />
            </div>
            <div>
              <Label required>NIM</Label>
              <Input value={nim} readOnly placeholder="Nomor Induk Mahasiswa" />
            </div>
          </div>
          <div>
            <Label>Nomor HP</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="Nomor HP aktif" />
          </div>
          <div>
            <Label>Bio / Deskripsi Singkat</Label>
            <Textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan sedikit tentang diri Anda, minat riset, atau keahlian..."
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 text-right">{bio.length}/300 karakter</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Terakhir diperbarui: {lastUpdate}</p>
          <SaveButton onClick={saveProfile} />
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TAB: INFORMASI AKUN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: { text: string; color: string } }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className="text-sm font-bold text-foreground mt-0.5">{value}</span>
      </div>
      {badge && (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${badge.color}`}>{badge.text}</span>
      )}
    </div>
  );
}

function TabAkun() {
  return (
    <div>
      <SectionTitle>Informasi Akun</SectionTitle>
      <SectionDesc>Data akademik yang dikelola oleh institusi. Hubungi admin untuk perubahan.</SectionDesc>

      {/* Read-only badge */}
      <div className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-[12px] self-start w-fit">
        <Shield size={14} className="text-amber-600 shrink-0" />
        <span className="text-xs font-black text-amber-700">Data bersifat read-only â€” hanya dapat diubah oleh admin</span>
      </div>

      <div className="bg-white border border-border rounded-[16px] px-6 divide-y-0">
        <InfoRow label="Program Studi" value="-" />
        <InfoRow label="Angkatan" value="-" />
        <InfoRow
          label="Status Mahasiswa"
          value="Aktif"
          badge={{ text: "â— Aktif", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" }}
        />
        <InfoRow label="Email Institusi" value="-" />
        <InfoRow label="Perguruan Tinggi" value="-" />
        <InfoRow label="Dosen Pembimbing" value="-" />
        <InfoRow label="Bergabung Sejak" value="-" />
      </div>

      <div className="mt-6 p-5 bg-slate-50 border border-border rounded-[16px]">
        <p className="text-sm font-bold text-foreground mb-1">Perlu memperbarui data di atas?</p>
        <p className="text-xs font-medium text-muted-foreground">Kirimkan permintaan perubahan data ke bagian akademik melalui email <span className="font-black text-[#6C47FF]">akademik@univ.ac.id</span> atau datang langsung ke loket Administrasi Akademik.</p>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TAB: GANTI PASSWORD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TabAkunDynamic() {
  const user = getStoredUser();
  const [profile, setProfile] = useState<any>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const data = await apiGet<any>(`/profile/${encodeURIComponent(user.id)}`);
        setProfile(data || null);
      } catch {
      }
    };
    loadProfile();
  }, [user?.id]);

  const status = String(profile?.status || "-");
  const statusColor =
    status.toLowerCase() === "aktif"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-slate-100 text-slate-600 border border-slate-200";
  const joinedDate = profile?.bergabung ? new Date(profile.bergabung).toLocaleDateString("id-ID") : "-";

  return (
    <div>
      <SectionTitle>Informasi Akun</SectionTitle>
      <SectionDesc>Data akademik yang dikelola oleh institusi. Hubungi admin untuk perubahan.</SectionDesc>

      <div className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-[12px] self-start w-fit">
        <Shield size={14} className="text-amber-600 shrink-0" />
        <span className="text-xs font-black text-amber-700">Data bersifat read-only, hanya dapat diubah oleh admin</span>
      </div>

      <div className="bg-white border border-border rounded-[16px] px-6 divide-y-0">
        <InfoRow label="Program Studi" value={profile?.prodi || "-"} />
        <InfoRow label="Angkatan" value={profile?.angkatan || "-"} />
        <InfoRow
          label="Status Mahasiswa"
          value={status}
          badge={{ text: `â€¢ ${status}`, color: statusColor }}
        />
        <InfoRow label="Email Institusi" value={profile?.email || "-"} />
        <InfoRow label="Perguruan Tinggi" value="-" />
        <InfoRow label="Dosen Pembimbing" value={profile?.pembimbing || "-"} />
        <InfoRow label="Bergabung Sejak" value={joinedDate} />
      </div>

      <div className="mt-6 p-5 bg-slate-50 border border-border rounded-[16px]">
        <p className="text-sm font-bold text-foreground mb-1">Perlu memperbarui data di atas?</p>
        <p className="text-xs font-medium text-muted-foreground">Kirimkan permintaan perubahan data ke bagian akademik melalui email <span className="font-black text-[#6C47FF]">akademik@univ.ac.id</span> atau datang langsung ke loket Administrasi Akademik.</p>
      </div>
    </div>
  );
}

function PasswordInput({
  label, placeholder, value, onChange,
}: {
  label: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label required>{label}</Label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"}
          className="w-full px-4 py-3 pr-12 rounded-[12px] border border-border bg-white text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Min. 8 karakter",       ok: password.length >= 8 },
    { label: "Huruf besar",           ok: /[A-Z]/.test(password) },
    { label: "Angka",                 ok: /[0-9]/.test(password) },
    { label: "Karakter khusus",       ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const levels = [
    { label: "Lemah",   color: "bg-red-500",    textColor: "text-red-600" },
    { label: "Cukup",   color: "bg-amber-400",  textColor: "text-amber-600" },
    { label: "Baik",    color: "bg-blue-500",   textColor: "text-blue-600" },
    { label: "Kuat",    color: "bg-emerald-500",textColor: "text-emerald-600" },
    { label: "Sangat Kuat", color: "bg-emerald-600", textColor: "text-emerald-700" },
  ];
  const level = password.length === 0 ? null : levels[Math.min(score, 4)];

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                score > i && password.length > 0 ? levels[Math.min(score - 1, 3)].color : "bg-slate-100"
              }`}
            />
          ))}
        </div>
        {level && (
          <span className={`text-[11px] font-black shrink-0 ${level.textColor}`}>{level.label}</span>
        )}
      </div>
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-1.5 mt-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${c.ok ? "bg-emerald-500" : "bg-slate-100"}`}>
              {c.ok && <Check size={10} strokeWidth={3} className="text-white" />}
            </div>
            <span className={`text-[11px] font-medium transition-colors ${c.ok ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabPassword() {
  const user = getStoredUser();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const match = newPass === confirm && confirm.length > 0;
  const mismatch = confirm.length > 0 && !match;

  const savePassword = async () => {
    if (!user?.id || !match) return;
    await apiPut(`/profile/${encodeURIComponent(user.id)}/password`, {
      oldPassword: current,
      newPassword: newPass
    });
    setCurrent("");
    setNewPass("");
    setConfirm("");
  };

  return (
    <div>
      <SectionTitle>Ganti Password</SectionTitle>
      <SectionDesc>Gunakan password yang kuat dan belum pernah dipakai di platform lain.</SectionDesc>

      <div className="flex flex-col gap-5 max-w-[480px]">
        <PasswordInput label="Password Saat Ini" value={current} onChange={setCurrent} placeholder="Masukkan password lama" />

        <div className="h-px bg-border" />

        <div>
          <PasswordInput label="Password Baru" value={newPass} onChange={setNewPass} placeholder="Buat password baru" />
          {newPass.length > 0 && <PasswordStrength password={newPass} />}
        </div>

        <div>
          <PasswordInput label="Konfirmasi Password Baru" value={confirm} onChange={setConfirm} placeholder="Ulangi password baru" />
          {confirm.length > 0 && (
            <div className={`flex items-center gap-1.5 mt-2 text-xs font-bold ${match ? "text-emerald-600" : "text-red-500"}`}>
              {match ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
              {match ? "Password cocok" : "Password tidak cocok"}
            </div>
          )}
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-[12px] flex items-start gap-3">
          <Shield size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs font-medium text-amber-700">
            Setelah password diperbarui, Anda akan otomatis keluar dari semua perangkat lain dan perlu login ulang.
          </p>
        </div>

        <div className="pt-2">
          <SaveButton label="Perbarui Password" onClick={savePassword} />
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TAB: NOTIFIKASI
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 ${
        enabled ? "bg-[#6C47FF]" : "bg-slate-200"
      }`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${enabled ? "left-6" : "left-1"}`} />
    </button>
  );
}

interface NotifItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  enabled: boolean;
}

function TabNotifikasi() {
  const user = getStoredUser();
  const [items, setItems] = useState<NotifItem[]>([
    { id: "logbook",   icon: <BookOpen size={16} />,     label: "Logbook Reminder",        desc: "Pengingat harian untuk mengisi logbook sebelum pukul 23.59",   enabled: true  },
    { id: "riset",     icon: <FlaskConical size={16} />,  label: "Pengumuman Riset",         desc: "Pemberitahuan update status dan milestone dari proyek riset",   enabled: true  },
    { id: "komentar",  icon: <MessageSquare size={16} />, label: "Komentar Baru",            desc: "Notifikasi saat dosen atau rekan memberi komentar pada tugas",  enabled: true  },
    { id: "cuti",      icon: <FileCheck size={16} />,     label: "Persetujuan Cuti",         desc: "Status pengajuan cuti disetujui atau ditolak oleh pembimbing",  enabled: false },
    { id: "deadline",  icon: <Calendar size={16} />,      label: "Pengingat Deadline",       desc: "Peringatan H-3 dan H-1 sebelum deadline tugas sprint",         enabled: true  },
    { id: "chat",      icon: <MessageSquare size={16} />, label: "Pesan Langsung",           desc: "Notifikasi pesan masuk dari dosen atau anggota tim",            enabled: false },
    { id: "dokumen",   icon: <FileCheck size={16} />,     label: "Validasi Dokumen",         desc: "Status dokumen yang diunggah (diterima / perlu revisi)",        enabled: true  },
  ]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      try {
        const data = await apiGet<{ items?: Array<{ id: string; enabled: boolean }> }>("/notifications/preferences");
        const saved = Array.isArray(data?.items) ? data.items : [];
        if (saved.length === 0) return;

        const map = new Map(saved.map((item) => [String(item.id), Boolean(item.enabled)]));
        setItems((prev) =>
          prev.map((item) => (map.has(item.id) ? { ...item, enabled: Boolean(map.get(item.id)) } : item))
        );
      } catch {
      }
    };
    loadPreferences();
  }, [user?.id]);

  const toggle = (id: string) =>
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, enabled: !it.enabled } : it));

  const savePreferences = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await apiPut("/notifications/preferences", {
        userId: user.id,
        items: items.map((item) => ({ id: item.id, enabled: item.enabled }))
      });
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    { label: "Kegiatan Akademik", ids: ["logbook", "deadline"] },
    { label: "Riset & Kolaborasi", ids: ["riset", "komentar", "chat"] },
    { label: "Administrasi",       ids: ["cuti", "dokumen"] },
  ];

  return (
    <div>
      <SectionTitle>Preferensi Notifikasi</SectionTitle>
      <SectionDesc>Pilih jenis notifikasi yang ingin Anda terima dari sistem.</SectionDesc>

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">{group.label}</p>
            <div className="bg-white border border-border rounded-[16px] overflow-hidden divide-y divide-border">
              {items
                .filter((it) => group.ids.includes(it.id))
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${
                        item.enabled ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-slate-100 text-slate-400"
                      }`}>
                        {item.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{item.label}</span>
                        <span className="text-[11px] font-medium text-muted-foreground mt-0.5">{item.desc}</span>
                      </div>
                    </div>
                    <Toggle enabled={item.enabled} onChange={() => toggle(item.id)} />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {items.filter((i) => i.enabled).length} dari {items.length} notifikasi aktif
        </p>
        <SaveButton label={saving ? "Menyimpan..." : "Simpan Preferensi"} onClick={savePreferences} />
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TAB: PENGUNDURAN DIRI
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TabPengunduran() {
  const user = getStoredUser();
  const [advisorName, setAdvisorName] = useState("dosen pembimbing Anda");
  const [studentRecordId, setStudentRecordId] = useState("");
  const [reason, setReason] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<any[]>([]);

  React.useEffect(() => {
    const loadAdvisor = async () => {
      if (!user?.id) return;
      try {
        const profile = await apiGet<any>(`/profile/${encodeURIComponent(user.id)}`);
        const resolvedStudentId = String(profile?.id || profile?.student_id || "").trim();
        if (resolvedStudentId) {
          setStudentRecordId(resolvedStudentId);
        }
        if (profile?.pembimbing) {
          setAdvisorName(profile.pembimbing);
        }
      } catch {
      }
    };
    loadAdvisor();
  }, [user?.id]);

  React.useEffect(() => {
    const loadRequests = async () => {
      if (!studentRecordId) return;
      try {
        const rows = await apiGet<Array<any>>(`/withdrawal-requests?studentId=${encodeURIComponent(studentRecordId)}`);
        setRequests(Array.isArray(rows) ? rows : []);
      } catch (error: any) {
        setMessage(error?.message || "Gagal memuat status pengunduran diri.");
      }
    };

    loadRequests();
  }, [studentRecordId]);

  const consequences = [
    "Akun Anda akan dinonaktifkan secara permanen",
    "Semua data logbook, riset, dan dokumen tidak dapat diakses",
    "Anda akan dikeluarkan dari semua proyek riset yang sedang berjalan",
    "Pengajuan akan ditinjau operator terlebih dahulu sebelum diteruskan",
    "Keputusan final baru berlaku setelah disetujui dosen pembimbing",
  ];

  const activeRequest = requests.find((item) => ["Menunggu", "Menunggu Dosen"].includes(String(item?.final_status || "")));

  const finalStatusBadgeClass = (status: string) => {
    if (status === "Disetujui") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (String(status).includes("Ditolak")) return "bg-red-100 text-red-600 border border-red-200";
    if (status === "Menunggu Dosen") return "bg-blue-100 text-blue-700 border border-blue-200";
    return "bg-amber-100 text-amber-700 border border-amber-200";
  };

  const submitWithdrawalRequest = async () => {
    if (!studentRecordId) {
      setMessage("Data mahasiswa tidak ditemukan. Silakan login ulang.");
      return;
    }
    if (reason.trim().length < 50) {
      setMessage("Alasan pengunduran diri minimal 50 karakter.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const response = await apiPost<{ message?: string; id?: string }>("/withdrawal-requests", {
        studentId: studentRecordId,
        reason: reason.trim()
      });

      const refreshed = await apiGet<Array<any>>(`/withdrawal-requests?studentId=${encodeURIComponent(studentRecordId)}`);
      setRequests(Array.isArray(refreshed) ? refreshed : []);
      setReason("");
      setConfirmed(false);
      setIsModalOpen(false);
      setMessage(response?.message || "Pengajuan pengunduran diri berhasil dikirim.");
    } catch (error: any) {
      setMessage(error?.message || "Gagal mengirim pengajuan pengunduran diri.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <SectionTitle>Pengunduran Diri</SectionTitle>
      <SectionDesc>Ajukan permohonan pengunduran diri sebagai mahasiswa aktif dari sistem ini.</SectionDesc>

      {message && (
        <div className="mb-6 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          {message}
        </div>
      )}

      {requests.length > 0 && (
        <div className="mb-6 rounded-[16px] border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-foreground">Status Pengajuan</p>
              <p className="text-xs font-medium text-muted-foreground">Riwayat approval operator dan dosen pembimbing.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${finalStatusBadgeClass(String(requests[0]?.final_status || "Menunggu"))}`}>
              {requests[0]?.final_status || "Menunggu"}
            </span>
          </div>

          <div className="mb-4 flex items-center gap-1.5">
            {[
              { label: "Pengajuan", done: true },
              { label: "Operator", done: ["Diteruskan"].includes(String(requests[0]?.status_operator || "")) },
              { label: "Dosen Pembimbing", done: ["Disetujui"].includes(String(requests[0]?.status_dosen || "")) },
            ].map((step, index, arr) => (
              <div key={step.label} className="flex items-center gap-1">
                <div className={`flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-black ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {step.done ? <Check size={10} strokeWidth={3} /> : <AlertTriangle size={10} strokeWidth={2.5} />}
                  {step.label}
                </div>
                {index < arr.length - 1 && <ChevronRight size={12} className="text-muted-foreground" />}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {requests.map((item) => (
              <div key={item.id} className="rounded-[12px] border border-border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-foreground">{new Date(item.submitted_at).toLocaleDateString("id-ID")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${finalStatusBadgeClass(String(item.final_status || "Menunggu"))}`}>
                    {item.final_status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-muted-foreground">
                  <p>Operator: <span className="font-bold text-foreground">{item.status_operator || "Menunggu"}</span>{item.operator_note ? ` · ${item.operator_note}` : ""}</p>
                  <p>Dosen pembimbing: <span className="font-bold text-foreground">{item.status_dosen || "Menunggu"}</span>{item.advisor_note ? ` · ${item.advisor_note}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning box */}
      <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-[16px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-red-700">Zona Berbahaya â€” Tindakan Tidak Dapat Dibatalkan</p>
            <p className="text-xs font-medium text-red-500 mt-0.5">Baca seluruh konsekuensi sebelum melanjutkan</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {consequences.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm font-medium text-red-700">
              <div className="w-5 h-5 rounded-full bg-red-200 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</div>
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Reason */}
      <div className="mb-6">
        <Label required>Alasan Pengunduran Diri</Label>
        <Textarea
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Jelaskan alasan Anda mengajukan pengunduran diri secara lengkap. Alasan ini akan dibaca oleh operator terlebih dahulu, lalu oleh dosen pembimbing..."
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">Min. 50 karakter Â· {reason.length} karakter diisi</p>
      </div>

      <div className="mb-6 rounded-[16px] border border-[#E9E0FF] bg-[#F8F5FF] p-5">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#6C47FF]">Alur Persetujuan</p>
        <div className="flex flex-col gap-2.5">
          {[
            "1. Mahasiswa mengirim pengajuan pengunduran diri.",
            "2. Operator meninjau kelengkapan lalu memutuskan diteruskan atau ditolak.",
            "3. Jika diteruskan operator, dosen pembimbing memberi keputusan akhir.",
          ].map((step) => (
            <div key={step} className="flex items-start gap-2.5 text-sm font-medium text-[#4C3BB8]">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#D8CEFF] bg-white">
                <Check size={11} strokeWidth={3} />
              </div>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-slate-50 border border-border rounded-[12px] mb-6">
        <p className="text-xs font-medium text-muted-foreground">
          Setelah pengajuan dikirim, Anda masih dapat menggunakan akun hingga proses verifikasi operator dan dosen pembimbing selesai (maks. 3 hari kerja).
          Untuk pertanyaan, hubungi <span className="font-black text-foreground">akademik@univ.ac.id</span>.
        </p>
      </div>

      <SaveButton
        label={activeRequest ? "Pengajuan Sedang Diproses" : "Ajukan Pengunduran Diri"}
        onClick={() => !activeRequest && setIsModalOpen(true)}
        danger
      />

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-[440px] rounded-[20px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <p className="text-base font-black text-red-700">Konfirmasi Pengunduran Diri</p>
                  <p className="text-xs font-medium text-red-400 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <button onClick={() => { setIsModalOpen(false); setConfirmed(false); }} className="text-slate-400 hover:text-slate-600 transition-colors mt-1">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-4">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                Pengajuan pengunduran diri Anda akan dikirimkan ke <span className="font-black">operator</span> terlebih dahulu untuk diverifikasi. Jika diteruskan, permintaan ini akan dikirim ke <span className="font-black">{advisorName}</span> sebagai dosen pembimbing untuk keputusan akhir.
              </p>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setConfirmed(!confirmed)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    confirmed ? "bg-red-500 border-red-500" : "bg-white border-slate-300 group-hover:border-red-400"
                  }`}
                >
                  {confirmed && <Check size={12} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-sm font-medium text-foreground leading-snug">
                  Saya memahami konsekuensinya dan menyatakan bahwa keputusan ini diambil atas kemauan sendiri tanpa paksaan dari pihak manapun.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                onClick={() => { setIsModalOpen(false); setConfirmed(false); }}
                className="px-5 py-2.5 rounded-[12px] text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                disabled={!confirmed}
                onClick={submitWithdrawalRequest}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-red-500/20"
              >
                <LogOut size={15} /> {submitting ? "Mengirim..." : "Ya, Kirim ke Operator"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN PAGE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; danger?: boolean }[] = [
  { id: "profil",       label: "Profil & Foto",         icon: <User size={18} /> },
  { id: "akun",         label: "Informasi Akun",         icon: <Info size={18} /> },
  { id: "password",     label: "Ganti Password",         icon: <Lock size={18} /> },
  { id: "notifikasi",   label: "Notifikasi",             icon: <Bell size={18} /> },
  { id: "pengunduran",  label: "Pengunduran Diri",       icon: <LogOut size={18} />, danger: true },
];

export default function Settings() {
  const user = getStoredUser();
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [miniName, setMiniName] = useState(user?.name || "Pengguna");
  const [miniNim, setMiniNim] = useState("-");

  React.useEffect(() => {
    const loadMini = async () => {
      if (!user?.id) return;
      try {
        const profile = await apiGet<any>(`/profile/${encodeURIComponent(user.id)}`);
        setMiniName(profile?.name || user?.name || "Pengguna");
        setMiniNim(profile?.nim || "-");
      } catch {
      }
    };
    loadMini();
  }, [user?.id]);

  return (
    <Layout title="Pengaturan">
      <div className="max-w-[1060px] mx-auto flex flex-col gap-6">

        {/* Page header */}
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Akun</p>
          <h1 className="text-2xl font-black text-foreground">Pengaturan</h1>
        </div>

        <div className="flex gap-6 items-start">

          {/* â”€â”€ Left: Tab Navigation â”€â”€ */}
          <aside className="w-[220px] shrink-0 bg-white border border-border rounded-[18px] p-2 shadow-sm sticky top-0">
            <nav className="flex flex-col gap-0.5">
              {TAB_CONFIG.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] text-sm font-bold transition-all text-left ${
                      isActive
                        ? tab.danger
                          ? "bg-red-50 text-red-600"
                          : "bg-[#6C47FF] text-white shadow-sm shadow-[#6C47FF]/20"
                        : tab.danger
                          ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {tab.icon}
                      {tab.label}
                    </span>
                    {isActive && !tab.danger && <ChevronRight size={14} strokeWidth={3} className="shrink-0 opacity-70" />}
                  </button>
                );
              })}
            </nav>

            {/* User mini card at bottom */}
            <div className="mt-3 pt-3 border-t border-border px-3 py-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C47FF] to-[#9E8BFF] flex items-center justify-center text-white shrink-0">
                <span className="text-[11px] font-black">{getInitials(miniName)}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-black text-foreground truncate">{miniName}</p>
                <p className="text-[10px] font-medium text-muted-foreground truncate">{miniNim}</p>
              </div>
            </div>
          </aside>

          {/* â”€â”€ Right: Content Panel â”€â”€ */}
          <main className="flex-1 min-w-0 bg-white border border-border rounded-[18px] p-8 shadow-sm">
            {activeTab === "profil"      && <TabProfil />}
            {activeTab === "akun"        && <TabAkunDynamic />}
            {activeTab === "password"    && <TabPassword />}
            {activeTab === "notifikasi"  && <TabNotifikasi />}
            {activeTab === "pengunduran" && <TabPengunduran />}
          </main>

        </div>
      </div>
    </Layout>
  );
}

