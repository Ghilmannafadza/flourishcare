import { useEffect, useState } from "react";
import { Sun, PenLine, Video, Home, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { addDays, isoLocal } from "@/lib/dates";
import { PREFILL_KEY, REPORT_META, fetchReports, type ReportKind } from "@/features/reports/reportKinds";

// Beranda "Hari ini" untuk terapis/psikolog: sesi hari ini + sesi 14 hari terakhir
// yang belum ada laporannya, dengan tombol "Tulis laporan" (pasien terisi otomatis).

type Sess = {
  id: string;
  code: string;
  child_id: string | null;
  child_name: string;
  mode: "online" | "homecare";
  homecare_service: string | null;
  scheduled_at: string;
  status: string;
  meeting_url: string | null;
};


export function TodayPanel({ onWrite }: { onWrite: (kind: ReportKind) => void }) {
  const { profile, role } = useAuth();
  const [today, setToday] = useState<Sess[]>([]);
  const [pending, setPending] = useState<Sess[]>([]);
  const [subs, setSubs] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data: me } = await supabase.from("staff_profiles").select("id").eq("profile_id", profile.id).maybeSingle();
      const staffId = (me as { id?: string } | null)?.id;
      if (!staffId) {
        setLoading(false);
        return;
      }
      const t0 = isoLocal();
      const from = new Date(addDays(t0, -14) + "T00:00:00").toISOString();
      const to = new Date(addDays(t0, 1) + "T00:00:00").toISOString();
      const [{ data }, mine] = await Promise.all([
        supabase
          .from("online_bookings")
          .select("id, code, child_id, child_name, mode, homecare_service, scheduled_at, status, meeting_url")
          .eq("psychologist_id", staffId)
          .in("status", ["confirmed", "awaiting_confirmation", "completed"])
          .gte("scheduled_at", from)
          .lt("scheduled_at", to)
          .order("scheduled_at"),
        fetchReports({ authorId: profile.id }),
      ]);
      const list = (data as Sess[]) ?? [];
      const written = new Set(mine.map((r) => `${r.row.child_id}|${String(r.row[REPORT_META[r.kind].dateCol] ?? "").slice(0, 10)}`));
      setToday(list.filter((s) => isoLocal(new Date(s.scheduled_at)) === t0));
      setPending(
        list.filter(
          (s) => new Date(s.scheduled_at).getTime() < Date.now() && s.child_id && !written.has(`${s.child_id}|${isoLocal(new Date(s.scheduled_at))}`)
        )
      );
      // laporan pengganti untuk pasien saya (terapis utama melihatnya di beranda)
      const { count } = await supabase
        .from("development_reports")
        .select("id", { count: "exact", head: true })
        .eq("substitute_for", profile.id)
        .gte("therapy_date", addDays(t0, -14));
      setSubs(count ?? 0);
      setLoading(false);
    })();
  }, [profile]);

  function write(s: Sess) {
    if (!s.child_id) return;
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ child_id: s.child_id, date: isoLocal(new Date(s.scheduled_at)) }));
    const kind: ReportKind = role === "psikolog" ? (s.mode === "online" ? "konsultasi" : "asesmen") : "sesi";
    onWrite(kind);
  }

  if (loading) return null;

  const Item = ({ s, showWrite }: { s: Sess; showWrite: boolean }) => (
    <li className="p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          {s.mode === "homecare" ? <Home size={13} className="text-primary" /> : <Video size={13} className="text-primary" />}
          {new Date(s.scheduled_at).toLocaleString("id-ID", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {s.child_name}
        </p>
        <p className="text-xs text-text-secondary">
          {s.code} · {s.mode === "homecare" ? `Homecare${s.homecare_service ? " " + s.homecare_service.toUpperCase() : ""}` : "Online"}
          {!s.child_id && " · belum tertaut ke pasien ber-RM"}
        </p>
      </div>
      <div className="flex gap-2">
        {s.meeting_url && !showWrite && (
          <a href={s.meeting_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full bg-primary text-white font-semibold inline-flex items-center gap-1">
            <ExternalLink size={12} /> Buka link
          </a>
        )}
        {s.child_id && (
          <button onClick={() => write(s)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1">
            <PenLine size={12} /> Tulis laporan
          </button>
        )}
      </div>
    </li>
  );

  return (
    <section className="space-y-3">
      <h2 className="font-heading font-bold text-lg flex items-center gap-2"><Sun size={18} className="text-primary" /> Hari ini</h2>
      {today.length === 0 ? (
        <p className="text-sm text-text-secondary bg-white rounded-2xl border border-primary/10 p-4">Tidak ada sesi terjadwal hari ini.</p>
      ) : (
        <ul className="bg-white rounded-2xl border border-primary/10 divide-y divide-primary/10">{today.map((s) => <Item key={s.id} s={s} showWrite={false} />)}</ul>
      )}
      {pending.length > 0 && (
        <>
          <h3 className="font-heading font-bold text-sm text-text-secondary">Belum ada laporannya (14 hari terakhir)</h3>
          <ul className="bg-white rounded-2xl border border-yellow-200 divide-y divide-primary/10">{pending.map((s) => <Item key={s.id} s={s} showWrite />)}</ul>
        </>
      )}
      {subs > 0 && (
        <p className="text-xs bg-background border border-black/5 rounded-2xl p-3">
          📝 Ada <b>{subs}</b> laporan sesi yang ditulis terapis pengganti untuk pasien Anda (14 hari terakhir). Lihat di tab Laporan Perkembangan.
        </p>
      )}
    </section>
  );
}
