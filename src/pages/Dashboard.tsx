import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  FileText,
  Wallet,
  Fingerprint,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Video,
  UserPlus,
  Stethoscope,
  LineChart,
  Loader2,
  RefreshCw,
  Search,
  MessagesSquare,
  Brain,
  TrendingUp,
  FolderOpen,
  Files,
  Trash2,
  BookText,
  PenLine,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/database";
import { OverviewView } from "@/features/dashboard/views/OverviewView";
import { BookingsView } from "@/features/dashboard/views/BookingsView";
import { OnlineBookingsView } from "@/features/dashboard/views/OnlineBookingsView";
import { PatientsView } from "@/features/dashboard/views/PatientsView";
import { MedicalRecordsView } from "@/features/dashboard/views/MedicalRecordsView";
import { FinanceView } from "@/features/dashboard/views/FinanceView";
import { AttendanceView } from "@/features/dashboard/views/AttendanceView";
import { SettingsView } from "@/features/dashboard/views/SettingsView";
import { RegistrationsView } from "@/features/dashboard/views/RegistrationsView";
import { ExaminationsView } from "@/features/dashboard/views/ExaminationsView";
import { DevelopmentReportsView } from "@/features/dashboard/views/DevelopmentReportsView";
import { CalendarView } from "@/features/dashboard/views/CalendarView";
import { SearchView } from "@/features/dashboard/views/SearchView";
import { AccountView, ChangePasswordSection } from "@/features/dashboard/views/AccountView";
import { NarrativeBankSection } from "@/features/dashboard/views/SettingsExtras";
import { ROLE_LABEL } from "@/features/dashboard/views/SettingsView";
import { ConsultationView } from "@/features/reports/ConsultationView";
import { EvaluationView } from "@/features/reports/EvaluationView";
import { PsychotestView } from "@/features/reports/PsychotestView";
import { ReportListView } from "@/features/reports/ReportListView";
import type { ReportKind } from "@/features/reports/reportKinds";

type TabKey =
  | "overview"
  | "search"
  | "bookings"
  | "online_bookings"
  | "schedule"
  | "registrations"
  | "patients"
  | "examinations"
  | "consultations"
  | "psychotests"
  | "development_reports"
  | "evaluations"
  | "my_reports"
  | "all_reports"
  | "records"
  | "narrative"
  | "trash"
  | "finance"
  | "attendance"
  | "account"
  | "settings";

const ALL: UserRole[] = ["super_admin", "admin_cabang", "psikolog", "terapis", "karyawan"];

// Hak akses mengikuti serah-terima PM:
// Admin Operasional (admin_cabang) = booking, kalender, pendaftaran, data pasien, pembayaran manual.
// Super Admin = semua + tim, akun staf, jadwal, tarif, pengesahan, backup, sampah, kontak.
const TABS: Array<{ key: TabKey; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, roles: ALL },
  { key: "search", label: "Pencarian", icon: Search, roles: ["super_admin", "admin_cabang"] },
  { key: "online_bookings", label: "Booking Online", icon: Video, roles: ["super_admin", "admin_cabang", "psikolog", "terapis"] },
  { key: "schedule", label: "Kalender", icon: CalendarDays, roles: ["super_admin", "admin_cabang", "psikolog", "terapis"] },
  { key: "bookings", label: "Booking Klinik", icon: ClipboardList, roles: ["super_admin", "admin_cabang"] },
  { key: "registrations", label: "Pendaftaran Pasien", icon: UserPlus, roles: ["super_admin", "admin_cabang"] },
  { key: "patients", label: "Data Pasien", icon: Users, roles: ["super_admin", "admin_cabang", "psikolog", "terapis"] },
  { key: "development_reports", label: "Laporan Sesi (FRM-008)", icon: LineChart, roles: ["super_admin", "psikolog", "terapis"] },
  { key: "evaluations", label: "Evaluasi Perkembangan", icon: TrendingUp, roles: ["super_admin", "psikolog", "terapis"] },
  { key: "examinations", label: "Asesmen (FRM-005)", icon: Stethoscope, roles: ["super_admin", "psikolog"] },
  { key: "consultations", label: "Konsultasi (FRM-006)", icon: MessagesSquare, roles: ["super_admin", "psikolog"] },
  { key: "psychotests", label: "Psikotes", icon: Brain, roles: ["super_admin", "psikolog"] },
  { key: "my_reports", label: "Laporan Saya", icon: FolderOpen, roles: ["super_admin", "psikolog", "terapis"] },
  { key: "all_reports", label: "Semua Laporan", icon: Files, roles: ["super_admin", "admin_cabang"] },
  { key: "records", label: "Rekam Medis", icon: FileText, roles: ["super_admin", "psikolog"] },
  { key: "narrative", label: "Bank Narasi", icon: BookText, roles: ["super_admin", "psikolog"] },
  { key: "trash", label: "Sampah Laporan", icon: Trash2, roles: ["super_admin"] },
  { key: "finance", label: "Keuangan", icon: Wallet, roles: ["super_admin", "admin_cabang"] },
  { key: "attendance", label: "Presensi", icon: Fingerprint, roles: ALL },
  { key: "account", label: "Tanda Tangan & Akun", icon: PenLine, roles: ALL },
  { key: "settings", label: "Pengaturan", icon: Settings, roles: ["super_admin"] },
];

