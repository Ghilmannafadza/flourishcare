import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Pengaturan klinik (tabel clinic_settings, key → JSON). Diubah Super Admin.

export type BookingRules = { lead: "today" | "h1" | "h2" | "h3"; horizon_days: number; payment_minutes: number };
export type ContactSetting = { wa: string; greeting: string };
export type VisitTariff = { radius_km: number; transport_base: number; per_km: number; dp_percent: number };
export type PjSetting = { jabatan: string; nama: string; izin: string; image_data: string | null };

export const SETTING_DEFAULTS = {
  booking: { lead: "h1", horizon_days: 30, payment_minutes: 10 } as BookingRules,
  contact: { wa: "6285887031855", greeting: "Halo Admin FlourishCare, saya ingin bertanya" } as ContactSetting,
  tarif_visit: { radius_km: 10, transport_base: 50000, per_km: 5000, dp_percent: 50 } as VisitTariff,
  pj: {
    jabatan: "Penanggungjawab Klinik",
    nama: "dr. Amanda Ismoetia",
    izin: "SIP: 3-B.15a/31.75.09.1003.35.K-3/4/TM.09.74/e/2026",
    image_data: null,
  } as PjSetting,
  narasi: {} as Record<string, unknown>,
  backup_log: [] as Array<{ at: string; by: string; month: string }>,
};

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function loadSetting<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]> {
  const { data } = await supabase.from("clinic_settings").select("value").eq("key", key).maybeSingle();
  const def = SETTING_DEFAULTS[key];
  const v = (data as { value?: unknown } | null)?.value;
  if (v == null) return def;
  if (Array.isArray(def)) return (Array.isArray(v) ? v : def) as (typeof SETTING_DEFAULTS)[K];
  return { ...(def as object), ...(v as object) } as (typeof SETTING_DEFAULTS)[K];
}

export async function saveSetting<K extends SettingKey>(key: K, value: (typeof SETTING_DEFAULTS)[K], userId?: string | null) {
  const row = { value, updated_at: new Date().toISOString(), updated_by: userId ?? null };
  // update dulu (psikolog boleh update "narasi" tapi tidak insert), lalu upsert bila baris belum ada
  const upd = await supabase.from("clinic_settings").update(row).eq("key", key).select("key");
  if (!upd.error && (upd.data ?? []).length > 0) return { error: null };
  return supabase.from("clinic_settings").upsert({ key, ...row }, { onConflict: "key" });
}

export function useSetting<K extends SettingKey>(key: K) {
  const [value, setValue] = useState<(typeof SETTING_DEFAULTS)[K]>(SETTING_DEFAULTS[key]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setValue(await loadSetting(key));
    } finally {
      setLoading(false);
    }
  }, [key]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { value, setValue, loading, reload };
}

export function rupiah(n: number | string | null | undefined): string {
  return "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
}
