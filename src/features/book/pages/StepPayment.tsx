import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, QrCode, ShieldCheck, User2, Calendar as CalendarIcon, MapPin, Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { fadeUp } from "@/lib/motion";
import { useWizard } from "../wizardContext";
import { Stepper } from "../Stepper";

import { getHomecareService } from "@/lib/homecarePrices";
import { CLINIC_NAME } from "@/config/constants";

// Kebijakan pembatalan & refund (serah-terima PM) — wajib dicentang sebelum bayar
const KEBIJAKAN = [
  "Pembatalan atau perubahan jadwal lebih dari 24 jam sebelum sesi: bisa reschedule atau refund penuh.",
  "Pembatalan kurang dari 24 jam sebelum sesi: reschedule 1 kali, atau biaya hangus.",
  "Bila psikolog/terapis berhalangan: refund penuh atau reschedule gratis, sesuai pilihan orang tua.",
  "Booking online yang belum dibayar dalam batas waktu (10 menit) otomatis dibatalkan dan jamnya dibuka kembali.",
];

type Quote = {
  service_fee: number;
  admin_fee: number;
  transport_fee: number;
  total: number;
  dp_percent: number | null;
  due_now: number;
  radius_km: number;
  outside_radius: boolean;
};

// Fallback tarif kalau row di `online_booking_prices` belum ada.
const FALLBACK_PRICE_ONLINE = 200_000;
const FALLBACK_PRICE_HOMECARE = 300_000;
const FALLBACK_ADMIN_FEE = 25_000;

// Format tanggal ke DD/MM/YYYY + hari (bahasa Indonesia)
function formatDateID(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const weekday = d.toLocaleDateString("id-ID", { weekday: "long" });
  return `${weekday}, ${day}/${month}/${year}`;
}