const KIND_TAB: Record<ReportKind, TabKey> = {
  sesi: "development_reports",
  evaluasi: "evaluations",
  asesmen: "examinations",
  konsultasi: "consultations",
  psikotes: "psychotests",
};

export function Dashboard() {
  const { profile, role, signOut, profileLoading, refresh } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  // Akun staf baru / reset: wajib ganti kata sandi sementara
  useEffect(() => {
    if (!profile?.id) return;
    void supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", profile.id)
      .maybeSingle()
      .then(({ data }) => setMustChange(Boolean((data as { must_change_password?: boolean } | null)?.must_change_password)));
  }, [profile?.id]);

  const visibleTabs = useMemo(
    () => (role ? TABS.filter((t) => t.roles.includes(role)) : TABS.filter((t) => t.key === "overview")),
    [role]
  );

  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === tab)) {
      setTab(visibleTabs[0]?.key ?? "overview");
    }
  }, [visibleTabs, tab]);

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar dari dashboard?")) return;
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-primary/10 flex flex-col transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-primary/10 flex items-center justify-between">
          <Logo className="h-16 w-auto" />
          <button className="lg:hidden text-text-secondary" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:bg-primary/5 hover:text-primary"
              }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-primary/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-text-secondary">Masuk sebagai</p>
            <p className="text-sm font-semibold text-text-primary truncate">{profile?.full_name ?? "-"}</p>
            <p className="text-xs text-primary">{role ? ROLE_LABEL[role] ?? role : ""}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red hover:bg-red/10 transition-colors"
          >
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-primary/10 px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-text-secondary" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="font-heading font-bold text-lg md:text-xl">{TABS.find((t) => t.key === tab)?.label}</h1>
              <p className="text-xs text-text-secondary">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full hidden sm:inline-flex border-2">
            <Link to="/">Lihat Situs</Link>
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          {profileLoading && !profile ? (
            <ProfileLoadingBlock />
          ) : !profile ? (
            <ProfileNotFoundBanner onRetry={refresh} onLogout={handleLogout} />
          ) : profile.is_active === false ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-primary/10 text-center">
              <h2 className="text-xl font-heading font-bold mb-2">Akun dinonaktifkan</h2>
              <p className="text-sm text-text-secondary">Hubungi Super Admin untuk mengaktifkan kembali akun Anda.</p>
            </div>
          ) : (
            <>
              {tab === "overview" && <OverviewView onWrite={(k) => setTab(KIND_TAB[k])} onBackup={() => setTab("settings")} />}
              {tab === "search" && <SearchView onOpen={(t) => setTab(t)} />}
              {tab === "consultations" && <ConsultationView />}
              {tab === "psychotests" && <PsychotestView />}
              {tab === "evaluations" && <EvaluationView />}
              {tab === "my_reports" && <ReportListView mode="mine" />}
              {tab === "all_reports" && <ReportListView mode="all" />}
              {tab === "trash" && <ReportListView mode="trash" />}
              {tab === "narrative" && <NarrativeBankSection />}
              {tab === "account" && <AccountView />}
              {tab === "bookings" && <BookingsView />}
              {tab === "online_bookings" && <OnlineBookingsView />}
              {tab === "schedule" && <CalendarView />}
              {tab === "registrations" && <RegistrationsView />}
              {tab === "patients" && <PatientsView />}
              {tab === "examinations" && <ExaminationsView />}
              {tab === "development_reports" && <DevelopmentReportsView />}
              {tab === "records" && <MedicalRecordsView />}
              {tab === "finance" && <FinanceView />}
              {tab === "attendance" && <AttendanceView />}
              {tab === "settings" && <SettingsView />}
            </>
          )}
        </main>
        {mustChange && profile && (
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-warm-lg">
              <ChangePasswordSection forced onDone={() => setMustChange(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileLoadingBlock() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl p-10 border border-primary/10 text-center">
      <Loader2 className="animate-spin mx-auto mb-3 text-primary" size={26} />
      <p className="text-sm text-text-secondary">Memuat profil Anda…</p>
    </div>
  );
}

function ProfileNotFoundBanner({ onRetry, onLogout }: { onRetry: () => Promise<void>; onLogout: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  async function handleRetry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-primary/10 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Sparkles size={22} />
      </div>
      <h2 className="text-xl font-heading font-bold mb-2">Profil belum ter-load</h2>
      <p className="text-sm text-text-secondary mb-5">
        Sesi Anda masih aktif, tetapi data profil belum ter-load. Ini bisa terjadi karena jaringan lambat atau profil belum dibuat oleh Super Admin.
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Button onClick={handleRetry} disabled={retrying} className="rounded-full">
          {retrying ? (
            <><Loader2 size={14} className="animate-spin mr-2" /> Memuat…</>
          ) : (
            <><RefreshCw size={14} className="mr-2" /> Coba Lagi</>
          )}
        </Button>
        <Button onClick={onLogout} variant="outline" className="rounded-full border-2">
          <LogOut size={14} className="mr-2" /> Keluar
        </Button>
      </div>
      <p className="text-xs text-text-secondary mt-4">
        Kalau berulang-ulang gagal, hubungi Super Admin untuk memastikan profil sudah dibuat di sistem.
      </p>
    </div>
  );
}
