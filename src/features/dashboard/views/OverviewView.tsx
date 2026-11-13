import { useEffect, useState } from "react";
import {
  Users, CalendarClock, Wallet, UserPlus, BellRing, Link2, Clock, FileEdit, ChevronRight, Video, Search, PenLine, FolderOpen, CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { fetchDashboardKpis, fetchUpcomingSessions, formatRupiah } from "@/features/dashboard/queries";
import type { UpcomingSession } from "@/features/dashboard/queries";
import { TodayPanel } from "./TodayPanel";
import { BackupNotice } from "./BackupSection";
import { REPORT_KINDS, REPORT_META, type ReportKind } from "@/features/reports/reportKinds";

// Beranda ala "Project home" Supabase: sapaan, metrik utama, daftar "Perlu tindakan"
// yang langsung bisa diklik, lalu aksi cepat sesuai peran.

type Todo = { key: string; label: string; count: number; icon: LucideIcon; to: string; tone: "warn" | "info" };

export function OverviewView({ onWrite, onGo }: { onWrite?: (kind: ReportKind) => void; onGo?: (key: string) => void } = {}) {
  const { profile, role } = useAuth();
  const isAdmin = role === "super_admin" || role === "admin_cabang";
  const isClinical = role === "psikolog" || role === "terapis";
  const [kpi, setKpi] = useState<{ patients: number; sessionsToday: number; revenueThisMonth: number } | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [k, up] = await Promise.all([fetchDashboardKpis(null), isAdmin ? fetchUpcomingSessions(undefined, 6) : Promise.resolve([])]);
        const list: Todo[] = [];
        if (isAdmin) {
          await supabase.rpc("expire_unpaid_bookings");
          const [reg, waitConf, noLink, unpaid] = await Promise.all([
            supabase.from("patient_registrations").select("id", { count: "exact", head: true }).eq("status", "pending_rm"),
            supabase.from("online_bookings").select("id", { count: "exact", head: true }).eq("status", "awaiting_confirmation"),
            supabase
              .from("online_bookings")
              .select("id", { count: "exact", head: true })
              .eq("status", "confirmed")
              .eq("mode", "online")
              .is("meeting_url", null)
              .gte("scheduled_at", new Date().toISOString()),
            supabase.from("online_bookings").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
          ]);
          list.push(
            { key: "registrations", label: "Pendaftaran menunggu No. RM", count: reg.count ?? 0, icon: UserPlus, to: "registrations", tone: "warn" },
            { key: "confirm", label: "Booking sudah bayar, menunggu konfirmasi", count: waitConf.count ?? 0, icon: BellRing, to: "online_bookings", tone: "warn" },
            { key: "link", label: "Sesi online belum ada link Zoom/Meet", count: noLink.count ?? 0, icon: Link2, to: "online_bookings", tone: "warn" },
            { key: "unpaid", label: "Booking belum dibayar", count: unpaid.count ?? 0, icon: Clock, to: "online_bookings", tone: "info" }
          );
        }
        if (isClinical && profile) {
          const drafts = await Promise.all(
            REPORT_KINDS.map((kd) =>
              supabase
                .from(REPORT_META[kd].table)
                .select("id", { count: "exact", head: true })
                .eq(REPORT_META[kd].authorCol, profile.id)
                .eq("status", "draft")
                .is("deleted_at", null)
            )
          );
          const n = drafts.reduce((s, r) => s + (r.count ?? 0), 0);
          list.push({ key: "drafts", label: "Laporan draft belum diterbitkan", count: n, icon: FileEdit, to: "my_reports", tone: "warn" });
        }
        if (cancelled) return;
        setKpi(k);
        setUpcoming(up);
        setTodos(list);
      } catch {
        if (!cancelled) setKpi({ patients: 0, sessionsToday: 0, revenueThisMonth: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isClinical, profile]);

  const hour = new Date().getHours();
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  const metrics = [
    { icon: Users, label: "Total pasien", value: kpi?.patients ?? 0, to: "patients" },
    { icon: CalendarClock, label: "Sesi hari ini", value: kpi?.sessionsToday ?? 0, to: "schedule" },
    ...(isAdmin ? [{ icon: Wallet, label: "Pendapatan bulan ini", value: formatRupiah(kpi?.revenueThisMonth ?? 0), to: "finance" }] : []),
  ];
  const active = todos.filter((t) => t.count > 0);

  const quick: Array<{ label: string; icon: LucideIcon; key: string }> = isAdmin
    ? [
        { label: "Booking online", icon: Video, key: "online_bookings" },
        { label: "Kalender", icon: CalendarDays, key: "schedule" },
        { label: "Pendaftaran pasien", icon: UserPlus, key: "registrations" },
        { label: "Cari pasien / booking", icon: Search, key: "search" },
      ]
    : isClinical
      ? [
          { label: "Tulis laporan sesi", icon: PenLine, key: "development_reports" },
          { label: "Laporan saya", icon: FolderOpen, key: "my_reports" },
          { label: "Kalender", icon: CalendarDays, key: "schedule" },
          { label: "Data pasien", icon: Users, key: "patients" },
        ]
      : [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-text-secondary">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="font-heading font-bold text-2xl md:text-3xl">
          {greet}, {profile?.full_name?.split(" ")[0] ?? ""}
        </h1>
      </header>

      {role === "super_admin" && <BackupNotice onOpen={() => onGo?.("settings:backup")} />}

      {/* Metrik */}
      <section className={`grid grid-cols-1 ${metrics.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-px bg-black/10 rounded-xl overflow-hidden border border-black/10`}>
        {metrics.map((m) => (
          <button key={m.label} onClick={() => onGo?.(m.to)} className="bg-white px-5 py-4 text-left hover:bg-background transition-colors group">
            <p className="text-xs text-text-secondary flex items-center gap-1.5">
              <m.icon size={14} /> {m.label}
            </p>
            <p className="text-2xl font-heading font-bold mt-1">{loading ? "…" : m.value}</p>
          </button>
        ))}
      </section>

      {/* Perlu tindakan */}
      {(isAdmin || isClinical) && (
        <section>
          <h2 className="font-heading font-semibold text-base mb-3">Perlu tindakan</h2>
          {loading ? (
            <div className="h-16 bg-white rounded-xl border border-black/10 animate-pulse" />
          ) : active.length === 0 ? (
            <div className="bg-white rounded-xl border border-black/10 px-5 py-4 text-sm text-text-secondary">✓ Semua beres. Tidak ada yang perlu ditindaklanjuti.</div>
          ) : (
            <ul className="bg-white rounded-xl border border-black/10 divide-y divide-black/5">
              {active.map((t) => (
                <li key={t.key}>
                  <button onClick={() => onGo?.(t.to)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-background">
                    <t.icon size={18} className={t.tone === "warn" ? "text-primary" : "text-text-secondary"} />
                    <span className="flex-1 text-sm">{t.label}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${t.tone === "warn" ? "bg-primary/10 text-primary" : "bg-black/5 text-text-secondary"}`}>{t.count}</span>
                    <ChevronRight size={16} className="text-text-secondary" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isClinical && onWrite && <TodayPanel onWrite={onWrite} />}

      {/* Aksi cepat */}
      {quick.length > 0 && (
        <section>
          <h2 className="font-heading font-semibold text-base mb-3">Aksi cepat</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quick.map((q) => (
              <button
                key={q.key}
                onClick={() => onGo?.(q.key)}
                className="bg-white rounded-xl border border-black/10 p-4 text-left hover:border-primary/40 hover:shadow-warm-sm transition-all"
              >
                <q.icon size={18} className="text-primary mb-2" />
                <p className="text-sm font-medium">{q.label}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Jadwal terdekat (admin) */}
      {isAdmin && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-base">Jadwal terdekat</h2>
            <button onClick={() => onGo?.("schedule")} className="text-xs text-primary font-semibold hover:underline">Buka kalender →</button>
          </div>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-xl border border-black/10 px-5 py-4 text-sm text-text-secondary">Belum ada sesi terkonfirmasi yang akan datang.</div>
          ) : (
            <div className="bg-white rounded-xl border border-black/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background text-text-secondary text-left text-xs">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Waktu</th>
                    <th className="px-5 py-2.5 font-medium">Anak</th>
                    <th className="px-5 py-2.5 font-medium hidden sm:table-cell">Kode</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {upcoming.map((s) => (
                    <tr key={s.id} className="hover:bg-background/60 cursor-pointer" onClick={() => onGo?.("online_bookings")}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {new Date(s.scheduled_at).toLocaleString("id-ID", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 font-medium">{s.child_name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-text-secondary hidden sm:table-cell">{s.code}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">{s.status.replace(/_/g, " ")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
