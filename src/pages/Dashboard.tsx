import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/features/dashboard/shell/DashboardShell";
import { PageContainer, PageHeader } from "@/features/dashboard/shell/Page";
import { findByKey, pathOf, resolvePath, visibleNav } from "@/features/dashboard/shell/nav";
import { OverviewView } from "@/features/dashboard/views/OverviewView";
import { BookingsView } from "@/features/dashboard/views/BookingsView";
import { OnlineBookingsView } from "@/features/dashboard/views/OnlineBookingsView";
import { PatientsView } from "@/features/dashboard/views/PatientsView";
import { MedicalRecordsView } from "@/features/dashboard/views/MedicalRecordsView";
import { FinanceView } from "@/features/dashboard/views/FinanceView";
import { AttendanceView } from "@/features/dashboard/views/AttendanceView";
import { SettingsView, type SettingsPage } from "@/features/dashboard/views/SettingsView";
import { RegistrationsView } from "@/features/dashboard/views/RegistrationsView";
import { ExaminationsView } from "@/features/dashboard/views/ExaminationsView";
import { DevelopmentReportsView } from "@/features/dashboard/views/DevelopmentReportsView";
import { CalendarView } from "@/features/dashboard/views/CalendarView";
import { SearchView } from "@/features/dashboard/views/SearchView";
import { AccountView, ChangePasswordSection } from "@/features/dashboard/views/AccountView";
import { NarrativeBankSection } from "@/features/dashboard/views/SettingsExtras";
import { ConsultationView } from "@/features/reports/ConsultationView";
import { EvaluationView } from "@/features/reports/EvaluationView";
import { PsychotestView } from "@/features/reports/PsychotestView";
import { ReportListView } from "@/features/reports/ReportListView";
import type { ReportKind } from "@/features/reports/reportKinds";

const KIND_KEY: Record<ReportKind, string> = {
  sesi: "development_reports",
  evaluasi: "evaluations",
  asesmen: "examinations",
  konsultasi: "consultations",
  psikotes: "psychotests",
};

export function Dashboard() {
  const { profile, role, signOut, profileLoading, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [mustChange, setMustChange] = useState(false);

  const nav = useMemo(() => visibleNav(role), [role]);
  const [productSlug, pageSlug] = (params["*"] ?? "").split("/").filter(Boolean);
  const current = resolvePath(nav, productSlug, pageSlug);

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

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar dari dashboard?")) return;
    await signOut();
    navigate("/", { replace: true });
  }

  function go(key: string) {
    const f = findByKey(nav, key);
    if (f) navigate(pathOf(f.product, f.page));
  }

  // Halaman tidak dikenal / tidak sesuai peran → ke Beranda
  if (role && !current) return <Navigate to="/dashboard" replace />;

  const fallback = nav[0];
  const product = current?.product ?? fallback;
  const page = current?.page ?? fallback.pages[0];

  let body: React.ReactNode;
  if (profileLoading && !profile) {
    body = (
      <div className="max-w-xl mx-auto bg-white rounded-xl p-10 border border-black/10 text-center">
        <Loader2 className="animate-spin mx-auto mb-3 text-primary" size={26} />
        <p className="text-sm text-text-secondary">Memuat profil Anda…</p>
      </div>
    );
  } else if (!profile) {
    body = <ProfileNotFoundBanner onRetry={refresh} onLogout={handleLogout} />;
  } else if (profile.is_active === false) {
    body = (
      <div className="max-w-xl mx-auto bg-white rounded-xl p-8 border border-black/10 text-center">
        <h2 className="text-xl font-heading font-bold mb-2">Akun dinonaktifkan</h2>
        <p className="text-sm text-text-secondary">Hubungi Super Admin untuk mengaktifkan kembali akun Anda.</p>
      </div>
    );
  } else {
    body = renderPage(page.key, { go, search: location.search });
  }

  return (
    <DashboardShell nav={nav} product={product} page={page} profile={profile} role={role} onLogout={handleLogout}>
      <PageContainer width={page.width ?? "default"}>
        {page.key !== "overview" && <PageHeader title={page.label} description={page.desc} icon={page.icon} />}
        {body}
      </PageContainer>
      {mustChange && profile && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-warm-lg">
            <ChangePasswordSection forced onDone={() => setMustChange(false)} />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function renderPage(key: string, ctx: { go: (key: string) => void; search: string }) {
  if (key.startsWith("settings:")) return <SettingsView key={key} page={key.split(":")[1] as SettingsPage} />;
  switch (key) {
    case "overview":
      return <OverviewView onWrite={(k: ReportKind) => ctx.go(KIND_KEY[k])} onGo={ctx.go} />;
    case "search":
      return <SearchView onOpen={(t) => ctx.go(t)} />;
    case "online_bookings":
      return <OnlineBookingsView />;
    case "schedule":
      return <CalendarView />;
    case "bookings":
      return <BookingsView />;
    case "registrations":
      return <RegistrationsView />;
    case "patients":
      return <PatientsView />;
    case "development_reports":
      return <DevelopmentReportsView />;
    case "evaluations":
      return <EvaluationView />;
    case "examinations":
      return <ExaminationsView />;
    case "consultations":
      return <ConsultationView />;
    case "psychotests":
      return <PsychotestView />;
    case "my_reports":
      return <ReportListView key="mine" mode="mine" />;
    case "all_reports":
      return <ReportListView key="all" mode="all" />;
    case "trash":
      return <ReportListView key="trash" mode="trash" />;
    case "records":
      return <MedicalRecordsView />;
    case "narrative":
      return <NarrativeBankSection />;
    case "finance":
      return <FinanceView />;
    case "attendance":
      return <AttendanceView />;
    case "account":
      return <AccountView />;
    default:
      return null;
  }
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
    <div className="max-w-xl mx-auto bg-white rounded-xl p-8 border border-black/10 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Sparkles size={22} />
      </div>
      <h2 className="text-xl font-heading font-bold mb-2">Profil belum ter-load</h2>
      <p className="text-sm text-text-secondary mb-5">
        Sesi Anda masih aktif, tetapi data profil belum ter-load. Ini bisa terjadi karena jaringan lambat atau profil belum dibuat oleh Super Admin.
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Button onClick={handleRetry} disabled={retrying} className="rounded-full">
          {retrying ? <><Loader2 size={14} className="animate-spin mr-2" /> Memuat…</> : <><RefreshCw size={14} className="mr-2" /> Coba Lagi</>}
        </Button>
        <Button onClick={onLogout} variant="outline" className="rounded-full border-2">
          <LogOut size={14} className="mr-2" /> Keluar
        </Button>
      </div>
    </div>
  );
}
