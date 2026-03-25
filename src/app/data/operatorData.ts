// ─── Operator Single Source of Truth ─────────────────────────────────────────

export interface MahasiswaRecord {
  id: string; nim: string; name: string; initials: string; color: string;
  prodi: string; angkatan: string; email: string; phone: string;
  status: "Aktif" | "Cuti" | "Alumni" | "Mengundurkan Diri";
  tipe: "Riset" | "Magang";
  riset: string[]; bergabung: string; pembimbing: string;
  kehadiran: number; totalHari: number; logbookCount: number;
  jamMingguIni?: number;
  jamMingguTarget?: number;
}

export interface DosenRecord {
  id: string; nip: string; name: string; initials: string; color: string;
  email: string; departemen: string; jabatan: string;
  keahlian: string[]; risetDipimpin: number; risetDiikuti: number;
  status: "Aktif" | "Pensiun";
  bergabung: string; mahasiswaCount: number;
}

export interface LeaveRequestAll {
  id: string; mahasiswaId: string; mahasiswaNama: string;
  mahasiswaInitials: string; mahasiswaColor: string; nim: string;
  riset: string; periodeStart: string; periodeEnd: string;
  durasi: number; alasan: string; catatan: string;
  tanggalPengajuan: string; status: "Menunggu" | "Disetujui" | "Ditolak";
  reviewedBy?: string; reviewedAt?: string; reviewNote?: string;
}

export interface LetterRequestAll {
  id: string; mahasiswaId: string; mahasiswaNama: string;
  mahasiswaInitials: string; mahasiswaColor: string; nim: string;
  jenis: string; tanggal: string; tujuan: string;
  status: "Menunggu" | "Diproses" | "Siap Unduh";
  estimasi?: string; nomorSurat?: string;
}

export interface LogbookEntryAll {
  id: string; mahasiswaId: string; mahasiswaNama: string;
  mahasiswaInitials: string; mahasiswaColor: string;
  riset: string; date: string; fullDate: string;
  title: string; description: string; output: string;
  kendala?: string; hasAttachment: boolean;
}

export interface AuditLogEntry {
  id: string; timestamp: string; userName: string; userInitials: string;
  userColor: string; userRole: "Mahasiswa" | "Operator" | "Dosen";
  action: "Login" | "Create" | "Update" | "Delete" | "Approve" | "Export";
  target: string; ip: string; detail: string;
}

