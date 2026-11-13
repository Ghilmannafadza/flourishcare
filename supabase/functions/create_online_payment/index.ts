// Edge Function: create_online_payment
// Dipanggil dari book.flourishcare.id (atau dashboard admin) untuk membuat QRIS dinamis Sumopod.
//
// Deploy:  supabase functions deploy create_online_payment
// Secrets (Supabase Dashboard → Edge Functions → Secrets) — JANGAN ditulis di kode/komentar:
//   SUMOPOD_API_KEY   = (API key dari dashboard Sumopod)
//   PUBLIC_APP_URL    = https://book.flourishcare.id
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (otomatis tersedia)
//
// Aturan (serah-terima PM):
//   - Nominal dihitung server (kolom amount diisi trigger DB, bukan dari browser).
//   - Online: lunas, batas bayar 10 menit (payment_expires_at dari DB).
//   - Visit/homecare: DP sesuai dp_percent (default 50%), pelunasan setelah sesi.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUMOPOD_URL = "https://api-pay.sumopod.com/api/v1/payments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) throw new Error("booking_id wajib");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Identitas pemanggil — hanya pemilik booking atau admin
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await caller.auth.getUser();
    const callerId = userData?.user?.id ?? null;
    if (!callerId) return json({ error: "Silakan login terlebih dahulu." }, 401);

    const { data: booking, error: bookingErr } = await admin
      .from("online_bookings")
      .select("*")
      .eq("id", booking_id)
      .single();
    if (bookingErr || !booking) throw new Error("Booking tidak ditemukan");

    if (booking.user_id !== callerId) {
      const { data: prof } = await admin.from("profiles").select("role,is_active").eq("id", callerId).maybeSingle();
      const isAdmin = prof?.is_active && ["super_admin", "admin_cabang"].includes(prof.role);
      if (!isAdmin) return json({ error: "Booking ini bukan milik akun Anda." }, 403);
    }

    // 2. Kedaluwarsa (online 10 menit)
    await admin.rpc("expire_unpaid_bookings");
    if (booking.payment_expires_at && new Date(booking.payment_expires_at).getTime() < Date.now()) {
      throw new Error("Batas waktu pembayaran sudah lewat. Silakan booking ulang.");
    }
    if (!["pending_payment", "awaiting_confirmation", "confirmed", "completed"].includes(booking.status)) {
      throw new Error(`Booking berstatus ${booking.status}, tidak bisa dibayar.`);
    }

    // 3. Nominal yang harus dibayar sekarang
    const total = Number(booking.amount);
    const paid = Number(booking.total_paid ?? 0);
    const isVisit = booking.mode === "homecare";
    const dp = isVisit ? Math.round((total * Number(booking.dp_percent ?? 50)) / 100) : total;
    const due = isVisit && paid < dp ? dp - paid : total - paid;
    if (due <= 0) throw new Error("Tagihan booking ini sudah lunas.");

    // 4. Pakai ulang QR yang masih aktif (hindari QR ganda)
    const { data: activePay } = await admin
      .from("online_payments")
      .select("*")
      .eq("booking_id", booking_id)
      .eq("status", "pending")
      .eq("provider", "sumopod")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      activePay?.payment_url &&
      Number(activePay.amount) === due &&
      activePay.expires_at &&
      new Date(activePay.expires_at).getTime() > Date.now() + 60_000
    ) {
      return json({ payment_url: activePay.payment_url, amount: due, expires_at: activePay.expires_at, reused: true });
    }

    const orderId = `${booking.code}-P${Date.now().toString().slice(-6)}`;
    const baseUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://book.flourishcare.id";
    const localExpiry = booking.payment_expires_at
      ? new Date(booking.payment_expires_at).toISOString()
      : new Date(Date.now() + 24 * 3600_000).toISOString();

    const sumopodRes = await fetch(SUMOPOD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": Deno.env.get("SUMOPOD_API_KEY")! },
      body: JSON.stringify({
        order_id: orderId,
        amount: due,
        currency: "IDR",
        // Batas 10 menit ditegakkan oleh database (payment_expires_at + expire_unpaid_bookings).
        expires_in_hours: 1,
        success_return_url: `${baseUrl}/success?booking=${booking.code}`,
        cancel_return_url: `${baseUrl}/cancel?booking=${booking.code}`,
        payment_method_type_code: "QRIS",
      }),
    });
    if (!sumopodRes.ok) {
      const errText = await sumopodRes.text();
      throw new Error(`Sumopod error ${sumopodRes.status}: ${errText}`);
    }
    const sumopodData = await sumopodRes.json();

    const { error: payErr } = await admin.from("online_payments").insert({
      booking_id,
      provider: "sumopod",
      provider_ref: sumopodData.payment_id,
      order_id: orderId,
      amount: due,
      fee: sumopodData.fee ?? null,
      net_amount: sumopodData.net_amount ?? null,
      payment_method: "QRIS",
      payment_url: sumopodData.payment_link_url,
      status: "pending",
      raw_response: sumopodData,
      expires_at: localExpiry,
      note: isVisit && paid < dp ? `DP ${booking.dp_percent ?? 50}%` : "Pelunasan",
    });
    if (payErr) throw new Error(`DB insert error: ${payErr.message}`);

    return json({
      payment_url: sumopodData.payment_link_url,
      payment_id: sumopodData.payment_id,
      amount: due,
      expires_at: localExpiry,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
