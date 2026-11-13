// Edge Function: sumopod_webhook
// Dipanggil Sumopod saat status pembayaran berubah.
//
// Deploy:  supabase functions deploy sumopod_webhook --no-verify-jwt
// Secret:  SUMOPOD_WEBHOOK_TOKEN = string acak panjang (mis. hasil `openssl rand -hex 24`)
// URL webhook di dashboard Sumopod:
//   https://<project>.supabase.co/functions/v1/sumopod_webhook?token=<SUMOPOD_WEBHOOK_TOKEN>
//
// Pengamanan:
//   1. Token rahasia di URL wajib cocok (tanpa ini siapa pun bisa menandai "lunas").
//   2. Bila SUMOPOD_WEBHOOK_SECRET diisi dan Sumopod mengirim header tanda tangan
//      (x-signature / x-sumopod-signature, HMAC-SHA256 hex dari body mentah), tanda tangan diverifikasi.
//   3. Nominal di payload harus sama dengan nominal tagihan yang tersimpan.
//   4. Idempoten: pembayaran yang sudah "paid" tidak diproses ulang (webhook ganda aman).

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const url = new URL(req.url);
    const expectedToken = Deno.env.get("SUMOPOD_WEBHOOK_TOKEN") ?? "";
    if (!expectedToken || !timingSafeEqual(url.searchParams.get("token") ?? "", expectedToken)) {
      return json({ error: "unauthorized" }, 401);
    }

    const raw = await req.text();
    const secret = Deno.env.get("SUMOPOD_WEBHOOK_SECRET");
    const sigHeader = req.headers.get("x-signature") ?? req.headers.get("x-sumopod-signature");
    if (secret && sigHeader) {
      const expected = await hmacHex(secret, raw);
      if (!timingSafeEqual(sigHeader.replace(/^sha256=/, "").toLowerCase(), expected)) {
        return json({ error: "invalid signature" }, 401);
      }
    }

    const payload = JSON.parse(raw);
    const data = payload.data ?? payload;
    const payment_id: string | undefined = data.payment_id ?? data.id;
    const order_id: string | undefined = data.order_id;
    const status = String(data.status ?? payload.event ?? "").toLowerCase();
    if (!payment_id && !order_id) throw new Error("payload tanpa identifier");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let q = supabase.from("online_payments").select("*").limit(1);
    q = payment_id ? q.eq("provider_ref", payment_id) : q.eq("order_id", order_id!);
    const { data: pay } = await q.maybeSingle();
    if (!pay) return json({ error: "payment not found" }, 404);

    const statusMap: Record<string, string> = {
      paid: "paid", success: "paid", settlement: "paid", completed: "paid", "payment.completed": "paid",
      pending: "pending", failed: "failed", expired: "expired", cancelled: "failed", canceled: "failed",
    };
    const internalStatus = statusMap[status] ?? "pending";

    // Idempoten
    if (pay.status === "paid") return json({ ok: true, duplicate: true });

    // Nominal harus cocok
    const payloadAmount = Number(data.amount ?? data.gross_amount ?? NaN);
    if (internalStatus === "paid" && Number.isFinite(payloadAmount) && Math.round(payloadAmount) !== Math.round(Number(pay.amount))) {
      await supabase.from("online_payments").update({ raw_response: payload, note: "Nominal webhook tidak cocok — cek manual" }).eq("id", pay.id);
      return json({ error: "amount mismatch" }, 400);
    }

    const { error } = await supabase
      .from("online_payments")
      .update({
        status: internalStatus,
        raw_response: payload,
        paid_at: internalStatus === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", pay.id)
      .neq("status", "paid");
    if (error) throw new Error(`DB update error: ${error.message}`);

    // Trigger DB (recalc_booking_payment) memperbarui total_paid & status booking.
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