export interface ResearchFull {
  id: string; title: string; shortTitle: string; supervisor: string;
  supervisorInitials: string; period: string; mitra: string;
  status: "Aktif" | "Selesai" | "Ditangguhkan";
  progress: number; mahasiswaCount: number; dosenCount: number;
  category: string; description: string; funding: string;
  milestones: { label: string; done: boolean; date: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────

export const mahasiswaData: MahasiswaRecord[] = [
  { id: "M001", nim: "2021012345", name: "Ilham Ramadhan", initials: "IR", color: "bg-[#8B6FFF] text-white", prodi: "S1 Teknik Informatika", angkatan: "2021", email: "ilham.ramadhan@student.ac.id", phone: "0812-3456-7890", status: "Aktif", tipe: "Riset", riset: ["Riset A", "Riset B"], bergabung: "Jan 2025", pembimbing: "Dr. Andi Kurniawan", kehadiran: 18, totalHari: 22, logbookCount: 26, jamMingguIni: 5, jamMingguTarget: 6 },
  { id: "M002", nim: "2021045678", name: "Rizky Pratama", initials: "RP", color: "bg-emerald-500 text-white", prodi: "S2 Informatika", angkatan: "2021", email: "rizky.pratama@student.ac.id", phone: "0813-5678-9012", status: "Aktif", tipe: "Riset", riset: ["Riset A"], bergabung: "Jan 2025", pembimbing: "Dr. Andi Kurniawan", kehadiran: 20, totalHari: 22, logbookCount: 18, jamMingguIni: 6, jamMingguTarget: 6 },
  { id: "M003", nim: "2022034567", name: "Dewi Anjani", initials: "DA", color: "bg-pink-500 text-white", prodi: "S1 Teknik Informatika", angkatan: "2022", email: "dewi.anjani@student.ac.id", phone: "0814-7890-1234", status: "Aktif", tipe: "Riset", riset: ["Riset A"], bergabung: "Mar 2025", pembimbing: "Dr. Andi Kurniawan", kehadiran: 16, totalHari: 22, logbookCount: 12, jamMingguIni: 3, jamMingguTarget: 6 },
  { id: "M004", nim: "2021078901", name: "Fajar Nugroho", initials: "FN", color: "bg-teal-500 text-white", prodi: "S2 Informatika", angkatan: "2021", email: "fajar.nugroho@student.ac.id", phone: "0815-2345-6789", status: "Aktif", tipe: "Magang", riset: ["Riset B"], bergabung: "Mar 2025", pembimbing: "Prof. Budi Santoso", kehadiran: 19, totalHari: 22, logbookCount: 15, jamMingguIni: 43, jamMingguTarget: 45 },
  { id: "M005", nim: "2020056789", name: "Sari Wulandari", initials: "SW", color: "bg-violet-500 text-white", prodi: "S1 Sistem Informasi", angkatan: "2020", email: "sari.wulandari@student.ac.id", phone: "0816-3456-7890", status: "Cuti", tipe: "Magang", riset: ["Riset C"], bergabung: "Jun 2024", pembimbing: "Dr. Hendra Gunawan", kehadiran: 0, totalHari: 22, logbookCount: 5, jamMingguIni: 0, jamMingguTarget: 45 },
  { id: "M006", nim: "2019034521", name: "Bagas Eko Putra", initials: "BE", color: "bg-blue-500 text-white", prodi: "S1 Teknik Informatika", angkatan: "2019", email: "bagas.eko@student.ac.id", phone: "0817-4567-8901", status: "Alumni", tipe: "Riset", riset: ["Riset A"], bergabung: "Jan 2023", pembimbing: "Dr. Sari Dewi", kehadiran: 22, totalHari: 22, logbookCount: 40, jamMingguIni: 0, jamMingguTarget: 6 },
  { id: "M007", nim: "2022098765", name: "Nur Fitria", initials: "NF", color: "bg-rose-500 text-white", prodi: "S1 Teknik Informatika", angkatan: "2022", email: "nur.fitria@student.ac.id", phone: "0818-5678-9012", status: "Aktif", tipe: "Magang", riset: ["Riset B", "Riset C"], bergabung: "Jun 2025", pembimbing: "Prof. Budi Santoso", kehadiran: 17, totalHari: 22, logbookCount: 9, jamMingguIni: 38, jamMingguTarget: 45 },
  { id: "M008", nim: "2021067890", name: "Dimas Aryanto", initials: "DI", color: "bg-amber-500 text-white", prodi: "S2 Informatika", angkatan: "2021", email: "dimas.aryanto@student.ac.id", phone: "0819-6789-0123", status: "Mengundurkan Diri", tipe: "Riset", riset: [], bergabung: "Jan 2025", pembimbing: "Dr. Hendra Gunawan", kehadiran: 3, totalHari: 22, logbookCount: 2, jamMingguIni: 0, jamMingguTarget: 6 },
];

export const dosenData: DosenRecord[] = [
  { id: "D001", nip: "197801012005011001", name: "Dr. Andi Kurniawan", initials: "AK", color: "bg-blue-500 text-white", email: "andi.kurniawan@ac.id", departemen: "Teknik Informatika", jabatan: "Lektor Kepala", keahlian: ["Machine Learning", "IoT", "Data Science"], risetDipimpin: 1, risetDiikuti: 2, status: "Aktif", bergabung: "Agust 2010", mahasiswaCount: 5 },
  { id: "D002", nip: "196905212000031002", name: "Prof. Budi Santoso", initials: "BS", color: "bg-blue-700 text-white", email: "budi.santoso@ac.id", departemen: "Teknik Informatika", jabatan: "Guru Besar", keahlian: ["IoT", "Embedded Systems", "Wireless Network"], risetDipimpin: 1, risetDiikuti: 1, status: "Aktif", bergabung: "Mar 1999", mahasiswaCount: 3 },
  { id: "D003", nip: "198003152006042001", name: "Dr. Sari Dewi, M.T.", initials: "SD", color: "bg-amber-500 text-white", email: "sari.dewi@ac.id", departemen: "Teknik Informatika", jabatan: "Lektor", keahlian: ["Deep Learning", "Computer Vision", "NLP"], risetDipimpin: 0, risetDiikuti: 2, status: "Aktif", bergabung: "Feb 2006", mahasiswaCount: 4 },
  { id: "D004", nip: "197512112003121004", name: "Dr. Hendra Gunawan", initials: "HG", color: "bg-indigo-500 text-white", email: "hendra.gunawan@ac.id", departemen: "Sistem Informasi", jabatan: "Lektor Kepala", keahlian: ["Blockchain", "Cloud Computing", "Database"], risetDipimpin: 1, risetDiikuti: 1, status: "Aktif", bergabung: "Des 2003", mahasiswaCount: 3 },
  { id: "D005", nip: "196801201997021001", name: "Prof. Cahya Wijaya", initials: "CW", color: "bg-purple-600 text-white", email: "cahya.wijaya@ac.id", departemen: "Matematika", jabatan: "Guru Besar", keahlian: ["Statistika", "Data Mining", "Algoritma"], risetDipimpin: 0, risetDiikuti: 1, status: "Pensiun", bergabung: "Feb 1997", mahasiswaCount: 0 },
];

export const allLeaveRequests: LeaveRequestAll[] = [
  { id: "L001", mahasiswaId: "M001", mahasiswaNama: "Ilham Ramadhan", mahasiswaInitials: "IR", mahasiswaColor: "bg-[#8B6FFF] text-white", nim: "2021012345", riset: "Riset A", periodeStart: "17 Mar 2026", periodeEnd: "18 Mar 2026", durasi: 2, alasan: "Keperluan keluarga – menghadiri pernikahan saudara di luar kota.", catatan: "", tanggalPengajuan: "10 Mar 2026", status: "Disetujui", reviewedBy: "Admin Operator", reviewedAt: "11 Mar 2026", reviewNote: "Disetujui. Pastikan absensi pengganti sudah diatur." },
  { id: "L002", mahasiswaId: "M001", mahasiswaNama: "Ilham Ramadhan", mahasiswaInitials: "IR", mahasiswaColor: "bg-[#8B6FFF] text-white", nim: "2021012345", riset: "Riset A", periodeStart: "5 Mar 2026", periodeEnd: "5 Mar 2026", durasi: 1, alasan: "Sakit — demam dan perlu istirahat penuh.", catatan: "", tanggalPengajuan: "01 Mar 2026", status: "Ditolak", reviewedBy: "Admin Operator", reviewedAt: "02 Mar 2026", reviewNote: "Ditolak karena tidak menyertakan surat dokter." },
  { id: "L003", mahasiswaId: "M001", mahasiswaNama: "Ilham Ramadhan", mahasiswaInitials: "IR", mahasiswaColor: "bg-[#8B6FFF] text-white", nim: "2021012345", riset: "Riset B", periodeStart: "25 Mar 2026", periodeEnd: "26 Mar 2026", durasi: 2, alasan: "Mengikuti seminar nasional di Jakarta.", catatan: "Sudah konfirmasi dengan ketua riset.", tanggalPengajuan: "15 Mar 2026", status: "Menunggu" },
  { id: "L004", mahasiswaId: "M002", mahasiswaNama: "Rizky Pratama", mahasiswaInitials: "RP", mahasiswaColor: "bg-emerald-500 text-white", nim: "2021045678", riset: "Riset A", periodeStart: "20 Mar 2026", periodeEnd: "20 Mar 2026", durasi: 1, alasan: "Urusan administrasi kampus — perpanjangan KRS.", catatan: "", tanggalPengajuan: "16 Mar 2026", status: "Menunggu" },
  { id: "L005", mahasiswaId: "M004", mahasiswaNama: "Fajar Nugroho", mahasiswaInitials: "FN", mahasiswaColor: "bg-teal-500 text-white", nim: "2021078901", riset: "Riset B", periodeStart: "22 Mar 2026", periodeEnd: "23 Mar 2026", durasi: 2, alasan: "Seminar internasional IEEE di Surabaya.", catatan: "Membawa surat undangan dari panitia.", tanggalPengajuan: "14 Mar 2026", status: "Menunggu" },
];

export const allLetterRequests: LetterRequestAll[] = [
  { id: "S001", mahasiswaId: "M001", mahasiswaNama: "Ilham Ramadhan", mahasiswaInitials: "IR", mahasiswaColor: "bg-[#8B6FFF] text-white", nim: "2021012345", jenis: "Surat Keterangan Aktif Magang", tanggal: "10 Mar 2026", tujuan: "Keperluan administrasi kampus – verifikasi status magang aktif semester genap.", status: "Siap Unduh", nomorSurat: "SK/2026/03/0142" },
  { id: "S002", mahasiswaId: "M001", mahasiswaNama: "Ilham Ramadhan", mahasiswaInitials: "IR", mahasiswaColor: "bg-[#8B6FFF] text-white", nim: "2021012345", jenis: "Surat Pengantar Penelitian", tanggal: "05 Mar 2026", tujuan: "Permohonan izin penelitian di laboratorium mitra DIKTI.", status: "Diproses", estimasi: "20 Mar 2026" },
  { id: "S003", mahasiswaId: "M002", mahasiswaNama: "Rizky Pratama", mahasiswaInitials: "RP", mahasiswaColor: "bg-emerald-500 text-white", nim: "2021045678", jenis: "Surat Rekomendasi Dosen Pembimbing", tanggal: "12 Mar 2026", tujuan: "Pendaftaran program beasiswa internasional LPDP 2026.", status: "Menunggu" },
  { id: "S004", mahasiswaId: "M003", mahasiswaNama: "Dewi Anjani", mahasiswaInitials: "DA", mahasiswaColor: "bg-pink-500 text-white", nim: "2022034567", jenis: "Surat Keterangan Penelitian", tanggal: "08 Mar 2026", tujuan: "Pengajuan jurnal konferensi internasional ICACSIS 2026.", status: "Siap Unduh", nomorSurat: "SK/2026/03/0138" },
  { id: "S005", mahasiswaId: "M004", mahasiswaNama: "Fajar Nugroho", mahasiswaInitials: "FN", mahasiswaColor: "bg-teal-500 text-white", nim: "2021078901", jenis: "Surat Keterangan Aktif Magang", tanggal: "15 Mar 2026", tujuan: "Keperluan perpanjangan kontrak magang di PT. Teknindo.", status: "Menunggu" },
  { id: "S006", mahasiswaId: "M007", mahasiswaNama: "Nur Fitria", mahasiswaInitials: "NF", mahasiswaColor: "bg-rose-500 text-white", nim: "2022098765", jenis: "Surat Pengantar Kerja Praktek", tanggal: "14 Mar 2026", tujuan: "Kerja praktek di Balai Riset Teknologi Informasi Nasional.", status: "Diproses", estimasi: "19 Mar 2026" },
];

export const allLogbookEntries: LogbookEntryAll[] = [
  { id: "LB001", mahasiswaId: "M001", mahasiswaNama: "Ilham Ramadhan", mahasiswaInitials: "IR", mahasiswaColor: "bg-[#8B6FFF] text-white", riset: "Riset A", date: "18 Mar", fullDate: "Rabu, 18 Mar 2026", title: "Menyelesaikan pengujian modul sensor suhu dari node ke-8", description: "Dilakukan pengujian end-to-end modul sensor suhu dari node ke-8 dalam jaringan IoT. Pengujian mencakup validasi akurasi pembacaan data, latensi transmisi, dan stabilitas koneksi MQTT broker.", output: "Laporan pengujian modul node ke-8 selesai disusun dan didokumentasikan.", kendala: "Sempat ada interferensi sinyal WiFi, sudah diselesaikan dengan mengganti channel frekuensi.", hasAttachment: true },
  { id: "LB002", mahasiswaId: "M001", mahasiswaNama: "Ilham Ramadhan", mahasiswaInitials: "IR", mahasiswaColor: "bg-[#8B6FFF] text-white", riset: "Riset B", date: "17 Mar", fullDate: "Selasa, 17 Mar 2026", title: "Bimbingan Bab 3 dengan Dr. Andi Kurniawan", description: "Melakukan sesi bimbingan online via Zoom untuk membahas revisi Bab 3 tesis — bagian metodologi pengumpulan data dan desain eksperimen.", output: "Daftar revisi Bab 3 diterima, target selesai H+5.", hasAttachment: false },
  { id: "LB003", mahasiswaId: "M002", mahasiswaNama: "Rizky Pratama", mahasiswaInitials: "RP", mahasiswaColor: "bg-emerald-500 text-white", riset: "Riset A", date: "18 Mar", fullDate: "Rabu, 18 Mar 2026", title: "Implementasi fungsi dropout pada arsitektur LSTM", description: "Menambahkan lapisan dropout (rate 0.25) pada model LSTM setelah diskusi dengan Dr. Andi untuk mencegah overfitting pada dataset pelatihan.", output: "Akurasi validasi meningkat dari 87.3% ke 89.1%.", hasAttachment: true },
  { id: "LB004", mahasiswaId: "M003", mahasiswaNama: "Dewi Anjani", mahasiswaInitials: "DA", mahasiswaColor: "bg-pink-500 text-white", riset: "Riset A", date: "17 Mar", fullDate: "Selasa, 17 Mar 2026", title: "Review literatur metode ensemble learning untuk prediksi curah hujan", description: "Membaca dan merangkum 5 paper terbaru (2023-2025) tentang penggunaan metode ensemble berbasis boosting untuk prediksi curah hujan.", output: "Rangkuman literatur 3 halaman selesai.", hasAttachment: false },
  { id: "LB005", mahasiswaId: "M004", mahasiswaNama: "Fajar Nugroho", mahasiswaInitials: "FN", mahasiswaColor: "bg-teal-500 text-white", riset: "Riset B", date: "18 Mar", fullDate: "Rabu, 18 Mar 2026", title: "Konfigurasi MQTT broker untuk 15 node sensor aktif", description: "Melakukan konfigurasi dan uji koneksi MQTT broker Mosquitto untuk jaringan 15 node sensor yang tersebar di area pabrik mitra.", output: "Semua 15 node berhasil terhubung dengan latency rata-rata 12ms.", kendala: "Node ke-7 mengalami packet loss, sudah diperbaiki dengan update firmware.", hasAttachment: true },
  { id: "LB006", mahasiswaId: "M007", mahasiswaNama: "Nur Fitria", mahasiswaInitials: "NF", mahasiswaColor: "bg-rose-500 text-white", riset: "Riset B", date: "16 Mar", fullDate: "Senin, 16 Mar 2026", title: "Desain antarmuka dashboard monitoring real-time", description: "Membuat wireframe dan prototype dashboard monitoring dengan React + Recharts untuk visualisasi data sensor secara real-time.", output: "Prototype dashboard v0.1 selesai, siap untuk review.", hasAttachment: true },
];

export const auditLogEntries: AuditLogEntry[] = [
  { id: "AL001", timestamp: "2026-03-18 09:15:23", userName: "Admin Operator", userInitials: "AO", userColor: "bg-amber-500 text-white", userRole: "Operator", action: "Approve", target: "Cuti L003 – Ilham Ramadhan", ip: "192.168.1.10", detail: '{"action":"approve_leave","leave_id":"L003","student":"M001","duration":"2 days","notes":"Disetujui untuk seminar nasional"}' },
  { id: "AL002", timestamp: "2026-03-18 08:45:11", userName: "Ilham Ramadhan", userInitials: "IR", userColor: "bg-[#8B6FFF] text-white", userRole: "Mahasiswa", action: "Create", target: "Logbook LB001", ip: "192.168.2.45", detail: '{"action":"create_logbook","entry_id":"LB001","riset":"Riset A","title":"Pengujian modul sensor node ke-8"}' },
  { id: "AL003", timestamp: "2026-03-18 08:30:00", userName: "Ilham Ramadhan", userInitials: "IR", userColor: "bg-[#8B6FFF] text-white", userRole: "Mahasiswa", action: "Login", target: "Sesi Login", ip: "192.168.2.45", detail: '{"action":"login","user_id":"M001","role":"mahasiswa","device":"Chrome/Win11"}' },
  { id: "AL004", timestamp: "2026-03-18 08:00:05", userName: "Admin Operator", userInitials: "AO", userColor: "bg-amber-500 text-white", userRole: "Operator", action: "Login", target: "Sesi Login", ip: "192.168.1.10", detail: '{"action":"login","user_id":"OP001","role":"operator","device":"Chrome/macOS"}' },
  { id: "AL005", timestamp: "2026-03-17 16:22:44", userName: "Admin Operator", userInitials: "AO", userColor: "bg-amber-500 text-white", userRole: "Operator", action: "Export", target: "Laporan Kehadiran Mar 2026", ip: "192.168.1.10", detail: '{"action":"export","type":"attendance","format":"XLSX","period":"Mar 2026","rows":154}' },
  { id: "AL006", timestamp: "2026-03-17 15:10:33", userName: "Dr. Andi Kurniawan", userInitials: "AK", userColor: "bg-blue-500 text-white", userRole: "Dosen", action: "Update", target: "Riset A – Milestone Pengujian", ip: "192.168.3.22", detail: '{"action":"update_milestone","riset":"A","milestone":"Implementasi Model","old_status":false,"new_status":false,"note":"Dipercepat jadwalnya"}' },
  { id: "AL007", timestamp: "2026-03-17 14:05:18", userName: "Rizky Pratama", userInitials: "RP", userColor: "bg-emerald-500 text-white", userRole: "Mahasiswa", action: "Create", target: "Logbook LB003", ip: "192.168.2.67", detail: '{"action":"create_logbook","entry_id":"LB003","riset":"Riset A","title":"Implementasi dropout LSTM"}' },
  { id: "AL008", timestamp: "2026-03-17 11:30:00", userName: "Admin Operator", userInitials: "AO", userColor: "bg-amber-500 text-white", userRole: "Operator", action: "Update", target: "Profil M003 – Dewi Anjani", ip: "192.168.1.10", detail: '{"action":"update_student","student_id":"M003","fields":["phone","email"],"changed_by":"OP001"}' },
  { id: "AL009", timestamp: "2026-03-16 10:00:00", userName: "Admin Operator", userInitials: "AO", userColor: "bg-amber-500 text-white", userRole: "Operator", action: "Create", target: "Mahasiswa M007 – Nur Fitria", ip: "192.168.1.10", detail: '{"action":"create_student","student_id":"M007","nim":"2022098765","prodi":"S1 TI"}' },
  { id: "AL010", timestamp: "2026-03-15 09:45:22", userName: "Admin Operator", userInitials: "AO", userColor: "bg-amber-500 text-white", userRole: "Operator", action: "Delete", target: "Logbook LB999 (duplikat)", ip: "192.168.1.10", detail: '{"action":"delete_logbook","entry_id":"LB999","reason":"Duplicate entry","deleted_by":"OP001"}' },
];

export const researchFullData: ResearchFull[] = [
  { id: "A", title: "Sistem Prediksi Curah Hujan Berbasis LSTM dengan Integrasi Data Sensor IoT Real-Time", shortTitle: "Riset A – Prediksi Curah Hujan LSTM", supervisor: "Dr. Andi Kurniawan", supervisorInitials: "AK", period: "Jan 2025 – Des 2026", mitra: "BMKG & DIKTI Hibah Penelitian", status: "Aktif", progress: 65, mahasiswaCount: 3, dosenCount: 2, category: "Kecerdasan Buatan", description: "Penelitian ini mengembangkan sistem prediksi curah hujan akurat menggunakan model LSTM yang diintegrasikan dengan data real-time dari jaringan sensor IoT terdistribusi.", funding: "DIKTI Hibah Penelitian 2025 – Rp 180.000.000", milestones: [{ label: "Studi Literatur", done: true, date: "Mar 2025" }, { label: "Pengumpulan Data", done: true, date: "Jun 2025" }, { label: "Preprocessing", done: true, date: "Sep 2025" }, { label: "Implementasi Model", done: false, date: "Mar 2026" }, { label: "Pengujian", done: false, date: "Aug 2026" }, { label: "Publikasi", done: false, date: "Des 2026" }] },
  { id: "B", title: "Pengembangan Jaringan Sensor IoT Cerdas untuk Monitoring Lingkungan Industri", shortTitle: "Riset B – IoT Monitoring Lingkungan", supervisor: "Prof. Budi Santoso", supervisorInitials: "BS", period: "Mar 2025 – Feb 2027", mitra: "PT. Teknindo Nusantara", status: "Aktif", progress: 40, mahasiswaCount: 2, dosenCount: 2, category: "IoT & Embedded Systems", description: "Membangun jaringan sensor IoT cerdas untuk memantau parameter lingkungan industri (suhu, kelembaban, gas berbahaya) secara real-time.", funding: "Kerjasama Industri PT. Teknindo – Rp 250.000.000", milestones: [{ label: "Perencanaan", done: true, date: "Apr 2025" }, { label: "Analisis Kebutuhan", done: true, date: "Jun 2025" }, { label: "Desain Arsitektur", done: false, date: "Apr 2026" }, { label: "Prototipe", done: false, date: "Aug 2026" }, { label: "Uji Lapangan", done: false, date: "Nov 2026" }, { label: "Evaluasi", done: false, date: "Feb 2027" }] },
  { id: "C", title: "Implementasi Blockchain untuk Sistem Traceability Rantai Pasok Produk Pertanian", shortTitle: "Riset C – Blockchain Traceability", supervisor: "Dr. Hendra Gunawan", supervisorInitials: "HG", period: "Jun 2024 – Mei 2026", mitra: "Kementan RI", status: "Aktif", progress: 80, mahasiswaCount: 2, dosenCount: 1, category: "Blockchain & Distributed Systems", description: "Mengembangkan sistem traceability berbasis blockchain untuk meningkatkan transparansi dan kepercayaan dalam rantai pasok produk pertanian Indonesia.", funding: "Kementan RI Program Digitalisasi Pertanian – Rp 320.000.000", milestones: [{ label: "Riset Awal", done: true, date: "Jul 2024" }, { label: "Desain Sistem", done: true, date: "Oct 2024" }, { label: "Implementasi", done: true, date: "Jan 2025" }, { label: "Integrasi", done: true, date: "Jun 2025" }, { label: "Pengujian", done: false, date: "Feb 2026" }, { label: "Deploy", done: false, date: "Mei 2026" }] },
];

// ─── Membership Data ──────────────────────────────────────────────────────────
export const membershipData: Record<string, { memberId: string; nama: string; initials: string; color: string; tipe: "Mahasiswa" | "Dosen"; peran: string; bergabung: string; status: "Aktif" | "Nonaktif" }[]> = {
  A: [
    { memberId: "M001", nama: "Ilham Ramadhan",    initials: "IR", color: "bg-[#8B6FFF] text-white",  tipe: "Mahasiswa", peran: "Anggota Inti",       bergabung: "Jan 2025", status: "Aktif" },
    { memberId: "M002", nama: "Rizky Pratama",      initials: "RP", color: "bg-emerald-500 text-white", tipe: "Mahasiswa", peran: "Backend Dev",        bergabung: "Jan 2025", status: "Aktif" },
    { memberId: "M003", nama: "Dewi Anjani",        initials: "DA", color: "bg-pink-500 text-white",    tipe: "Mahasiswa", peran: "Data Analyst",       bergabung: "Mar 2025", status: "Aktif" },
    { memberId: "D001", nama: "Dr. Andi Kurniawan", initials: "AK", color: "bg-blue-500 text-white",    tipe: "Dosen",     peran: "Ketua",              bergabung: "Jan 2025", status: "Aktif" },
    { memberId: "D003", nama: "Dr. Sari Dewi",      initials: "SD", color: "bg-amber-500 text-white",   tipe: "Dosen",     peran: "Pembimbing",         bergabung: "Jan 2025", status: "Aktif" },
  ],
  B: [
    { memberId: "M001", nama: "Ilham Ramadhan",     initials: "IR", color: "bg-[#8B6FFF] text-white",  tipe: "Mahasiswa", peran: "Asisten Peneliti",   bergabung: "Mar 2025", status: "Aktif" },
    { memberId: "M004", nama: "Fajar Nugroho",      initials: "FN", color: "bg-teal-500 text-white",    tipe: "Mahasiswa", peran: "Hardware Dev",       bergabung: "Mar 2025", status: "Aktif" },
    { memberId: "M007", nama: "Nur Fitria",         initials: "NF", color: "bg-rose-500 text-white",    tipe: "Mahasiswa", peran: "Frontend Dev",       bergabung: "Jun 2025", status: "Aktif" },
    { memberId: "D002", nama: "Prof. Budi Santoso", initials: "BS", color: "bg-blue-700 text-white",    tipe: "Dosen",     peran: "Ketua",              bergabung: "Mar 2025", status: "Aktif" },
    { memberId: "D004", nama: "Dr. Hendra Gunawan", initials: "HG", color: "bg-indigo-500 text-white",  tipe: "Dosen",     peran: "Pembimbing",         bergabung: "Mar 2025", status: "Aktif" },
  ],
  C: [
    { memberId: "M005", nama: "Sari Wulandari",     initials: "SW", color: "bg-violet-500 text-white",  tipe: "Mahasiswa", peran: "Fullstack Dev",      bergabung: "Jun 2024", status: "Nonaktif" },
    { memberId: "M007", nama: "Nur Fitria",         initials: "NF", color: "bg-rose-500 text-white",    tipe: "Mahasiswa", peran: "Anggota Inti",       bergabung: "Jun 2024", status: "Aktif" },
    { memberId: "D004", nama: "Dr. Hendra Gunawan", initials: "HG", color: "bg-indigo-500 text-white",  tipe: "Dosen",     peran: "Ketua",              bergabung: "Jun 2024", status: "Aktif" },
  ],
};

// ─── Board Access Control ─────────────────────────────────────────────────────
export const boardAccessControl: Record<string, string[]> = {
  A: ["M002"],
  B: ["M004"],
  C: [],
};

// ─── Resignation Requests ─────────────────────────────────────────────────────
export interface ResignationRequest {
  id: string; mahasiswaId: string; mahasiswaNama: string;
  mahasiswaInitials: string; mahasiswaColor: string; nim: string;
  ketuaDosen: string; ketuaDosenInitials: string; ketuaDosenColor: string;
  alasan: string; tanggalPengajuan: string;
  statusOperator: "Menunggu" | "Diteruskan" | "Ditolak";
  statusDosen: "Menunggu" | "Dikonfirmasi" | "Ditolak" | null;
  catatanOperator?: string; catatanDosen?: string;
  tanggalDiteruskan?: string; tanggalKonfirmasi?: string;
}

export const resignationRequests: ResignationRequest[] = [
  {
    id: "R001", mahasiswaId: "M008", mahasiswaNama: "Dimas Aryanto",
    mahasiswaInitials: "DI", mahasiswaColor: "bg-amber-500 text-white",
    nim: "2021067890", ketuaDosen: "Dr. Hendra Gunawan", ketuaDosenInitials: "HG",
    ketuaDosenColor: "bg-indigo-500 text-white",
    alasan: "Mendapat tawaran pekerjaan tetap di luar kota yang tidak memungkinkan melanjutkan program.",
    tanggalPengajuan: "10 Mar 2026",
    statusOperator: "Diteruskan", statusDosen: "Menunggu",
    catatanOperator: "Permintaan sudah diverifikasi. Diteruskan ke Ketua Riset.",
    tanggalDiteruskan: "11 Mar 2026",
  },
];

// ─── Dashboard alerts ─────────────────────────────────────────────────────────
export const notIsiLogbookKemarin = ["M003", "M005", "M007"];
export const tidakHadirHariIni    = ["M003", "M005", "M008"];