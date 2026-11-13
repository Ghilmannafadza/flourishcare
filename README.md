# FlourishCare Web

Website resmi & dashboard internal FlourishCare.id — klinik tumbuh kembang anak di Jakarta Timur.

**Stack:** React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS v4 + Supabase (Auth + Postgres) + Vercel.

## 🚀 Setup

### 1. Install dependency

```bash
npm install
```

### 2. Buat file `.env`

Salin `.env.example` menjadi `.env` (atau `.env.local`) lalu isi:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

Nilai didapatkan di Supabase → **Project Settings → API**.

### 3. Setup database Supabase

Buka Supabase → **SQL Editor** dan jalankan berurutan:

1. `supabase/migrations/0001_initial_schema.sql` — membuat semua tabel + RLS.
2. `supabase/seed.sql` — data awal (cabang + 2 staff Achla & Rofanny).

### 4. Buat akun Super Admin

Di Supabase → **Authentication → Users → Add User** (email + password). Lalu di **SQL Editor**:

```sql
insert into profiles (id, full_name, role, branch_id, is_active)
values (
  '<paste user_id di atas>',
  'Nama Anda',
  'super_admin',
  '00000000-0000-0000-0000-000000000001',
  true
);
```

### 5. Jalankan dev server

```bash
npm run dev
```

Buka `http://localhost:3000`.

## 📦 Deploy ke Vercel

1. Push ke GitHub (branch `main`).
2. Import repo di Vercel.
3. Set environment variables di Vercel → **Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (opsional) `VITE_SOCIAL_INSTAGRAM`, `VITE_SOCIAL_THREADS`, `VITE_SOCIAL_TIKTOK`
   - (opsional) `VITE_BOOKING_ONLINE_URL`, `VITE_BOOKING_ONLINE_STATUS`
4. Deploy — Vercel otomatis re-deploy setiap push ke `main`.

`vercel.json` sudah mengatur SPA rewrite semua route → `index.html`.

## 🗺️ Struktur Proyek

```
src/
├── App.tsx                    # Routes
├── Layout.tsx                 # Chrome (Navbar + Outlet + Footer)
├── main.tsx                   # Entry
├── index.css                  # Tailwind v4 + tokens
├── config/constants.ts        # Brand, kontak, sosial, subdomain booking
├── lib/
│   ├── supabase.ts            # Client Supabase
│   ├── motion.ts              # Variants framer-motion
│   └── utils.ts
├── providers/AuthProvider.tsx # Session + profile
├── components/
│   ├── Navbar.tsx / Footer.tsx / Logo.tsx / ProtectedRoute.tsx
│   └── ui/button.tsx
├── pages/
│   ├── Homepage.tsx
│   ├── Services.tsx
│   ├── Team.tsx               # data dari staff_profiles
│   ├── About.tsx
│   ├── Booking.tsx            # Info Kunjungan (no wizard)
│   ├── Progress.tsx           # RM + Nama → OTP → snapshot
│   ├── Login.tsx
│   ├── Dashboard.tsx          # shell + tabs
│   └── NotFound.tsx
├── features/dashboard/
│   ├── queries.ts             # Supabase queries
│   └── views/                 # 8 tab views
└── types/database.ts          # Tipe tabel Supabase

supabase/
├── migrations/0001_initial_schema.sql
└── seed.sql

public/logo.svg                # Logo transparan
```

## 🔐 Peran & Akses (RBAC)

Peran diambil dari `profiles.role`. Menu di dashboard difilter otomatis:

| Tab | Super Admin | Admin Cabang | Psikolog | Terapis | Karyawan |
|---|---|---|---|---|---|
| Overview | ✓ | ✓ | ✓ | ✓ | ✓ |
| Booking | ✓ | ✓ |  |  |  |
| Jadwal | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pasien | ✓ | ✓ | ✓ | ✓ |  |
| Rekam Medis | ✓ |  | ✓ |  |  |
| Keuangan | ✓ | ✓ |  |  |  |
| Presensi | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pengaturan | ✓ |  |  |  |  |

RLS di database menegakkan hal yang sama pada level query.

## 📄 Dokumentasi Lengkap

Semua dokumen spesifikasi ada di folder `docs/`:

- `01-PRD.md` — Product Requirement
- `02-Software-Architecture.md`
- `03-Functional-Specification.md`
- `04-Database-Architecture.md`
- `05-Admin-Panel-Specification.md`
- `06-REST-API-Specification.md`
- `07-Engineering-Guidelines.md`
- `08-Code-Review-and-Remediation-Roadmap.md`
- `09-Revisi-v1.1-Scope-Change.md` — revisi v1.1
- `10-Implementasi-Serah-Terima-PM.md` — implementasi serah-terima prototipe PM (Nov 2026) + langkah deploy

## 🧭 Fitur Progress Layanan (Roadmap Edge Functions)

Halaman `/progress` membutuhkan 3 Edge Function di Supabase yang **belum di-implement** di repo ini:

- `progress_request_otp` — validasi RM + nama → generate OTP → kirim via WA/email.
- `progress_verify_otp` — verifikasi OTP → keluarkan `progress_token` (JWT).
- `progress_snapshot` — kembalikan snapshot ringkas pasien (butuh header `Authorization: Bearer <token>`).

Selama Edge Function belum dibuat, halaman `/progress` akan menampilkan pesan error yang aman. Halaman lain tetap berfungsi normal.

## 📝 Lisensi

Proprietary. © FlourishCare.id
