Revisi bagian operator :
- untuk page keanggotaan riset, tolong gabungkan saja dengan database riset. pada page tersebut tolong tambahkan fitur untuk menambahkan role pada mahasiswa nya juga dan pemberian akses control progress board pada mahasiswa yang terpilih
- tambahkan page untuk control progress board 
- tolong tata ulang Kembali dashboard operator agar terlihat lebih rapi, kemudian jika perlu tambahkan juga section yang lainnya. hapus card yang tidak ada sangkut paut nya di dashboard, seperti card penyimpanan, uptime system, dan backup terakhir. tambahkan saja card berdasarkan page yang ada
- disini saya ingin alur pengunduran diri dilakukan dengan cara konfirmasi melalui kedua pihak, oleh operator dan dosen. alur ini pertama akan di terima permintaan pengunduran diri oleh operator, kemudian operator menyampaikan ke dosen ketua nya
- pada setting, bagian notifikasi, tambahkan pengaturan untuk mengatur peringatan pengisian logbook, maksud nya kita bisa mengatur Waktu untuk peringatan logbook.
- di dashboard, tambahkan informasi mahasiswa yang belum mengisi logbook di hari kemaren, kemudian siapa saja yang tidak hadir


revisi untuk keseluruhan page porgress board : untuk edit progress board tolong hanya dilakukan oleh operator, ketua dosen dan mahasiswa terpilih. disini operator dan dosen bisa memilih mahasiswa mana yang dapat mengatur progress board tersebut. jadi secara umum mahasiswa biasa hanya dapat menambah card dan mengerjakan card yang tertera di progress board

revisi untuk alur mahasiswa, disini mahasiswa terbagi menjadi 2, yaitu mahasiswa riset dan magang, aturan khusus untuk mahasiswa riset yaitu selama seminggu harus ada spend Waktu di tempat selama 4 sampai 6 jam. jadi tolong buatkan alur seperti itu dan untuk operator berikan akses untuk mengatur Waktu yang harus tempuh untuk seorang mahasiswa riset selama seminggu. di dashboard operator juga tambahkan informasi mengenai mahasiswa riset yang tidak memenuhi aturan tersebut. untuk mahasiswa magang. mereka harus masuk dengan Waktu sekitar 9 jam (tambahkan saja fitur untuk mengatur Waktu magang oleh operator) selama senin hingga jumat, buatkan peringatan bagi mereka yang tidak sesuai dengan jam kerja, atau tambahkan suatu peringatan jika seorang mahasiswa magang melakukan check out tapi Waktu check out masih kurang dari Waktu yang sudah di tentukan.

kemudian sekarang buatkan juga untuk role dosen, berikut adalah page yang harus di buat

1.  Dashboard Dosen

Design a lecturer dashboard. Sidebar shows "Dosen Ketua Riset" role chip.
Title "Dashboard Dosen".

Top: 4 stat cards — Riset Dipimpin (blue, 2), Mahasiswa Aktif (green, 12), 
Logbook Pending Review (amber, 5), Pengajuan Cuti Menunggu (red, 2).

Layout 7-5 split:
Left:
- "Logbook Perlu Direview" table: student avatar+name, research, entry date, 
  entry title, "Lihat" button each row. Click opens float detail.
- "Pengajuan Cuti Mahasiswa" card: pending list with Setujui/Tolak per row.

Right:
- "Riset Saya" — 2 research cards with progress bars + "Lihat Board" link
- "Progress Tim" mini board summary — column counts (To Do, Doing, Review, Done) 
  as colored number chips
- Upcoming deadlines list

2. Riset Saya (Dosen)

Design a "my research" page for a lecturer.
Title "Riset yang Dipimpin".
2 research cards (stacked, full width) — same structure as student version but 
shows FULL team (dosen + all mahasiswa) and more control:
Card header: gradient purple band, research title, status badge, edit icon.
Body: info grid (period, partner, funding, category), full team list 
with role assignments, overall progress bar, milestone list.
"Lihat Progress Board →" button, "Kelola Tim →" button per card.

Click → float panel: full details, member management (add/remove), 
research documents, meeting notes section.

3. Review Logbook (Dosen)

Design a logbook review page for a lecturer. 2-panel layout (same as operator view 
but with commenting ability).
Left panel: student list with research filter. Each student item: 
avatar, name, research badge, unreviewed count indicator (red dot/number).

Right panel (when student selected):
Student info header. Logbook entry list (read-only view).
Click entry → float detail window:
Full entry content (deskripsi, output, kendala), attachment downloads.
"Komentar Dosen" section at bottom: existing comments, 
text area to add new comment, "Kirim Komentar" purple button.
(No approve/reject — view + comment only, per system design)

4. Progress Tim (Dosen)

Design a team progress board for a lecturer — same Scrum board layout 
as the student version but read-only with additional oversight features.
Same 3-column layout (nav sidebar + board + right metadata panel).

Differences from student board:
- No "Tambah Tugas" button (read-only for dosen)
- Top: research filter buttons (Riset A / Riset B)
- Right panel shows FULL team breakdown: each member's card count per column
- Kanban cards show assignee avatar prominently
- Click card → float detail (read-only Detail tab + Lampiran tab + Komentar tab 
  where dosen can add comments)
- "Lihat Logbook Terkait" button in card detail footer

5. Sertifikat Mahasiswa

Design a student certificate management page for a lecturer.
Title "Sertifikat Mahasiswa".
Info banner (blue tint): "Sertifikat diterbitkan oleh Operator berdasarkan 
permintaan Dosen Ketua."

Main: table of students in lecturer's research.
Columns: Avatar+Nama, Riset, Peran, Status Sertifikat, Tanggal Terbit, Aksi.
Status: Terbit=green, Diproses=amber, Belum Diminta=gray.
Aksi: "Lihat" button (for Terbit → preview modal) or 
"+ Minta Terbit" button (for Belum Diminta → request form modal).

Preview modal: certificate visual mockup (white card with logo, border decoration, 
student name large, research name, dates, supervisor signature area, QR code placeholder), 
"Unduh PDF" button.

Request modal: confirm student name + research + completion date + 
custom notes for operator, Submit button.

diatas adalah page page yang harus dibuat, tolong disesuaikan saja dengan page-page pada role mahasiswa dan operator yang sudah di rancang