export function StepPayment() {
  const navigate = useNavigate();
  const { data, update } = useWizard();
  const { session } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyOk, setPolicyOk] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({
    online: FALLBACK_PRICE_ONLINE,
    homecare: FALLBACK_PRICE_HOMECARE,
    admin_fee: FALLBACK_ADMIN_FEE,
    homecare_bt: FALLBACK_PRICE_HOMECARE,
    homecare_si: FALLBACK_PRICE_HOMECARE,
    homecare_ot: FALLBACK_PRICE_HOMECARE,
    homecare_tw: FALLBACK_PRICE_HOMECARE,
  });

  useEffect(() => {
    if (!data.scheduled_date || !data.scheduled_time || !data.psychologist_id) {
      navigate("/book/schedule", { replace: true });
    }
  }, [data, navigate]);

  // Pastikan payment_type selalu "full" karena DP sudah dihilangkan
  useEffect(() => {
    if (data.payment_type !== "full") {
      update({ payment_type: "full" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch harga dinamis dari `online_booking_prices`
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("online_booking_prices")
        .select("mode,price");
      if (!rows) return;
      const map: Record<string, number> = {
        online: FALLBACK_PRICE_ONLINE,
        homecare: FALLBACK_PRICE_HOMECARE,
        admin_fee: FALLBACK_ADMIN_FEE,
        homecare_bt: FALLBACK_PRICE_HOMECARE,
        homecare_si: FALLBACK_PRICE_HOMECARE,
        homecare_ot: FALLBACK_PRICE_HOMECARE,
        homecare_tw: FALLBACK_PRICE_HOMECARE,
      };
      for (const r of rows as Array<{ mode: string; price: number }>) {
        map[r.mode] = Number(r.price);
      }
      setPrices(map);
    })();
  }, []);

  // Rincian biaya resmi dihitung server (sama persis dengan yang ditagihkan)
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data: q } = await supabase.rpc("booking_quote", {
        p_mode: data.mode,
        p_homecare_service: data.mode === "homecare" ? data.homecare_service || null : null,
        p_distance_km: data.mode === "homecare" ? Number(String(data.distance_km).replace(",", ".")) || 0 : 0,
      });
      if (q) setQuote(q as Quote);
    }, 250);
    return () => clearTimeout(t);
  }, [data.mode, data.homecare_service, data.distance_km]);

  // Untuk homecare, harga per layanan (BT/SI/OT/TW). Untuk online, harga tunggal.
  const homecareSvc = getHomecareService(data.homecare_service);
  const basePrice =
    data.mode === "homecare"
      ? homecareSvc
        ? (prices[homecareSvc.priceMode] ?? FALLBACK_PRICE_HOMECARE)
        : prices.homecare
      : prices.online;
  const adminFee = quote ? Number(quote.admin_fee) : prices.admin_fee;
  const serviceFee = quote ? Number(quote.service_fee) : basePrice;
  const transportFee = quote ? Number(quote.transport_fee) : 0;
  const totalToPay = quote ? Number(quote.total) : basePrice + adminFee;
  const dueNow = quote ? Number(quote.due_now) : totalToPay;
  const serviceLabel =
    data.mode === "homecare"
      ? homecareSvc?.label ?? "Homecare Visit"
      : "Konsultasi Online";

  async function handleConfirm() {
    if (!session) return;
    if (!policyOk) {
      setError("Centang persetujuan kebijakan pembatalan & refund terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Insert online_bookings
      const scheduledAt = new Date(`${data.scheduled_date}T${data.scheduled_time}:00`).toISOString();
      const { data: booking, error: bErr } = await supabase
        .from("online_bookings")
        .insert({
          user_id: session.user.id,
          parent_name: data.parent_name,
          parent_whatsapp: data.parent_whatsapp,
          parent_email: data.parent_email,
          child_name: data.child_name,
          child_dob: data.child_dob,
          child_gender: data.child_gender || "L",
          consultation_topic: data.consultation_topic || "konsultasi_awal",
          condition_notes: data.condition_notes || null,
          mode: data.mode,
          psychologist_id: data.psychologist_id,
          scheduled_at: scheduledAt,
          duration_min: 60,
          homecare_address: data.mode === "homecare" ? data.homecare_address : null,
          homecare_service: data.mode === "homecare" ? (data.homecare_service || null) : null,
          distance_km: data.mode === "homecare" ? Number(String(data.distance_km).replace(",", ".")) || 0 : null,
          child_id: data.child_id || null,
          policy_accepted_at: new Date().toISOString(),
          // nominal & jenis bayar dihitung ulang oleh server (trigger online_booking_guard)
          amount: totalToPay,
          payment_type: data.mode === "homecare" ? "dp_50" : "full",
        })
        .select()
        .single();
      if (bErr || !booking) throw new Error(bErr?.message ?? "Gagal membuat booking");

      // Panggil Edge Function untuk create payment
      const { data: payRes, error: payErr } = await supabase.functions.invoke("create_online_payment", {
        body: { booking_id: booking.id },
      });
      if (payErr || !payRes?.payment_url) {
        throw new Error(payErr?.message ?? "Gagal membuat link pembayaran");
      }

      // PENTING: JANGAN reset wizard di sini. Data tetap tersimpan di localStorage
      // supaya kalau user klik Back dari Sumopod, form-nya masih terisi.
      // Reset baru dilakukan di halaman /success setelah payment confirmed.
      window.location.href = payRes.payment_url;
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  const scheduledDate = data.scheduled_date
    ? new Date(`${data.scheduled_date}T${data.scheduled_time || "00:00"}:00`)
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-[2rem] p-6 md:p-10 border border-black/5 shadow-warm">
        <Stepper current={3} />

        <div className="mt-6 mb-6 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-background text-text-secondary">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Pembayaran</h1>
            <p className="text-sm text-text-secondary">Tinjau pesanan Anda dan selesaikan transaksi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* KIRI: Ringkasan + alamat homecare */}
          <div className="space-y-5">
            <div className="bg-background rounded-3xl p-5 border border-black/5">
              <p className="font-semibold text-sm mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <QrCode size={14} />
                </span>
                Ringkasan Booking
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <User2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-text-secondary">Psikolog</p>
                    <p className="font-semibold">{data.psychologist_name}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CalendarIcon size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-text-secondary">Waktu</p>
                    <p className="font-semibold">
                      {scheduledDate ? formatDateID(scheduledDate) : "-"}
                    </p>
                    <p className="text-xs text-primary">{data.scheduled_time} WIB</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  {data.mode === "homecare" ? <Home size={16} className="text-primary flex-shrink-0 mt-0.5" /> : <MapPin size={16} className="text-primary flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-xs text-text-secondary">Layanan</p>
                    <p className="font-semibold">{serviceLabel}</p>
                  </div>
                </li>
              </ul>
            </div>

            {data.mode === "homecare" && (
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Perkiraan jarak dari {CLINIC_NAME} (km)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.distance_km}
                  onChange={(e) => update({ distance_km: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder="Contoh: 8"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Cek di Google Maps. Radius layanan {quote?.radius_km ?? 10} km; di luar radius dikenakan biaya per km dan tergantung ketersediaan terapis.
                </p>
                {quote?.outside_radius && (
                  <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mt-2">
                    Lokasi di luar radius {quote.radius_km} km — admin akan mengecek ketersediaan terapis/psikolog terlebih dahulu.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Alamat Lengkap (Homecare)</label>
                <textarea
                  required
                  rows={3}
                  value={data.homecare_address}
                  onChange={(e) => update({ homecare_address: e.target.value })}
                  placeholder="Jl. contoh No.1, Kelurahan, Kota"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              </div>
            )}

            <details className="bg-background rounded-3xl p-5 border border-black/5">
              <summary className="font-semibold text-sm cursor-pointer">Kebijakan pembatalan & refund</summary>
              <ul className="text-xs text-text-secondary list-disc pl-4 mt-3 space-y-1.5">
                {KEBIJAKAN.map((k) => <li key={k}>{k}</li>)}
              </ul>
            </details>
          </div>

          {/* KANAN: Metode + tombol konfirmasi */}
          <div className="bg-background rounded-3xl p-5 border border-black/5 flex flex-col">
            <p className="font-semibold text-sm mb-4">Metode Pembayaran</p>
            <div
              className="flex items-center gap-3 rounded-2xl p-3 border bg-white border-primary ring-2 ring-primary/20"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <QrCode size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">QRIS</p>
                <p className="text-xs text-text-secondary">Scan dengan aplikasi e-wallet atau mobile banking Anda</p>
              </div>
            </div>

            <hr className="border-black/5 my-5" />

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {data.mode === "homecare" ? (homecareSvc?.short ?? "Homecare") : "Jasa Psikolog"}
                </span>
                <span className="font-semibold">Rp {serviceFee.toLocaleString("id-ID")}</span>
              </div>
              {data.mode === "homecare" && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Transport{data.distance_km ? ` (${data.distance_km} km)` : ""}</span>
                  <span className="font-semibold">Rp {transportFee.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Biaya Admin</span>
                <span className="font-semibold">Rp {adminFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="border-t border-black/10 pt-2 flex items-baseline justify-between">
                <span className="font-semibold">Total Tagihan</span>
                <span className="text-2xl font-heading font-extrabold text-primary">
                  Rp {totalToPay.toLocaleString("id-ID")}
                </span>
              </div>
              {data.mode === "homecare" && quote?.dp_percent != null && (
                <div className="flex justify-between bg-primary/5 rounded-xl px-3 py-2">
                  <span className="font-semibold">Bayar sekarang (DP {quote.dp_percent}%)</span>
                  <span className="font-bold text-primary">Rp {dueNow.toLocaleString("id-ID")}</span>
                </div>
              )}
              <p className="text-xs text-text-secondary">
                {data.mode === "homecare"
                  ? "Pelunasan dibayar setelah sesi (tunai/transfer ke admin)."
                  : "Selesaikan pembayaran QRIS dalam 10 menit, atau booking otomatis batal."}
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-text-secondary mb-3">
              <input type="checkbox" checked={policyOk} onChange={(e) => setPolicyOk(e.target.checked)} className="mt-0.5" />
              Saya sudah membaca dan menyetujui kebijakan pembatalan & refund.
            </label>
            {error && (
              <div className="text-sm text-red bg-red/10 border border-red/20 rounded-2xl px-4 py-3 mb-3">{error}</div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={submitting || !policyOk || (data.mode === "homecare" && (!data.homecare_address || !data.distance_km))}
              size="lg"
              className="w-full rounded-full shadow-warm mt-auto"
            >
              {submitting ? (
                <><Loader2 className="animate-spin mr-2" size={18} /> Memproses…</>
              ) : (
                `Bayar Rp ${dueNow.toLocaleString("id-ID")} dengan QRIS`
              )}
            </Button>

            <p className="text-xs text-text-secondary text-center mt-3 flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-green-600" /> Keamanan Data Terjamin
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
