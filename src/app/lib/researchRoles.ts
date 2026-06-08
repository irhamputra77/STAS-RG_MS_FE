export const MAHASISWA_LEADER_ROLE = "Mahasiswa Ketua Riset";

export const MAHASISWA_RESEARCH_ROLES = [
  MAHASISWA_LEADER_ROLE,
  "Web Developer",
  "QA",
  "IoT",
  "Data Science",
  "Machine Learning",
  "Sosial Media",
  "Creative Content",
  "Anggota Inti",
  "Backend Dev",
  "Frontend Dev",
  "Hardware Dev",
  "Data Analyst",
  "Asisten Peneliti",
  "Fullstack Dev",
  "Anggota"
];

export const DOSEN_RESEARCH_ROLES = [
  "Ketua Riset",
  "Pembimbing",
  "Co-Investigator",
  "Anggota Dosen"
];

export function isMahasiswaMemberType(memberType?: string | null) {
  return String(memberType || "").toLowerCase() === "mahasiswa";
}

export function getResearchRoleOptions(memberType?: string | null) {
  return isMahasiswaMemberType(memberType) ? MAHASISWA_RESEARCH_ROLES : DOSEN_RESEARCH_ROLES;
}

export function normalizeResearchRoleForMemberType(peran: string, memberType?: string | null) {
  if (isMahasiswaMemberType(memberType)) {
    return DOSEN_RESEARCH_ROLES.includes(peran) ? "Anggota" : peran;
  }

  if (peran === MAHASISWA_LEADER_ROLE || MAHASISWA_RESEARCH_ROLES.includes(peran)) {
    return peran === "Pembimbing" ? peran : "Pembimbing";
  }

  return peran;
}
