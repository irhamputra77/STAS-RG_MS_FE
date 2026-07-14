import React, { useState } from "react";
import { Layout } from "../templates/Layout";
import { ProfileAvatar } from "../molecules/ProfileAvatar";
import {
  User,
  Info,
  Lock,
  Bell,
  LogOut,
  Eye,
  EyeOff,
  Check,
  Camera,
  Shield,
  AlertTriangle,
  ChevronRight,
  X,
  BookOpen,
  FlaskConical,
  MessageSquare,
  FileCheck,
  Calendar,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getStoredUser } from "../../lib/api";
import { getWfhSourceMeta, getWfhSummary } from "../../lib/wfh";
import { updateStoredUserProfile } from "../../lib/userProfileSync";

type Tab = "profil" | "akun" | "password" | "notifikasi" | "pengunduran";

type StudentProfileForm = {
  email: string;
  prodi: string;
  angkatan: string;
  fakultas: string;
  pembimbing: string;
  status: string;
  tipe: string;
  bergabung: string;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-black text-foreground mb-1">{children}</h2>;
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-muted-foreground mb-7">{children}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-foreground mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-[12px] border border-border bg-white text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all ${
        props.className ?? ""
      }`}
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

function SaveButton({
  label = "Simpan Perubahan",
  onClick,
  danger,
  disabled,
}: {
  label?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-3 rounded-[12px] text-sm font-black text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
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

function TabProfil({
  onProfileUpdated,
}: {
  onProfileUpdated?: (profile: { name?: string; photoUrl?: string | null }) => void;
}) {
  const user = getStoredUser();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [bio, setBio] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [nim, setNim] = useState("");
  const [phone, setPhone] = useState("");
  const [studentForm, setStudentForm] = useState<StudentProfileForm>({
    email: "",
    prodi: "",
    angkatan: "",
    fakultas: "",
    pembimbing: "",
    status: "Aktif",
    tipe: "Riset",
    bergabung: ""
  });
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || user?.photo_url || "");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [lastUpdate, setLastUpdate] = useState("-");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const setStudentField = (key: keyof StudentProfileForm, value: string) => {
    setStudentForm((prev) => ({ ...prev, [key]: value }));
  };

  const normalizeDateInput = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw || raw === "-") return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  };

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const profile = await apiGet<any>(`/profile/${encodeURIComponent(user.id)}`);

        setName(profile.name || "");
        setNim(profile.nim || "");
        setPhone(profile.phone || "");
        setStudentForm({
          email: profile.email || "",
          prodi: profile.prodi || "",
          angkatan: String(profile.angkatan || ""),
          fakultas: profile.fakultas || "",
          pembimbing: profile.pembimbing || "",
          status: profile.status || "Aktif",
          tipe: profile.tipe || "Riset",
          bergabung: normalizeDateInput(profile.bergabung)
        });
        setPhotoUrl(profile.photoUrl || profile.photo_url || "");
        setBio(profile.bio || profile.bioText || profile.bio_text || "");

        setLastUpdate(new Date().toLocaleDateString("id-ID"));
      } catch {
        setMessage("Gagal memuat profil.");
      }
    };

    void loadProfile();
  }, [user?.id]);

  React.useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const validatePhoto = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

    if (!allowedTypes.includes(file.type)) {
      return "Format foto harus JPG, PNG, atau GIF.";
    }

    if (file.size > 2 * 1024 * 1024) {
      return "Ukuran foto maksimal 2 MB.";
    }

    return "";
  };

  const fileToDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Gagal membaca file foto."));

      reader.readAsDataURL(file);
    });
  };

  const handleSelectPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    const validation = validatePhoto(file);

    if (validation) {
      setMessage(validation);
      event.target.value = "";
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setMessage("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!user?.id) return;

    setSaving(true);
    setMessage("");

    try {
      let nextPhotoUrl = photoUrl;

      if (photoFile) {
        const photoDataUrl = await fileToDataUrl(photoFile);

        const uploadResult = await apiPost<{
          photoUrl?: string;
          photo_url?: string;
        }>("/profile/photo", {
          userId: user.id,
          photoDataUrl,
          fileName: photoFile.name,
        });

        nextPhotoUrl = uploadResult.photoUrl || uploadResult.photo_url || "";

        setPhotoUrl(nextPhotoUrl);
        setPhotoFile(null);

        if (photoPreview) {
          URL.revokeObjectURL(photoPreview);
        }

        setPhotoPreview("");
      }

      await apiPatch(`/profile/${encodeURIComponent(user.id)}`, {
        name,
        nim,
        phone,
        email: studentForm.email,
        prodi: studentForm.prodi,
        angkatan: studentForm.angkatan,
        fakultas: studentForm.fakultas,
        pembimbing: studentForm.pembimbing,
        status: studentForm.status,
        tipe: studentForm.tipe,
        bergabung: studentForm.bergabung || null,
        bio,
        photoUrl: nextPhotoUrl || null,
      });

      updateStoredUserProfile({
        name,
        photoUrl: nextPhotoUrl || null,
        photo_url: nextPhotoUrl || null,
      });

      onProfileUpdated?.({
        name,
        photoUrl: nextPhotoUrl || null,
      });

      setLastUpdate(new Date().toLocaleDateString("id-ID"));
      setMessage("Profil berhasil diperbarui.");
    } catch (error: any) {
      setMessage(error?.message || "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    if (!user?.id) return;

    setSaving(true);
    setMessage("");

    try {
      setPhotoFile(null);

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhotoPreview("");
      setPhotoUrl("");

      await apiDelete(`/profile/photo/${encodeURIComponent(user.id)}`);

      updateStoredUserProfile({
        photoUrl: null,
        photo_url: null,
      });

      onProfileUpdated?.({
        photoUrl: null,
      });

      setMessage("Foto profil berhasil dihapus.");
      setLastUpdate(new Date().toLocaleDateString("id-ID"));
    } catch (error: any) {
      setMessage(error?.message || "Gagal menghapus foto profil.");
    } finally {
      setSaving(false);
    }
  };

  const displayPhoto = photoPreview || photoUrl;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionTitle>Profil & Data Mahasiswa</SectionTitle>
        <SectionDesc>Kolom ini sama dengan Database Mahasiswa admin. Admin dan mahasiswa membaca serta mengubah data yang sama.</SectionDesc>

        {message && (
          <div className="mb-5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 mb-8 p-5 bg-[#F8F5FF] border border-[#E9E0FF] rounded-[16px]">
          <div className="relative group">
            <ProfileAvatar
              name={name}
              photoUrl={displayPhoto}
              className="size-24 shadow-lg shadow-[#6C47FF]/20"
              fallbackClassName="bg-gradient-to-br from-[#6C47FF] to-[#9E8BFF] text-white text-3xl font-black"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Ganti foto profil"
            >
              <Camera size={22} className="text-white" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleSelectPhoto}
              className="hidden"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 text-center sm:text-left">
            <p className="text-sm font-black text-foreground">Foto Profil</p>
            <p className="text-xs font-medium text-muted-foreground">JPG, PNG, atau GIF. Maksimal 2 MB.</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="justify-center flex items-center gap-2 px-4 py-2 bg-white border border-[#D4C5FF] text-[#6C47FF] text-sm font-bold rounded-[10px] hover:bg-[#F8F5FF] hover:border-[#9E8BFF] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Camera size={14} /> Ganti Foto
              </button>

              <button
                type="button"
                onClick={removePhoto}
                disabled={saving || (!photoUrl && !photoPreview)}
                className="px-4 py-2 bg-white border border-border text-sm font-bold text-muted-foreground rounded-[10px] hover:bg-muted/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Hapus
              </button>
            </div>

            {photoFile && (
              <p className="text-[11px] font-semibold text-emerald-600">Foto dipilih: {photoFile.name}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label required>Nama Lengkap</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap Anda" />
            </div>

            <div>
              <Label required>NIM</Label>
              <Input value={nim} onChange={(event) => setNim(event.target.value)} placeholder="Nomor Induk Mahasiswa" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Email</Label>
              <Input
                value={studentForm.email}
                onChange={(event) => setStudentField("email", event.target.value)}
                type="email"
                placeholder="email@student.ac.id"
              />
            </div>

            <div>
              <Label>Nomor HP</Label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                placeholder="Nomor HP aktif"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Program Studi</Label>
              <Input
                value={studentForm.prodi}
                onChange={(event) => setStudentField("prodi", event.target.value)}
                placeholder="S1 Teknik Informatika"
              />
            </div>

            <div>
              <Label>Angkatan</Label>
              <Input
                value={studentForm.angkatan}
                onChange={(event) => setStudentField("angkatan", event.target.value)}
                placeholder="2021"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Fakultas</Label>
              <Input
                value={studentForm.fakultas}
                onChange={(event) => setStudentField("fakultas", event.target.value)}
                placeholder="Fakultas / asal kampus"
              />
            </div>

            <div>
              <Label>Pembimbing</Label>
              <Input
                value={studentForm.pembimbing}
                onChange={(event) => setStudentField("pembimbing", event.target.value)}
                placeholder="Nama dosen pembimbing"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <Label>Tanggal Bergabung</Label>
              <Input
                value={studentForm.bergabung}
                onChange={(event) => setStudentField("bergabung", event.target.value)}
                type="date"
              />
            </div>

            <div>
              <Label>Status Mahasiswa</Label>
              <select
                value={studentForm.status}
                onChange={(event) => setStudentField("status", event.target.value)}
                className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
              >
                {["Aktif", "Cuti", "Alumni", "Mengundurkan Diri"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <Label>Tipe Mahasiswa</Label>
              <select
                value={studentForm.tipe}
                onChange={(event) => setStudentField("tipe", event.target.value)}
                className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20 focus:border-[#6C47FF] transition-all"
              >
                {["Riset", "Magang"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Bio / Deskripsi Singkat</Label>
            <Textarea
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Ceritakan sedikit tentang diri Anda, minat riset, atau keahlian..."
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 text-right">{bio.length}/300 karakter</p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Terakhir diperbarui: {lastUpdate}</p>
          <SaveButton
            label={saving ? "Menyimpan..." : "Simpan Perubahan"}
            onClick={saveProfile}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: { text: string; color: string };
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4 border-b border-border last:border-0">
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className="text-sm font-bold text-foreground mt-0.5 break-words">{value}</span>
      </div>
      {badge && <span className={`w-fit px-2.5 py-1 rounded-lg text-xs font-black ${badge.color}`}>{badge.text}</span>}
    </div>
  );
}

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
        // Ignore profile load error.
      }
    };

    void loadProfile();
  }, [user?.id]);

  const status = String(profile?.status || "-");
  const statusColor =
    status.toLowerCase() === "aktif"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-slate-100 text-slate-600 border border-slate-200";

  const joinedDate = profile?.bergabung ? new Date(profile.bergabung).toLocaleDateString("id-ID") : "-";
  const wfhSummary = getWfhSummary(profile);
  const wfhSourceMeta = getWfhSourceMeta(wfhSummary.wfhQuotaSource);

  const shouldShowWfhInfo =
    user?.role === "mahasiswa" ||
    [profile?.wfhQuota, profile?.wfh_quota, profile?.wfhQuotaSource, profile?.wfh_quota_source].some(
      (value) => value !== null && value !== undefined && value !== ""
    );

  return (
    <div>
      <SectionTitle>Informasi Akun</SectionTitle>
      <SectionDesc>Data ini sinkron dengan Database Mahasiswa admin dan dapat diperbarui dari tab Profil.</SectionDesc>

      <div className="flex items-start sm:items-center gap-2 mb-5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-[12px] self-start w-full sm:w-fit">
        <Shield size={14} className="text-amber-600 shrink-0" />
        <span className="text-xs font-black text-amber-700">Data ini memakai sumber yang sama dengan Database Mahasiswa admin</span>
      </div>

      <div className="bg-white border border-border rounded-[16px] px-4 sm:px-6 divide-y-0">
                <InfoRow label="Program Studi" value={profile?.prodi || "-"} />
        <InfoRow label="Fakultas" value={profile?.fakultas || "-"} />
        <InfoRow label="Angkatan" value={profile?.angkatan || "-"} />
                <InfoRow label="Status Mahasiswa" value={status} badge={{ text: status, color: statusColor }} />
        <InfoRow label="Tipe Mahasiswa" value={profile?.tipe || "-"} />
        <InfoRow label="Email Institusi" value={profile?.email || "-"} />
        <InfoRow label="Dosen Pembimbing" value={profile?.pembimbing || "-"} />
        <InfoRow label="Bergabung Sejak" value={joinedDate} />

        {shouldShowWfhInfo && (
          <>
            <InfoRow label="Jatah WFH" value={`${wfhSummary.wfhQuota} hari`} />
            <InfoRow label="WFH Terpakai" value={`${wfhSummary.wfhUsed} hari`} />
            <InfoRow label="Sisa WFH" value={`${wfhSummary.wfhRemaining} hari`} />
            <InfoRow label="Sumber Jatah WFH" value={wfhSourceMeta.label} />
          </>
        )}
      </div>

      {shouldShowWfhInfo && wfhSourceMeta.helperText && (
        <div className="mt-4 rounded-[14px] border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-700">
          {wfhSourceMeta.helperText}
        </div>
      )}

      <div className="mt-6 p-5 bg-slate-50 border border-border rounded-[16px]">
        <p className="text-sm font-bold text-foreground mb-1">Perlu memperbarui data di atas?</p>
        <p className="text-xs font-medium text-muted-foreground">
          Buka tab Profil & Data Mahasiswa, ubah kolom yang diperlukan, lalu klik Simpan Perubahan.
          
          
        </p>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <Label required>{label}</Label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "********"}
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

const PASSWORD_RULES = [
  { label: "Min. 8 karakter", test: (password: string) => password.length >= 8 },
  { label: "Huruf besar", test: (password: string) => /[A-Z]/.test(password) },
  { label: "Angka", test: (password: string) => /[0-9]/.test(password) },
  { label: "Karakter khusus", test: (password: string) => /[^a-zA-Z0-9]/.test(password) },
];

function getPasswordScore(password: string) {
  return PASSWORD_RULES.filter((item) => item.test(password)).length;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = PASSWORD_RULES.map((item) => ({
    label: item.label,
    ok: item.test(password),
  }));
  const score = getPasswordScore(password);

  const levels = [
    { label: "Lemah", color: "bg-red-500", textColor: "text-red-600" },
    { label: "Cukup", color: "bg-amber-400", textColor: "text-amber-600" },
    { label: "Baik", color: "bg-blue-500", textColor: "text-blue-600" },
    { label: "Kuat", color: "bg-emerald-500", textColor: "text-emerald-600" },
    { label: "Sangat Kuat", color: "bg-emerald-600", textColor: "text-emerald-700" },
  ];

  const level = password.length === 0 ? null : levels[Math.min(score, 4)];

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                score > index && password.length > 0 ? levels[Math.min(score - 1, 3)].color : "bg-slate-100"
              }`}
            />
          ))}
        </div>
        {level && <span className={`text-[11px] font-black shrink-0 ${level.textColor}`}>{level.label}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
        {checks.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                item.ok ? "bg-emerald-500" : "bg-slate-100"
              }`}
            >
              {item.ok && <Check size={10} strokeWidth={3} className="text-white" />}
            </div>
            <span
              className={`text-[11px] font-medium transition-colors ${
                item.ok ? "text-emerald-600 font-bold" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </span>
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const match = newPass === confirm && confirm.length > 0;
  const passwordScore = getPasswordScore(newPass);
  const hasOuterWhitespace = newPass.length > 0 && newPass !== newPass.trim();
  const canSubmit =
    !saving &&
    current.trim().length > 0 &&
    match &&
    !hasOuterWhitespace &&
    passwordScore >= 3;

  const savePassword = async () => {
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("Sesi pengguna tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (!current.trim()) {
      setError("Password saat ini wajib diisi.");
      return;
    }

    if (hasOuterWhitespace) {
      setError("Password baru tidak boleh diawali atau diakhiri spasi.");
      return;
    }

    if (passwordScore < 3) {
      setError("Password baru masih terlalu lemah. Gunakan minimal 8 karakter serta kombinasikan huruf besar, angka, atau karakter khusus.");
      return;
    }

    if (!match) {
      setError("Konfirmasi password belum cocok.");
      return;
    }

    try {
      setSaving(true);
      await apiPut(`/profile/${encodeURIComponent(user.id)}/password`, {
        oldPassword: current,
        newPassword: newPass,
      });

      setCurrent("");
      setNewPass("");
      setConfirm("");
      setSuccess("Password berhasil diperbarui.");
    } catch (err: any) {
      setError(err?.message || "Gagal memperbarui password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionTitle>Ganti Password</SectionTitle>
      <SectionDesc>Gunakan password yang kuat dan belum pernah dipakai di platform lain.</SectionDesc>

      <div className="flex flex-col gap-5 max-w-[480px]">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        )}

        <PasswordInput label="Password Saat Ini" value={current} onChange={setCurrent} placeholder="Masukkan password lama" />

        <div className="h-px bg-border" />

        <div>
          <PasswordInput label="Password Baru" value={newPass} onChange={setNewPass} placeholder="Buat password baru" />
          {newPass.length > 0 && <PasswordStrength password={newPass} />}
          {hasOuterWhitespace && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-500">
              <X size={13} strokeWidth={3} />
              Password tidak boleh diawali atau diakhiri spasi
            </div>
          )}
        </div>

        <div>
          <PasswordInput
            label="Konfirmasi Password Baru"
            value={confirm}
            onChange={setConfirm}
            placeholder="Ulangi password baru"
          />
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
          <SaveButton label={saving ? "Memperbarui..." : "Perbarui Password"} onClick={savePassword} disabled={!canSubmit} />
        </div>
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 ${
        enabled ? "bg-[#6C47FF]" : "bg-slate-200"
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${
          enabled ? "left-6" : "left-1"
        }`}
      />
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
    {
      id: "logbook",
      icon: <BookOpen size={16} />,
      label: "Logbook Reminder",
      desc: "Pengingat harian untuk mengisi logbook sebelum pukul 23.59",
      enabled: true,
    },
    {
      id: "riset",
      icon: <FlaskConical size={16} />,
      label: "Pengumuman Riset",
      desc: "Pemberitahuan update status dan milestone dari proyek riset",
      enabled: true,
    },
    {
      id: "komentar",
      icon: <MessageSquare size={16} />,
      label: "Komentar Baru",
      desc: "Notifikasi saat dosen atau rekan memberi komentar pada tugas",
      enabled: true,
    },
    {
      id: "cuti",
      icon: <FileCheck size={16} />,
      label: "Persetujuan Cuti",
      desc: "Status pengajuan cuti disetujui atau ditolak oleh pembimbing",
      enabled: false,
    },
    {
      id: "deadline",
      icon: <Calendar size={16} />,
      label: "Pengingat Deadline",
      desc: "Peringatan H-3 dan H-1 sebelum deadline tugas sprint",
      enabled: true,
    },
    {
      id: "chat",
      icon: <MessageSquare size={16} />,
      label: "Pesan Langsung",
      desc: "Notifikasi pesan masuk dari dosen atau anggota tim",
      enabled: false,
    },
    {
      id: "dokumen",
      icon: <FileCheck size={16} />,
      label: "Validasi Dokumen",
      desc: "Status dokumen yang diunggah (diterima / perlu revisi)",
      enabled: true,
    },
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

        setItems((prev) => prev.map((item) => (map.has(item.id) ? { ...item, enabled: Boolean(map.get(item.id)) } : item)));
      } catch {
        // Ignore preference load error.
      }
    };

    void loadPreferences();
  }, [user?.id]);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    setSaving(true);

    try {
      await apiPut("/notifications/preferences", {
        userId: user.id,
        items: items.map((item) => ({ id: item.id, enabled: item.enabled })),
      });
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    { label: "Kegiatan Akademik", ids: ["logbook", "deadline"] },
    { label: "Riset & Kolaborasi", ids: ["riset", "komentar", "chat"] },
    { label: "Administrasi", ids: ["cuti", "dokumen"] },
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
                .filter((item) => group.ids.includes(item.id))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="min-w-0 flex items-start sm:items-center gap-3 sm:gap-4">
                      <div
                        className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${
                          item.enabled ? "bg-[#F8F5FF] text-[#6C47FF]" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-sm font-bold text-foreground">{item.label}</span>
                        <span className="text-[11px] font-medium text-muted-foreground mt-0.5 break-words">{item.desc}</span>
                      </div>
                    </div>

                    <Toggle enabled={item.enabled} onChange={() => toggle(item.id)} />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {items.filter((item) => item.enabled).length} dari {items.length} notifikasi aktif
        </p>
        <SaveButton label={saving ? "Menyimpan..." : "Simpan Preferensi"} onClick={savePreferences} disabled={saving} />
      </div>
    </div>
  );
}

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
        const resolvedStudentId = String(profile?.student_id || profile?.studentId || profile?.id || "").trim();

        if (resolvedStudentId) {
          setStudentRecordId(resolvedStudentId);
        }

        if (profile?.pembimbing) {
          setAdvisorName(profile.pembimbing);
        }
      } catch {
        // Ignore advisor load error.
      }
    };

    void loadAdvisor();
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

    void loadRequests();
  }, [studentRecordId]);

  const consequences = [
    "Akun Anda akan dinonaktifkan secara permanen",
    "Semua data logbook, riset, dan dokumen tidak dapat diakses",
    "Anda akan dikeluarkan dari semua proyek riset yang sedang berjalan",
    "Pengajuan akan ditinjau admin terlebih dahulu sebelum diteruskan",
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
        reason: reason.trim(),
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
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-black text-foreground">Status Pengajuan</p>
              <p className="text-xs font-medium text-muted-foreground">Riwayat approval admin dan dosen pembimbing.</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-black ${finalStatusBadgeClass(
                String(requests[0]?.final_status || "Menunggu")
              )}`}
            >
              {String(requests[0]?.final_status || "Menunggu").replace("Operator", "Admin")}
            </span>
          </div>

          <div className="space-y-3">
            {requests.map((item) => (
              <div key={item.id} className="rounded-[12px] border border-border bg-slate-50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-foreground">
                      {new Date(item.submitted_at).toLocaleDateString("id-ID")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${finalStatusBadgeClass(
                      String(item.final_status || "Menunggu")
                    )}`}
                  >
                    {String(item.final_status || "Menunggu").replace("Operator", "Admin")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-[16px]">
        <div className="flex items-start sm:items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-red-700">Zona Berbahaya - Tindakan Tidak Dapat Dibatalkan</p>
            <p className="text-xs font-medium text-red-500 mt-0.5">Baca seluruh konsekuensi sebelum melanjutkan</p>
          </div>
        </div>

        <ul className="flex min-w-0 flex-col gap-2 text-center sm:text-left">
          {consequences.map((item, index) => (
            <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-red-700">
              <div className="w-5 h-5 rounded-full bg-red-200 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                {index + 1}
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <Label required>Alasan Pengunduran Diri</Label>
        <Textarea
          rows={5}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Jelaskan alasan Anda mengajukan pengunduran diri secara lengkap. Alasan ini akan dibaca oleh admin terlebih dahulu, lalu oleh dosen pembimbing..."
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">Min. 50 karakter - {reason.length} karakter diisi</p>
      </div>

      <div className="mb-6 rounded-[16px] border border-[#E9E0FF] bg-[#F8F5FF] p-5">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#6C47FF]">Alur Persetujuan</p>
        <div className="flex flex-col gap-2.5">
          {[
            "1. Mahasiswa mengirim pengajuan pengunduran diri.",
            "2. Admin meninjau kelengkapan lalu memutuskan diteruskan atau ditolak.",
            "3. Jika diteruskan admin, dosen pembimbing memberi keputusan akhir.",
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
          Setelah pengajuan dikirim, Anda masih dapat menggunakan akun hingga proses verifikasi admin dan dosen pembimbing
          selesai. Untuk pertanyaan, hubungi <span className="font-black text-foreground">akademik@univ.ac.id</span>.
        </p>
      </div>

      <SaveButton
        label={activeRequest ? "Pengajuan Sedang Diproses" : "Ajukan Pengunduran Diri"}
        onClick={() => !activeRequest && setIsModalOpen(true)}
        danger
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
          <div className="bg-white w-full max-w-[440px] max-h-[calc(100vh-2rem)] rounded-[20px] shadow-2xl overflow-hidden flex flex-col">
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
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setConfirmed(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors mt-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-4 md:px-6 py-5 overflow-y-auto flex flex-col gap-4">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                Pengajuan pengunduran diri Anda akan dikirimkan ke <span className="font-black">admin</span> terlebih
                dahulu untuk diverifikasi. Jika diteruskan, permintaan ini akan dikirim ke{" "}
                <span className="font-black">{advisorName}</span> sebagai dosen pembimbing untuk keputusan akhir.
              </p>

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
                  Saya memahami konsekuensinya dan menyatakan bahwa keputusan ini diambil atas kemauan sendiri tanpa paksaan
                  dari pihak manapun.
                </span>
              </label>
            </div>

            <div className="px-4 md:px-6 py-4 border-t border-border bg-slate-50/50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setConfirmed(false);
                }}
                className="px-5 py-2.5 rounded-[12px] text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                disabled={!confirmed || submitting}
                onClick={submitWithdrawalRequest}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-red-500/20"
              >
                <LogOut size={15} /> {submitting ? "Mengirim..." : "Ya, Kirim ke Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; danger?: boolean }[] = [
  { id: "profil", label: "Profil & Foto", icon: <User size={18} /> },
  { id: "akun", label: "Informasi Akun", icon: <Info size={18} /> },
  { id: "password", label: "Ganti Password", icon: <Lock size={18} /> },
  { id: "notifikasi", label: "Notifikasi", icon: <Bell size={18} /> },
  { id: "pengunduran", label: "Pengunduran Diri", icon: <LogOut size={18} />, danger: true },
];

export default function Settings() {
  const user = getStoredUser();

  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [miniName, setMiniName] = useState(user?.name || "Pengguna");
  const [miniNim, setMiniNim] = useState("-");
  const [miniPhotoUrl, setMiniPhotoUrl] = useState(user?.photoUrl || user?.photo_url || "");

  React.useEffect(() => {
    const loadMini = async () => {
      if (!user?.id) return;

      try {
        const profile = await apiGet<any>(`/profile/${encodeURIComponent(user.id)}`);
        setMiniName(profile?.name || user?.name || "Pengguna");
        setMiniNim(profile?.nim || "-");
        setMiniPhotoUrl(profile?.photoUrl || profile?.photo_url || user?.photoUrl || user?.photo_url || "");
      } catch {
        // Ignore mini profile load error.
      }
    };

    void loadMini();
  }, [user?.id]);

  return (
    <Layout title="Pengaturan">
      <div className="w-full max-w-[1060px] mx-auto flex flex-col gap-5 md:gap-6">
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Akun</p>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Pengaturan</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-stretch lg:items-start">
          <aside className="w-full lg:w-[220px] shrink-0 bg-white border border-border rounded-[18px] p-2 shadow-sm lg:sticky lg:top-0">
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {TAB_CONFIG.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 lg:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] text-sm font-bold transition-all text-left ${
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

            <div className="mt-3 pt-3 border-t border-border px-3 py-2 hidden lg:flex items-center gap-3">
              <ProfileAvatar
                name={miniName}
                photoUrl={miniPhotoUrl}
                className="size-8"
                fallbackClassName="bg-gradient-to-br from-[#6C47FF] to-[#9E8BFF] text-white text-[11px] font-black"
              />
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-black text-foreground truncate">{miniName}</p>
                <p className="text-[10px] font-medium text-muted-foreground truncate">{miniNim}</p>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0 bg-white border border-border rounded-[18px] p-4 sm:p-6 lg:p-8 shadow-sm">
            {activeTab === "profil" && (
              <TabProfil
                onProfileUpdated={(profile) => {
                  if (profile.name) setMiniName(profile.name);
                  setMiniPhotoUrl(profile.photoUrl || "");
                }}
              />
            )}
            {activeTab === "akun" && <TabAkunDynamic />}
            {activeTab === "password" && <TabPassword />}
            {activeTab === "notifikasi" && <TabNotifikasi />}
            {activeTab === "pengunduran" && <TabPengunduran />}
          </main>
        </div>
      </div>
    </Layout>
  );
}
