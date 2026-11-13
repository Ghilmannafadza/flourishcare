// Edge Function: manage_staff_user
// Hanya Super Admin. Aksi:
//   { action: "reset_password", user_id, password? }  → sandi sementara baru, wajib ganti saat login
//   { action: "set_active", user_id, active: boolean } → nonaktifkan / aktifkan akun (login diblokir)
//
// Deploy: supabase functions deploy manage_staff_user

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const a = new Uint32Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: u } = await caller.auth.getUser();
    if (!u?.user) return json({ error: "Token tidak valid." }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin.from("profiles").select("role,is_active").eq("id", u.user.id).maybeSingle();
    if (!me || me.role !== "super_admin" || !me.is_active) return json({ error: "Hanya Super Admin." }, 403);

    const body = await req.json();
    const userId = String(body.user_id ?? "");
    if (!userId) throw new Error("user_id wajib.");
    if (userId === u.user.id && body.action === "set_active") throw new Error("Tidak bisa menonaktifkan akun sendiri.");

    if (body.action === "reset_password") {
      const password = body.password && String(body.password).length >= 8 ? String(body.password) : randomPassword();
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw new Error(error.message);
      await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
      await admin.from("activity_logs").insert({ actor_id: u.user.id, action: "user.reset_password", entity: "profiles", entity_id: userId });
      return json({ ok: true, password });
    }

    if (body.action === "set_active") {
      const active = Boolean(body.active);
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
      if (error) throw new Error(error.message);
      await admin.from("profiles").update({ is_active: active }).eq("id", userId);
      await admin.from("activity_logs").insert({
        actor_id: u.user.id, action: active ? "user.activate" : "user.deactivate", entity: "profiles", entity_id: userId,
      });
      return json({ ok: true, active });
    }

    throw new Error("Aksi tidak dikenal.");
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
