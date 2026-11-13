import { useEffect, useState } from "react";
import { Users, CalendarClock, Wallet, Activity } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { fetchDashboardKpis, fetchUpcomingSessions, formatRupiah } from "@/features/dashboard/queries";
import type { UpcomingSession } from "@/features/dashboard/queries";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { TodayPanel } from "./TodayPanel";
import { BackupNotice } from "./BackupSection";
import type { ReportKind } from "@/features/reports/reportKinds";

export function OverviewView({ onWrite, onBackup }: { onWrite?: (kind: ReportKind) => void; onBackup?: () => void } = {}) {
  const { profile, role } = useAuth();
  const canSeeRevenue = role === "super_admin" || role === "admin_cabang";
  const [kpi, setKpi] = useState<{ patients: number; sessionsToday: number; revenueThisMonth: number } | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [k, up] = await Promise.all([
          fetchDashboardKpis(profile?.branch_id ?? null),
          fetchUpcomingSessions(role === "psikolog" || role === "terapis" ? profile?.id : undefined, 5),
        ]);
        if (cancelled) return;
        setKpi(k);
        setUpcoming(up);
      } catch {
        if (!cancelled) {
          setKpi({ patients: 0, sessionsToday: 0, revenueThisMonth: 0 });
          setUpcoming([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.branch_id, profile?.id, role]);

  const cards = [
    { icon: Users, label: "Total Pasien", value: kpi?.patients ?? 0 },
    { icon: CalendarClock, label: "Sesi Hari Ini", value: kpi?.sessionsToday ?? 0 },
    ...(canSeeRevenue ? [{ icon: Wallet, label: "Pendapatan Bulan Ini", value: formatRupiah(kpi?.revenueThisMonth ?? 0) }] : []),
    { icon: Activity, label: "Status", value: loading ? "Memuat…" : "Aktif" },
  ];

  const isClinical = role === "psikolog" || role === "terapis";

  return (
    <div className="space-y-6">
      {role === "super_admin" && <BackupNotice onOpen={onBackup} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-5 border border-primary/10">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <c.icon size={18} />
            </div>
            <p className="text-xs text-text-secondary">{c.label}</p>
            <p className="text-2xl font-heading font-extrabold text-text-primary mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {isClinical && onWrite && <TodayPanel onWrite={onWrite} />}

      {!isClinical && (
      <section>
        <h2 className="font-heading font-bold text-lg mb-3">Jadwal Terdekat</h2>
        {loading ? (
          <LoadingBlock />
        ) : upcoming.length === 0 ? (
          <EmptyState title="Belum ada jadwal terdekat" description="Sesi akan muncul di sini setelah booking dikonfirmasi." icon={CalendarClock} />
        ) : (
          <div className="bg-white rounded-2xl border border-primary/10 divide-y divide-primary/10">
            {upcoming.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.child_name ?? "Sesi"} <span className="text-xs font-mono text-text-secondary">{s.code}</span></p>
                  <p className="text-xs text-text-secondary">
                    {new Date(s.scheduled_at).toLocaleString("id-ID", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{s.status.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}
