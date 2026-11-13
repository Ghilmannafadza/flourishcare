import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Video, Home } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { LoadingBlock } from "@/features/dashboard/common";
import { addDays, isoLocal } from "@/lib/dates";

// Kalender booking minggu/bulan + filter psikolog/terapis + deteksi jadwal bentrok
// (profesional sama, waktu tumpang tindih). Sumber: online_bookings (online & homecare).

type Bk = {
  id: string;
  code: string;
  child_name: string;
  parent_name: string;
  mode: "online" | "homecare";
  homecare_service: string | null;
  psychologist_id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  payment_expires_at: string | null;
};
type Staff = { id: string; title: string; profile_id: string | null };

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const STATUS_CLS: Record<string, string> = {
  pending_payment: "border-yellow-300 bg-yellow-50",
  awaiting_confirmation: "border-secondary/50 bg-secondary/10",
  confirmed: "border-green-300 bg-green-50",
  completed: "border-primary/30 bg-primary/5",
};
const STATUS_TXT: Record<string, string> = {
  pending_payment: "Menunggu bayar",
  awaiting_confirmation: "Menunggu konfirmasi",
  confirmed: "Dikonfirmasi",
  completed: "Selesai",
};

export function CalendarView() {
  const { profile, role } = useAuth();
  const isAdmin = role === "super_admin" || role === "admin_cabang";
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState<string>(isoLocal());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [rows, setRows] = useState<Bk[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const d = new Date(cursor + "T00:00:00");
    if (view === "week") {
      const start = addDays(cursor, -d.getDay());
      return { start, days: [...Array(7).keys()].map((i) => addDays(start, i)) };
    }
    const first = isoLocal(new Date(d.getFullYear(), d.getMonth(), 1));
    const start = addDays(first, -new Date(first + "T00:00:00").getDay());
    return { start, days: [...Array(42).keys()].map((i) => addDays(start, i)) };
  }, [cursor, view]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("staff_profiles").select("id,title,profile_id").order("display_order");
      const list = (data as Staff[]) ?? [];
      setStaff(list);
      if (!isAdmin) {
        const mine = list.find((s) => s.profile_id === profile?.id);
        if (mine) setFilter(mine.id);
      }
    })();
  }, [isAdmin, profile?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = new Date(range.days[0] + "T00:00:00").toISOString();
      const to = new Date(addDays(range.days[range.days.length - 1], 1) + "T00:00:00").toISOString();
      const { data } = await supabase
        .from("online_bookings")
        .select("id,code,child_name,parent_name,mode,homecare_service,psychologist_id,scheduled_at,duration_min,status,payment_expires_at")
        .gte("scheduled_at", from)
        .lt("scheduled_at", to)
        .not("status", "in", "(cancelled,expired)")
        .order("scheduled_at");
      const now = Date.now();
      setRows(
        ((data as Bk[]) ?? []).filter(
          (b) => !(b.status === "pending_payment" && b.payment_expires_at && new Date(b.payment_expires_at).getTime() < now)
        )
      );
      setLoading(false);
    })();
  }, [range]);

  const shown = rows.filter((b) => filter === "all" || b.psychologist_id === filter);
  const conflicts = useMemo(() => {
    const ids = new Set<string>();
    const byStaff: Record<string, Bk[]> = {};
    rows.forEach((b) => (byStaff[b.psychologist_id] ||= []).push(b));
    Object.values(byStaff).forEach((list) => {
      list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const aEnd = new Date(list[i].scheduled_at).getTime() + list[i].duration_min * 60000;
          if (new Date(list[j].scheduled_at).getTime() < aEnd) {
            ids.add(list[i].id);
            ids.add(list[j].id);
          } else break;
        }
    });
    return ids;
  }, [rows]);

  const staffName = (id: string) => staff.find((s) => s.id === id)?.title ?? "-";
  const dayKey = (iso: string) => isoLocal(new Date(iso));
  const curMonth = new Date(cursor + "T00:00:00").getMonth();
  const label =
    view === "week"
      ? `${new Date(range.days[0] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${new Date(range.days[6] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
      : new Date(cursor + "T00:00:00").toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  function move(n: number) {
    if (view === "week") setCursor(addDays(cursor, 7 * n));
    else {
      const d = new Date(cursor + "T00:00:00");
      setCursor(isoLocal(new Date(d.getFullYear(), d.getMonth() + n, 1)));
    }
  }

  const visibleConflicts = shown.filter((b) => conflicts.has(b.id));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-black/5 p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="w-9 h-9 rounded-full hover:bg-background flex items-center justify-center" aria-label="Sebelumnya"><ChevronLeft size={18} /></button>
          <p className="font-semibold text-sm min-w-[180px] text-center">{label}</p>
          <button onClick={() => move(1)} className="w-9 h-9 rounded-full hover:bg-background flex items-center justify-center" aria-label="Berikutnya"><ChevronRight size={18} /></button>
          <button onClick={() => setCursor(isoLocal())} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5">Hari ini</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input max-w-[240px]" disabled={!isAdmin && filter !== "all"}>
            <option value="all">Semua psikolog/terapis</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <div className="flex rounded-full border border-black/10 overflow-hidden">
            {(["week", "month"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`text-xs px-4 py-2 font-semibold ${view === v ? "bg-primary text-white" : "bg-white text-text-secondary"}`}>
                {v === "week" ? "Minggu" : "Bulan"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleConflicts.length > 0 && (
        <div className="bg-red/10 border border-red/20 text-red rounded-2xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <b>{visibleConflicts.length} jadwal bentrok</b> (profesional sama, waktu tumpang tindih):{" "}
            {visibleConflicts.map((b) => `${b.code} ${new Date(b.scheduled_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`).join(", ")}. Ubah jadwal di tab Booking Online.
          </span>
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="grid grid-cols-7 bg-background text-xs text-text-secondary font-semibold">
            {HARI.map((h) => <div key={h} className="px-2 py-2 text-center">{h}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {range.days.map((day) => {
              const items = shown.filter((b) => dayKey(b.scheduled_at) === day);
              const isToday = day === isoLocal();
              const dim = view === "month" && new Date(day + "T00:00:00").getMonth() !== curMonth;
              return (
                <div key={day} className={`border-t border-l border-black/5 p-1.5 ${view === "week" ? "min-h-[220px]" : "min-h-[110px]"} ${dim ? "bg-background/60" : ""}`}>
                  <p className={`text-xs font-semibold mb-1 ${isToday ? "text-white bg-primary rounded-full w-6 h-6 flex items-center justify-center" : dim ? "text-text-secondary/40" : "text-text-secondary"}`}>
                    {Number(day.slice(8))}
                  </p>
                  <div className="space-y-1">
                    {items.slice(0, view === "month" ? 3 : 20).map((b) => (
                      <div
                        key={b.id}
                        title={`${b.code} · ${b.child_name} · ${staffName(b.psychologist_id)} · ${STATUS_TXT[b.status] ?? b.status}`}
                        className={`rounded-lg border px-1.5 py-1 text-[11px] leading-tight ${conflicts.has(b.id) ? "border-red bg-red/10" : STATUS_CLS[b.status] ?? "border-black/10"}`}
                      >
                        <p className="font-semibold flex items-center gap-1">
                          {b.mode === "homecare" ? <Home size={10} /> : <Video size={10} />}
                          {new Date(b.scheduled_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          {conflicts.has(b.id) && <AlertTriangle size={10} className="text-red" />}
                        </p>
                        <p className="truncate">{b.child_name}</p>
                        {view === "week" && filter === "all" && <p className="truncate text-text-secondary">{staffName(b.psychologist_id)}</p>}
                      </div>
                    ))}
                    {view === "month" && items.length > 3 && <p className="text-[11px] text-text-secondary">+{items.length - 3} lagi</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-text-secondary items-center">
        <CalendarDays size={14} className="text-primary" />
        {Object.entries(STATUS_TXT).map(([k, l]) => (
          <span key={k} className={`px-2 py-0.5 rounded-full border ${STATUS_CLS[k]}`}>{l}</span>
        ))}
        <span className="px-2 py-0.5 rounded-full border border-red bg-red/10 text-red">Bentrok</span>
      </div>
    </div>
  );
}
