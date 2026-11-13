# 10 — Implementasi Serah-Terima Prototipe PM (13 Nov 2026)

Dokumen ini mencatat apa yang sudah diterapkan dari `FlourishCare_Serah_Terima_Prototipe.md` ke kode produksi. Desain UI/UX tetap memakai komponen dan gaya yang sudah ada. Yang diambil dari prototipe hanya alur, aturan bisnis, dan format laporan.

## A. Langkah deploy (urutan wajib)

1. **Database:** buka Supabase → SQL Editor, lalu jalankan seluruh isi `supabase/migrations/0009_sync_live_and_pm_handover.sql`.
   - File ini aman dijalankan berulang.
   - Kolom yang dibuat manual di DB live (mis. `meeting_url`) disinkronkan oleh file ini.
2. **pg_cron (disarankan):** aktifkan di Database → Extensions → `pg_cron`, lalu jalankan ulang file 0009. Ada dua jadwal:
   - kedaluwarsa booking online yang belum dibayar (setiap menit);
   - hapus permanen Sampah laporan yang lebih dari 30 hari (setiap hari).

   Tanpa pg_cron, kedaluwarsa tetap jalan setiap kali halaman booking atau admin dibuka. Sampah lama bisa dihapus manual dari menu Sampah Laporan.
3. **Edge Functions:** jalankan perintah berikut.
   ```
   supabase functions deploy create_online_payment
   supabase functions deploy sumopod_webhook --no-verify-jwt
   supabase functions deploy create_staff_user
   supabase functions deploy manage_staff_user
   ```
4. **Secrets:** isi di Supabase → Edge Functions → Secrets.
   - `SUMOPOD_API_KEY`: **buat key baru**, karena key lama pernah tertulis di repo.
   - `SUMOPOD_WEBHOOK_TOKEN`: string acak panjang.
   - `SUMOPOD_WEBHOOK_SECRET`: opsional, bila Sumopod mengirim header tanda tangan.
   - `PUBLIC_APP_URL=https://book.flourishcare.id`
5. **URL webhook di dashboard Sumopod:** ganti menjadi
   `https://vtquhqdfyirccxdzmpyr.supabase.co/functions/v1/sumopod_webhook?token=<SUMOPOD_WEBHOOK_TOKEN>`.
   Tanpa `?token=`, webhook akan ditolak (401).
6. Push ke GitHub. Vercel akan deploy otomatis.

## B. Yang sudah diterapkan

| # PM | Fitur | Lokasi |
|---|---|---|
| 1 | Eyebrow beranda, didirikan 2026 | `Homepage.tsx`, `config/constants.ts` |
| 2 | Tim Kami: "Lulusan [kampus]", tombol **Lihat profil** (CV, izin, Instagram), **Booking dengan [nama]**, tampil/sembunyi, urutan, part-time | `Team.tsx`, Pengaturan → Kelola Psikolog → Edit |
| 3 | Info Kunjungan: WA dari pengaturan + teks formulir pendaftaran | `Booking.tsx` |
| 4 | Tombol WhatsApp melayang | `components/WhatsAppFab.tsx` |
| 6 | Formulir pendaftaran: pilihan layanan, TTL dd/mm/yyyy, nama ibu wajib, WA wajib, persetujuan, simpan otomatis | `AssessmentForm.tsx` |
| 7 | Jadwal per psikolog, batas 30 hari, hanya tanggal yang punya jadwal, libur/cuti, aturan "paling cepat booking" | `StepSchedule.tsx`, RPC `online_available_slots` |
| 8 | Visit: jarak km → transport (radius 10 km + per km), DP 50% | `StepPayment.tsx`, RPC `booking_quote`, Pengaturan → Tarif Homecare |
| 9 | Pasien lama: No. RM + nama depan (dicek di server, data tidak ditampilkan) | `StepProfile.tsx`, RPC `booking_find_patient` |
| 10–11 | QRIS dihitung server, batas 10 menit + kedaluwarsa otomatis, biaya admin, centang kebijakan, kuitansi PDF | trigger `online_booking_guard`, `create_online_payment`, `BookingAdminPanels.tsx` |
| 12 | Pembayaran di tempat (Tunai/Transfer), edit/hapus riwayat | Booking Online → Pembayaran |
| 14 | Login orang tua: No. RM + nama depan + kode akses, kunci 5× salah / 15 menit **di server** | `/progress`, RPC `parent_login` |
| 15 | Grafik perkembangan dari Laporan Evaluasi (Awal → Eval, L/P/B, % lulus) | `EvalProgressChart` |
| 16 | Penanda "laporan diperbarui", laporan ditarik/dihapus langsung hilang | RPC `parent_portal` (hanya `terbit`) |
| 17 | Format laporan: Sesi FRM-008, **Evaluasi** (BT 33 / SI 40 / TW 56 / OT 54 indikator), Asesmen FRM-005, **Konsultasi FRM-006**, **Psikotes modular** | `features/reports/*` |
| 18 | Tanda tangan per penulis + Penanggungjawab Klinik | Tanda Tangan & Akun, Pengaturan → Pengesahan |
| 19 | Terapis utama per layanan + pengganti bidang sama | Data Pasien → Kelola → Tim terapis; RLS `can_access_child` |
| 20 | Beranda "Hari ini" + sesi 14 hari tanpa laporan + tombol Tulis laporan | `TodayPanel.tsx` |
| 21 | Simpan otomatis (Pulihkan/Buang) + **Salin dari sesi lalu** | `autosave.tsx`, FRM-008 |
| 22 | Draft/Terbit, **Tarik**, **Hapus** (alasan wajib bila terbit), riwayat, Sampah 30 hari | trigger `report_lifecycle`, `ReportLifecycle.tsx` |
| 23 | Bank Narasi (psikolog & Super Admin) | menu Bank Narasi |
| 24 | Ganti kata sandi sendiri | Tanda Tangan & Akun |
| 25 | Admin Operasional (`admin_cabang`) vs Super Admin | menu & RLS |
| 26 | Akun staf hanya dibuat Super Admin, sandi sementara wajib diganti, reset, nonaktifkan | `create_staff_user`, `manage_staff_user` |
| 27 | Kalender minggu/bulan, filter terapis, deteksi bentrok | `CalendarView.tsx` |
| 28 | Pencarian global (anak, kode booking, No. RM, WA) | `SearchView.tsx` |
| 29 | Ubah jadwal, hapus booking/pasien/pendaftaran, buka kunci login | Booking Online, Data Pasien, Pendaftaran |
| 30–32 | Jadwal online/visit, tarif, kontak admin | Pengaturan |
| 33 | Backup bulanan (JSON + CSV) + pengingat tgl 25–5 | Pengaturan → Backup, Overview |
| 34 | Sampah Laporan (pulihkan / hapus permanen) | menu Sampah Laporan |

