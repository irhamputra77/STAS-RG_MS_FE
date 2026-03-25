// ─── Shared Research Data ────────────────────────────────────────────────────
// Single source of truth untuk MyResearch dan ScrumBoard.
// Semua perubahan data cukup dilakukan di sini.

export interface Milestone {
  label: string;
  done: boolean;
}

export interface TeamMember {
  initials: string;
  name: string;
  role: string;
  type: "mahasiswa" | "dosen";
  color: string;
}

export interface ResearchProject {
  id: string;
  shortTitle: string;
  fullTitle: string;
  period: string;
  status: "Aktif" | "Selesai";
  repositori: string;
  mitra: string;
  // Ketua riset (dari daftar teamMembers)
  ketuaInitials: string;
  // Peran user yang login
  peranSaya: string;
  peranColor: string;
  // Progress
  progress: number;
  tugasSelesai: number;
  tugasTotal: number;
  progressColor: string;          // Tailwind bg class
  progressColorHex: string;       // Hex for inline styles if needed
  // Milestone aktif (label dari milestones yang !done pertama)
  milestones: Milestone[];
  // Anggota tim
  teamMembers: TeamMember[];
}

export const researchProjects: ResearchProject[] = [
  {
    id: "A",
    shortTitle: "Riset A – Prediksi Curah Hujan LSTM",
    fullTitle:
      "Sistem Prediksi Curah Hujan Berbasis LSTM dengan Integrasi Data Sensor IoT Real-Time",
    period: "Jan 2025 – Des 2026",
    status: "Aktif",
    repositori: "github.com/riset-lstm-iot",
    mitra: "BMKG & DIKTI Hibah Penelitian",
    ketuaInitials: "AK",
    peranSaya: "Anggota Inti",
    peranColor: "bg-[#F8F5FF] text-[#6C47FF] border border-[#D6CAFF]",
    progress: 65,
    tugasSelesai: 13,
    tugasTotal: 20,
    progressColor: "bg-blue-500",
    progressColorHex: "#3B82F6",
    milestones: [
      { label: "Studi Literatur",   done: true  },
      { label: "Pengumpulan Data",  done: true  },
      { label: "Preprocessing",     done: true  },
      { label: "Implementasi Model",done: false },
      { label: "Pengujian",         done: false },
      { label: "Publikasi",         done: false },
    ],
    teamMembers: [
      { initials: "IR", name: "Ilham Ramadhan",      role: "Anggota Inti · Mahasiswa S1", type: "mahasiswa", color: "bg-[#8B6FFF] text-white"  },
      { initials: "RP", name: "Rizky Pratama",        role: "Mahasiswa S2",                 type: "mahasiswa", color: "bg-emerald-500 text-white" },
      { initials: "DA", name: "Dewi Anjani",          role: "Mahasiswa S1",                 type: "mahasiswa", color: "bg-pink-500 text-white"    },
      { initials: "AK", name: "Dr. Andi Kurniawan",  role: "Dosen · Ketua Riset",          type: "dosen",     color: "bg-blue-500 text-white"    },
      { initials: "SD", name: "Dr. Sari Dewi, M.T.", role: "Dosen · Pembimbing",           type: "dosen",     color: "bg-amber-500 text-white"   },
    ],
  },
  {
    id: "B",
    shortTitle: "Riset B – IoT Monitoring Lingkungan",
    fullTitle:
      "Pengembangan Jaringan Sensor IoT Cerdas untuk Monitoring Lingkungan Industri Skala Menengah",
    period: "Mar 2025 – Feb 2027",
    status: "Aktif",
    repositori: "github.com/iot-env-monitor",
    mitra: "PT. Teknindo Nusantara",
    ketuaInitials: "BS",
    peranSaya: "Asisten Peneliti",
    peranColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    progress: 40,
    tugasSelesai: 8,
    tugasTotal: 20,
    progressColor: "bg-emerald-500",
    progressColorHex: "#10B981",
    milestones: [
      { label: "Perencanaan",        done: true  },
      { label: "Analisis Kebutuhan", done: true  },
      { label: "Desain Arsitektur",  done: false },
      { label: "Prototipe",          done: false },
      { label: "Uji Lapangan",       done: false },
      { label: "Evaluasi",           done: false },
    ],
    teamMembers: [
      { initials: "IR", name: "Ilham Ramadhan",        role: "Asisten Peneliti · Mahasiswa S1", type: "mahasiswa", color: "bg-[#8B6FFF] text-white"  },
      { initials: "FN", name: "Fajar Nugroho",         role: "Mahasiswa S2",                    type: "mahasiswa", color: "bg-teal-500 text-white"    },
      { initials: "BS", name: "Prof. Budi Santoso",    role: "Dosen · Ketua Riset",             type: "dosen",     color: "bg-blue-600 text-white"    },
      { initials: "HG", name: "Dr. Hendra Gunawan",   role: "Dosen · Pembimbing",              type: "dosen",     color: "bg-indigo-500 text-white"  },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Milestone aktif = milestone !done pertama */
export function getActiveMilestone(project: ResearchProject): string {
  return project.milestones.find((m) => !m.done)?.label ?? "Selesai";
}

/** Cari member berdasarkan initials */
export function getMember(
  project: ResearchProject,
  initials: string
): TeamMember | undefined {
  return project.teamMembers.find((m) => m.initials === initials);
}

/** Ketua riset */
export function getKetua(project: ResearchProject): TeamMember | undefined {
  return getMember(project, project.ketuaInitials);
}

/** Anggota mahasiswa saja */
export function getMahasiswa(project: ResearchProject): TeamMember[] {
  return project.teamMembers.filter((m) => m.type === "mahasiswa");
}

/** Anggota dosen saja */
export function getDosen(project: ResearchProject): TeamMember[] {
  return project.teamMembers.filter((m) => m.type === "dosen");
}
