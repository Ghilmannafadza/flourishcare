import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { fadeUp } from "@/lib/motion";
import { useWizard } from "../wizardContext";
import { Stepper } from "../Stepper";
import { HOMECARE_SERVICES, type HomecareServiceKey } from "@/lib/homecarePrices";
import { useSetting } from "@/lib/settings";
import { isoLocal } from "@/lib/dates";

type Psi = {
  id: string;
  title: string;
  slug: string;
  photo_url: string | null;
  homecare_services: string[] | null;
};

type Slot = { slot_time: string; is_available: boolean };

// Kalender kita mulai dari Sunday: index 0..6 = Sun..Sat
const DAY_HEADERS_SUN = ["M", "S", "S", "R", "K", "J", "S"]; // Min, Sen, Sel, Rab, Kam, Jum, Sab

export function StepSchedule() {
  const navigate = useNavigate();
  const { data, update } = useWizard();

  const [psychs, setPsychs] = useState<Psi[]>([]);
  const [loadingPsi, setLoadingPsi] = useState(true);

  const [scheduledDays, setScheduledDays] = useState<number[]>([]); // day_of_week available
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [offDates, setOffDates] = useState<string[]>([]);
  // Aturan booking dari Super Admin: paling cepat (hari ini/H+1/H+2/H+3) & batas 30 hari bergulir
  const { value: rules } = useSetting("booking");

  // Redirect kembali kalau step 1 belum lengkap
  useEffect(() => {
    const childOk = data.child_id || (data.parent_name && data.child_name && data.child_dob && data.child_gender);
    if (!childOk || !data.consultation_topic) {
      navigate("/profile", { replace: true });
    }
  }, [data, navigate]);

  // Ambil daftar psikolog/terapis
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPsi(true);
      const { data: rows } = await supabase
        .from("staff_profiles")
        .select("id,title,slug,photo_url,homecare_services")
        .eq("is_visible", true)
        .eq("is_bookable_online", true)
        .order("display_order");
      if (cancelled) return;
      const list = (rows ?? []) as Psi[];
      setPsychs(list);
      setLoadingPsi(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter psikolog/terapis berdasarkan mode dan layanan homecare yang dipilih
  const filteredPsychs = useMemo(() => {
    if (data.mode === "online") return psychs; // Semua boleh untuk online
    if (!data.homecare_service) return []; // Homecare tapi belum pilih layanan → kosong dulu
    return psychs.filter((p) => (p.homecare_services ?? []).includes(data.homecare_service));
  }, [psychs, data.mode, data.homecare_service]);

  // Reset selected psikolog kalau ganti layanan homecare & psikolog lama tidak match
  useEffect(() => {
    if (!data.psychologist_id) return;
    const stillValid = filteredPsychs.some((p) => p.id === data.psychologist_id);
    if (!stillValid) {
      update({ psychologist_id: "", psychologist_name: "", scheduled_date: "", scheduled_time: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPsychs, data.psychologist_id]);

  // Ambil day_of_week yang tersedia untuk psikolog terpilih
  useEffect(() => {
    if (!data.psychologist_id) return;
    (async () => {
      const { data: rows } = await supabase
        .from("psychologist_schedules")
        .select("day_of_week")
        .eq("staff_id", data.psychologist_id)
        .eq("is_active", true)
        .eq("mode", data.mode);
      const uniq = Array.from(new Set((rows ?? []).map((r) => r.day_of_week as number)));
      setScheduledDays(uniq);
      const { data: off } = await supabase
        .from("staff_time_off")
        .select("off_date")
        .eq("staff_id", data.psychologist_id)
        .gte("off_date", isoLocal());
      setOffDates(((off ?? []) as { off_date: string }[]).map((o) => o.off_date));
    })();
  }, [data.psychologist_id, data.mode]);

  // Ambil slot ketika tanggal dipilih.
  // HANYA pakai RPC — no fallback, no client-side generation (bisa jadi sumber slot ganda).
  // Race guard: pakai reqIdRef supaya response yang terlambat tidak overwrite state.
  useEffect(() => {
    if (!data.psychologist_id || !data.scheduled_date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      try {
        const { data: rows, error } = await supabase.rpc("online_available_slots", {
          p_staff_id: data.psychologist_id,
          p_date: data.scheduled_date,
          p_mode: data.mode,
        });
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[Slots] RPC error:", error);
          setSlots([]);
          return;
        }
        // Normalisasi slot_time — hindari edge case Supabase parsing (kadang "12:30:00", kadang "12:30")
        const normalized: Slot[] = ((rows ?? []) as Array<{ slot_time: string | Date; is_available: boolean }>)
          .map((r) => {
            let t = typeof r.slot_time === "string" ? r.slot_time : "";
            if (r.slot_time instanceof Date) {
              t = `${String(r.slot_time.getUTCHours()).padStart(2, "0")}:${String(r.slot_time.getUTCMinutes()).padStart(2, "0")}:00`;
            }
            // Ambil hanya HH:MM:SS bagian awal (buang timezone kalau ada)
            const match = t.match(/^(\d{2}:\d{2}(:\d{2})?)/);
            const clean = match ? match[1] : t;
            const hhmmss = clean.length === 5 ? `${clean}:00` : clean;
            return { slot_time: hhmmss, is_available: r.is_available };
          })
          // Dedup by slot_time (kalau ada duplikat dari DB)
          .filter((s, i, arr) => arr.findIndex((x) => x.slot_time === s.slot_time) === i);
        // eslint-disable-next-line no-console
        console.log("[Slots] Loaded", normalized.length, "slots for", data.mode, ":", normalized.map((s) => s.slot_time));
        setSlots(normalized);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => { cancelled = true; };
  }, [data.psychologist_id, data.scheduled_date, data.mode]);

  const monthMatrix = useMemo(() => buildMonthMatrix(monthCursor), [monthCursor]);

  function selectPsi(p: Psi) {
    update({ psychologist_id: p.id, psychologist_name: p.title, scheduled_date: "", scheduled_time: "" });
  }

  function selectDate(d: Date) {
    if (!isDayClickable(d)) return;
    // Format YYYY-MM-DD lokal (bukan toISOString yang UTC — bisa geser 1 hari untuk zona +7)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    update({ scheduled_date: `${y}-${m}-${day}`, scheduled_time: "" });
  }

  // Tanggal yang bisa dipilih: sesuai aturan "paling cepat booking", maksimal 30 hari ke depan,
  // hanya hari yang ada jadwal psikolog/terapis, dan bukan tanggal libur/cuti.
  const leadDays = rules.lead === "today" ? 0 : rules.lead === "h2" ? 2 : rules.lead === "h3" ? 3 : 1;
  function isDayClickable(d: Date): boolean {
    if (d.getMonth() !== monthCursor.getMonth()) return false;
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);
    minDate.setDate(minDate.getDate() + leadDays);
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + (rules.horizon_days || 30));
    if (d < minDate || d > maxDate) return false;
    if (data.psychologist_id && !scheduledDays.includes(d.getDay())) return false;
    if (offDates.includes(isoLocal(d))) return false;
    return true;
  }

  // Indicator: apakah hari ini ada jadwal terjadwal (untuk highlight visual)
  function hasSchedule(d: Date): boolean {
    return scheduledDays.includes(d.getDay());
  }

  function submit() {
    if (!data.scheduled_date || !data.scheduled_time) return;
    navigate("/payment");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-[2rem] p-6 md:p-10 border border-black/5 shadow-warm">
        <Stepper current={2} />

        <div className="mt-6 mb-6 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-background text-text-secondary">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Pilih Jadwal</h1>
            <p className="text-sm text-text-secondary">Pilih psikolog dan waktu yang tersedia.</p>
          </div>
        </div>

        {/* Pilih Layanan Homecare — hanya kalau mode=homecare */}
        {data.mode === "homecare" && (
          <>
            <p className="text-primary font-semibold text-xs uppercase tracking-wider mb-3">
              Pilih Layanan Homecare
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {HOMECARE_SERVICES.map((svc) => (
                <button
                  key={svc.key}
                  type="button"
                  onClick={() => update({ homecare_service: svc.key as HomecareServiceKey })}
                  className={`text-left rounded-3xl border p-4 transition-colors ${
                    data.homecare_service === svc.key
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-black/10 bg-white hover:border-primary/40"
                  }`}
                >
                  <p className="font-heading font-bold text-sm">{svc.label}</p>
                  <p className="text-xs text-primary mt-0.5">{svc.short}</p>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{svc.desc}</p>
                </button>
              ))}
            </div>
            {!data.homecare_service && (
              <p className="text-xs text-red bg-red/5 border border-red/10 rounded-xl px-3 py-2 mb-6">
                Silakan pilih salah satu layanan homecare di atas untuk lanjut memilih psikolog & jadwal.
              </p>
            )}
            <hr className="border-black/5 mb-6" />
          </>
        )}

        {/* Pilih Psikolog / Terapis (filtered by mode + layanan homecare) */}
        <p className="text-primary font-semibold text-xs uppercase tracking-wider mb-3">
          {data.mode === "homecare" ? "Pilih Terapis / Psikolog" : "Pilih Psikolog"}
        </p>
        {loadingPsi ? (
          <div className="py-8 text-center text-text-secondary"><Loader2 className="animate-spin inline mr-2" size={16} /> Memuat…</div>
        ) : data.mode === "homecare" && !data.homecare_service ? (
          <div className="py-6 text-center text-text-secondary text-sm bg-background rounded-2xl border border-black/5 mb-8">
            Pilih dulu layanan homecare di atas untuk melihat terapis yang tersedia.
          </div>
        ) : filteredPsychs.length === 0 ? (
          <div className="py-6 text-center text-text-secondary text-sm bg-yellow-50 border border-yellow-200 rounded-2xl mb-8">
            Belum ada {data.mode === "homecare" ? "terapis/psikolog" : "psikolog"} yang tersedia untuk layanan ini.
            Silakan pilih layanan lain atau hubungi admin.
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(3, filteredPsychs.length || 1)} gap-3 mb-8`}>
            {filteredPsychs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPsi(p)}
                className={`rounded-3xl border p-4 text-center transition-colors ${
                  data.psychologist_id === p.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-black/10 bg-white hover:border-primary/40"
                }`}
              >
                <div className="w-20 h-20 mx-auto mb-2 rounded-full overflow-hidden bg-black/5">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary/40">
                      <Users size={28} />
                    </div>
                  )}
                </div>
                <p className="font-heading font-semibold text-sm leading-tight">{p.title}</p>
                <p className="text-xs text-primary mt-1">Tersedia</p>
              </button>
            ))}
          </div>
        )}

        <hr className="border-black/5 mb-6" />

        {/* Calendar + Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-background rounded-3xl p-4 md:p-5 border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-primary" />
                <span className="font-semibold text-sm">
                  {monthCursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center"
                  onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                  type="button"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center"
                  onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary mb-2">
              {DAY_HEADERS_SUN.map((d, i) => (
                <div key={i} className="py-1 font-semibold">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthMatrix.map((d, i) => {
                const inMonth = d.getMonth() === monthCursor.getMonth();
                const clickable = inMonth && isDayClickable(d);
                const scheduled = hasSchedule(d);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                const iso = `${y}-${m}-${day}`;
                const selected = data.scheduled_date === iso;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!clickable}
                    onClick={() => selectDate(d)}
                    className={`relative aspect-square rounded-full text-sm font-semibold transition-colors ${
                      selected
                        ? "bg-primary text-white shadow-warm"
                        : clickable
                        ? "text-text-primary hover:bg-primary/10"
                        : "text-text-secondary/30 cursor-not-allowed"
                    }`}
                  >
                    {d.getDate()}
                    {clickable && scheduled && !selected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mt-4 text-xs text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Titik = hari yang biasanya ada jadwal
            </div>
            <div className="mt-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
              ⏰ {rules.lead === "today"
                ? <>Booking paling lambat <span className="font-semibold">1 jam</span> sebelum sesi</>
                : <>Booking minimal <span className="font-semibold">H-{leadDays}</span></>}
              {" "}· maksimal {rules.horizon_days || 30} hari ke depan.
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-primary" />
              <span className="font-semibold text-sm">Waktu Sesi</span>
            </div>

            {!data.scheduled_date ? (
              <div className="p-6 bg-background rounded-3xl border border-black/5 text-sm text-text-secondary text-center">
                Pilih tanggal terlebih dahulu.
              </div>
            ) : loadingSlots ? (
              <div className="p-6 text-sm text-text-secondary text-center"><Loader2 className="animate-spin inline mr-2" size={14} /> Memuat slot…</div>
            ) : slots.length === 0 ? (
              <div className="p-6 bg-background rounded-3xl border border-black/5 text-sm text-text-secondary text-center">
                Tidak ada slot pada tanggal ini.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((s) => {
                  const label = s.slot_time.slice(0, 5); // HH:MM
                  const selected = data.scheduled_time === label;
                  return (
                    <button
                      key={s.slot_time}
                      type="button"
                      disabled={!s.is_available}
                      onClick={() => update({ scheduled_time: label })}
                      className={`rounded-2xl border py-3 text-sm font-semibold transition-colors ${
                        selected
                          ? "bg-primary/10 border-primary text-primary ring-2 ring-primary/20"
                          : s.is_available
                          ? "bg-white border-black/10 hover:border-primary/40"
                          : "bg-black/5 border-black/10 text-text-secondary/50 cursor-not-allowed"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <Button
              type="button"
              disabled={
                !data.scheduled_date ||
                !data.scheduled_time ||
                (data.mode === "homecare" && !data.homecare_service)
              }
              onClick={submit}
              size="lg"
              className="w-full rounded-full shadow-warm mt-6"
            >
              Lanjut ke Pembayaran
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


function buildMonthMatrix(cursor: Date): Date[] {
  // Return 42 days (6 weeks) starting from Sunday of the week containing first-of-month.
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = first.getDay(); // 0 = Sunday
  const start = new Date(first);
  start.setDate(1 - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}