## C. Perbaikan keamanan

- **RLS:** sebelumnya semua akun yang login, termasuk orang tua yang daftar di book.*, bisa membaca semua data anak, orang tua, dan catatan. Sekarang akses dibatasi per peran, tim terapis, dan pemilik data.
- **Harga:** sebelumnya nominal booking dikirim dari browser sehingga bisa dimanipulasi. Sekarang dihitung trigger server.
- **Webhook Sumopod:** sekarang wajib token rahasia, nominal dicek, dan webhook idempoten.
- **RPC `assign_rm_to_registration`:** sebelumnya bisa dipanggil tanpa login (cek peran lolos untuk NULL). Sudah diperbaiki.
- **RPC `next_rm_number`:** sebelumnya bisa dipanggil anonim. Sekarang khusus admin.
- **Slot jadwal:** zona waktu WIB diperbaiki, slot tidak lagi "berputar" lewat tengah malam, dan bentrok dicek lintas online/homecare.
- **Akun nonaktif:** langsung kehilangan semua hak akses di database.

## D. Belum / sengaja tidak dikerjakan

- Halaman **Psikotes Klasikal Sekolah** (PM #5) beserta formulirnya.
- **Cek kode booking** publik (PM #13, P3).
- Notifikasi WhatsApp Business otomatis (opsional di dokumen PM).
- PDF dibuat lewat **Print / Simpan sebagai PDF** di browser (tata letak A4), bukan jsPDF.
- Logo baru (PM #37). Berkas `public/mitra-diani-logo.png` juga belum ada di repo.

## E. Checklist uji sebelum live (dari PM)

- [ ] Orang tua A tidak bisa melihat laporan/booking anak B (`/progress` dengan kode A).
- [ ] Laporan draft, ditarik, dan di Sampah tidak pernah terlihat orang tua.
- [ ] Salah kode 5× → terkunci 15 menit. Menghapus data browser tidak membuka kunci. Admin bisa "Buka kunci".
- [ ] QRIS: bayar berhasil; booking online tidak dibayar > 10 menit menjadi `Kadaluarsa` dan slotnya terbuka lagi; webhook ganda tidak menggandakan pembayaran.
- [ ] Tanggal > 30 hari, tanggal libur/cuti, dan slot terisi tidak bisa dipilih.
- [ ] Semua laporan tercetak rapi lewat Print/PDF (sesi, evaluasi, asesmen, konsultasi, psikotes lengkap & versi orang tua, kuitansi).
- [ ] Akun staf: dibuat → login pertama wajib ganti sandi → reset → nonaktifkan.
- [ ] Backup harian Supabase aktif; backup JSON manual bisa diunduh.
- [ ] Tampilan HP 360–414 px.
