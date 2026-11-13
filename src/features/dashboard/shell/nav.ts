import {
  LayoutDashboard, CalendarDays, ClipboardList, Users, FileText, Wallet, Fingerprint, Settings, Video, UserPlus,
  Stethoscope, LineChart, Search, MessagesSquare, Brain, TrendingUp, FolderOpen, Files, Trash2, BookText, PenLine,
  CalendarCog, CalendarOff, UserCog, MessageCircle, Stamp, DatabaseBackup, Tag,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/database";

// Struktur navigasi dashboard (pola Supabase Studio):
// rail ikon = "produk" → menu produk (sub-halaman) → halaman.
// Setiap halaman punya URL sendiri: /dashboard/<produk>/<halaman>.

export const ALL: UserRole[] = ["super_admin", "admin_cabang", "psikolog", "terapis", "karyawan"];
const ADMIN: UserRole[] = ["super_admin", "admin_cabang"];
const CLINICAL: UserRole[] = ["super_admin", "psikolog", "terapis"];
const PSI: UserRole[] = ["super_admin", "psikolog"];
const SUPER: UserRole[] = ["super_admin"];

export type PageWidth = "small" | "default" | "full";

export type NavPage = {
  key: string; // dipakai sebagai id view
  slug: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  roles: UserRole[];
  group?: string; // judul kelompok di menu produk
  width?: PageWidth;
};

export type NavProduct = {
  slug: string;
  label: string;
  icon: LucideIcon;
  pages: NavPage[];
  bottom?: boolean;
};

export const NAV: NavProduct[] = [
  {
    slug: "beranda",
    label: "Beranda",
    icon: LayoutDashboard,
    pages: [
      { key: "overview", slug: "", label: "Beranda", desc: "Ringkasan hari ini dan hal yang perlu ditindaklanjuti.", icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    slug: "booking",
    label: "Booking",
    icon: Video,
    pages: [
      { key: "online_bookings", slug: "online", label: "Booking Online", desc: "Booking konsultasi online & homecare: konfirmasi, pembayaran, link sesi, ubah jadwal.", icon: Video, roles: ["super_admin", "admin_cabang", "psikolog", "terapis"] },
      { key: "schedule", slug: "kalender", label: "Kalender", desc: "Jadwal sesi per minggu/bulan. Jadwal bentrok ditandai merah.", icon: CalendarDays, roles: ["super_admin", "admin_cabang", "psikolog", "terapis"], width: "full" },
      { key: "bookings", slug: "klinik", label: "Booking Klinik", desc: "Data booking on-site klinik (sistem lama).", icon: ClipboardList, roles: ADMIN },
    ],
  },
  {
    slug: "pasien",
    label: "Pasien",
    icon: Users,
    pages: [
      { key: "patients", slug: "", label: "Data Pasien", desc: "Pasien ber-No. RM: kode akses portal orang tua, tim terapis, dan penghapusan data.", icon: Users, roles: ["super_admin", "admin_cabang", "psikolog", "terapis"] },
      { key: "registrations", slug: "pendaftaran", label: "Pendaftaran", desc: "Formulir pendaftaran dari flourishcare.id/assessment. Beri No. RM untuk menjadikannya pasien.", icon: UserPlus, roles: ADMIN },
      { key: "search", slug: "cari", label: "Pencarian", desc: "Cari nama anak, kode booking, No. RM, atau nomor WhatsApp di semua data.", icon: Search, roles: ADMIN },
    ],
  },
  {
    slug: "laporan",
    label: "Laporan",
    icon: FileText,
    pages: [
      { key: "my_reports", slug: "", label: "Laporan Saya", desc: "Semua laporan yang Anda tulis: terbitkan, tarik, hapus, dan lihat riwayatnya.", icon: FolderOpen, roles: CLINICAL, group: "Saya" },
      { key: "development_reports", slug: "sesi", label: "Sesi Terapi (FRM-008)", desc: "Laporan tiap sesi terapi: mood, aktivitas, hambatan, program di rumah.", icon: LineChart, roles: CLINICAL, group: "Terapi" },
      { key: "evaluations", slug: "evaluasi", label: "Evaluasi Perkembangan", desc: "Evaluasi 12 sesi berbasis indikator (skor 0–4). Menjadi grafik di portal orang tua.", icon: TrendingUp, roles: CLINICAL, group: "Terapi", width: "full" },
      { key: "examinations", slug: "asesmen", label: "Asesmen (FRM-005)", desc: "Laporan hasil asesmen psikolog.", icon: Stethoscope, roles: PSI, group: "Psikolog" },
      { key: "consultations", slug: "konsultasi", label: "Konsultasi (FRM-006)", desc: "Laporan pemeriksaan/konsultasi: informasi subjektif, objektif, kesimpulan.", icon: MessagesSquare, roles: PSI, group: "Psikolog" },
      { key: "psychotests", slug: "psikotes", label: "Psikotes", desc: "Laporan psikotes modular: WISC, CPM, NST, Frostig, sosial-emosional.", icon: Brain, roles: PSI, group: "Psikolog", width: "full" },
      { key: "records", slug: "rekam-medis", label: "Rekam Medis", desc: "Ringkasan seluruh laporan per pasien (baca saja).", icon: FileText, roles: PSI, group: "Arsip" },
      { key: "all_reports", slug: "semua", label: "Semua Laporan", desc: "Laporan terbit dari semua penulis.", icon: Files, roles: ADMIN, group: "Arsip" },
      { key: "trash", slug: "sampah", label: "Sampah", desc: "Laporan terhapus disimpan 30 hari sebelum dihapus permanen.", icon: Trash2, roles: SUPER, group: "Arsip" },
      { key: "narrative", slug: "bank-narasi", label: "Bank Narasi", desc: "Kalimat bawaan laporan psikotes.", icon: BookText, roles: PSI, group: "Alat", width: "default" },
    ],
  },
  {
    slug: "keuangan",
    label: "Keuangan",
    icon: Wallet,
    pages: [
      { key: "finance", slug: "", label: "Keuangan", desc: "Rekap pembayaran.", icon: Wallet, roles: ADMIN },
    ],
  },
  {
    slug: "presensi",
    label: "Presensi",
    icon: Fingerprint,
    pages: [
      { key: "attendance", slug: "", label: "Presensi & Cuti", desc: "Clock in/out dan pengajuan cuti.", icon: Fingerprint, roles: ALL },
    ],
  },
  {
    slug: "pengaturan",
    label: "Pengaturan",
    icon: Settings,
    bottom: true,
    pages: [
      { key: "settings:tarif", slug: "", label: "Tarif & Pembayaran", desc: "Harga layanan, biaya admin, transport homecare, dan DP.", icon: Tag, roles: SUPER, group: "Layanan", width: "small" },
      { key: "settings:booking", slug: "booking", label: "Aturan Booking", desc: "Paling cepat booking, batas 30 hari, batas bayar 10 menit.", icon: CalendarCog, roles: SUPER, group: "Layanan", width: "small" },
      { key: "settings:jadwal", slug: "jadwal", label: "Jadwal & Libur", desc: "Jadwal mingguan online/homecare per psikolog-terapis dan libur per tanggal.", icon: CalendarOff, roles: SUPER, group: "Layanan", width: "small" },
      { key: "settings:tim", slug: "tim", label: "Tim Kami", desc: "Profil, foto, CV, urutan, dan tampil/tidak di website & booking.", icon: Users, roles: SUPER, group: "Tim", width: "small" },
      { key: "settings:akun", slug: "akun-staf", label: "Akun Staf", desc: "Buat akun, reset sandi, nonaktifkan, hapus.", icon: UserCog, roles: SUPER, group: "Tim", width: "small" },
      { key: "settings:kontak", slug: "kontak", label: "Kontak Admin", desc: "Nomor WhatsApp admin dan kalimat pembuka.", icon: MessageCircle, roles: SUPER, group: "Klinik", width: "small" },
      { key: "settings:pengesahan", slug: "pengesahan", label: "Pengesahan & Cabang", desc: "Penanggungjawab klinik di laporan dan data cabang.", icon: Stamp, roles: SUPER, group: "Klinik", width: "small" },
      { key: "settings:backup", slug: "backup", label: "Backup Data", desc: "Backup bulanan JSON + CSV rekap laporan.", icon: DatabaseBackup, roles: SUPER, group: "Klinik", width: "small" },
    ],
  },
  {
    slug: "akun",
    label: "Akun Saya",
    icon: PenLine,
    bottom: true,
    pages: [
      { key: "account", slug: "", label: "Tanda Tangan & Akun", desc: "Identitas dan tanda tangan di laporan, serta ganti kata sandi.", icon: PenLine, roles: ALL, width: "small" },
    ],
  },
];

export function visibleNav(role: UserRole | null): NavProduct[] {
  if (!role) return NAV.filter((p) => p.slug === "beranda");
  return NAV.map((p) => ({ ...p, pages: p.pages.filter((pg) => pg.roles.includes(role)) })).filter((p) => p.pages.length > 0);
}

export function pathOf(product: NavProduct, page: NavPage) {
  if (product.slug === "beranda") return "/dashboard";
  return `/dashboard/${product.slug}${page.slug ? "/" + page.slug : ""}`;
}

export function findByKey(nav: NavProduct[], key: string): { product: NavProduct; page: NavPage } | null {
  for (const product of nav) for (const page of product.pages) if (page.key === key) return { product, page };
  return null;
}

export function resolvePath(nav: NavProduct[], productSlug?: string, pageSlug?: string) {
  const product = nav.find((p) => p.slug === (productSlug || "beranda"));
  if (!product) return null;
  const page = product.pages.find((pg) => pg.slug === (pageSlug ?? "")) ?? (pageSlug ? null : product.pages[0]);
  return page ? { product, page } : null;
}
