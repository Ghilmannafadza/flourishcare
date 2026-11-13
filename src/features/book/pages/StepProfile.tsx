import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { fadeUp } from "@/lib/motion";
import { useWizard, CONSULTATION_TOPICS } from "../wizardContext";
import { Stepper, AdminWhatsAppLink } from "../Stepper";

export function StepProfile() {
  const navigate = useNavigate();
  const { data, update } = useWizard();
  const { session } = useAuth();
  const autofilledRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [lamaMsg, setLamaMsg] = useState<string | null>(null);

  // Pasien lama: cocokkan No. RM + nama depan anak di server (data pasien tidak ditampilkan)
  async function cekPasienLama() {
    setChecking(true);
    setLamaMsg(null);
    const { data: res, error } = await supabase.rpc("booking_find_patient", { p_rm: data.rm_lama, p_first_name: data.anak_lama });
    setChecking(false);
    const r = res as { ok?: boolean; child_id?: string; error?: string; until?: string } | null;
    if (error || !r) return setLamaMsg("Gagal memeriksa data. Coba lagi atau hubungi admin.");
    if (r.ok && r.child_id) {
      update({ child_id: r.child_id, child_name: data.anak_lama.trim(), child_gender: data.child_gender || "L", child_dob: data.child_dob || "2000-01-01" });
      return;
    }
    update({ child_id: "" });
    setLamaMsg(
      r.error === "locked"
        ? "Terlalu banyak percobaan. Coba lagi 15 menit lagi atau hubungi admin."
        : "No. RM dan nama depan belum cocok dengan data kami. Periksa kembali, atau isi data sebagai pasien baru — admin akan mencocokkan."
    );
  }

  // Bersihkan ?code= dan ?state= dari URL setelah OAuth callback selesai
  // (mencegah reload loop dan URL yang jelek)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("code") || url.searchParams.has("state") || url.searchParams.has("error")) {
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }, []);

  // Auto-fill dari session (email + wa dari user_metadata) — HANYA sekali
  useEffect(() => {
    if (!session || autofilledRef.current) return;
    autofilledRef.current = true;
    const meta = session.user.user_metadata as { whatsapp?: string; full_name?: string; name?: string } | undefined;
    const patch: Record<string, string> = {};
    if (!data.parent_email && session.user.email) patch.parent_email = session.user.email;
    if (!data.parent_whatsapp && meta?.whatsapp) patch.parent_whatsapp = meta.whatsapp;
    if (!data.parent_name && (meta?.full_name || meta?.name)) patch.parent_name = meta.full_name || meta.name || "";
    if (Object.keys(patch).length > 0) update(patch as Partial<typeof data>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validasi minimal sudah lewat native `required`. Lanjut.
    navigate("/book/schedule");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-[2rem] p-6 md:p-10 border border-black/5 shadow-warm">
        <Stepper current={1} />

        <div className="mt-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-heading font-bold mb-1">Lengkapi Profil</h1>
          <p className="text-sm text-text-secondary">
            Mohon isi data orang tua dan anak untuk memulai sesi konsultasi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Pasien lama */}
          <div className="bg-background rounded-3xl border border-black/5 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={data.returning}
                onChange={(e) => update({ returning: e.target.checked, child_id: e.target.checked ? data.child_id : "" })}
              />
              Pasien lama FlourishCare (sudah punya No. RM)
            </label>
            {data.returning && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <Field label="No. RM">
                    <input type="text" value={data.rm_lama} onChange={(e) => update({ rm_lama: e.target.value.toUpperCase(), child_id: "" })} placeholder="FC-RM-…" className={inputCls} />
                  </Field>
                  <Field label="Nama depan anak">
                    <input type="text" value={data.anak_lama} onChange={(e) => update({ anak_lama: e.target.value, child_id: "" })} className={inputCls} />
                  </Field>
                  <Button type="button" variant="outline" onClick={cekPasienLama} disabled={checking || !data.rm_lama.trim() || !data.anak_lama.trim()} className="rounded-full border-2">
                    {checking ? <Loader2 size={16} className="animate-spin" /> : "Cek data"}
                  </Button>
                </div>
                {data.child_id ? (
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Data pasien {data.rm_lama} ditemukan. Data anak & orang tua diambil otomatis dari rekam medis.
                  </p>
                ) : lamaMsg ? (
                  <p className="text-xs text-red bg-red/5 border border-red/10 rounded-xl px-3 py-2">{lamaMsg}</p>
                ) : null}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Informasi Orang Tua */}
            <div className="space-y-4">
              <p className="text-primary font-semibold text-xs uppercase tracking-wider">Informasi Orang Tua</p>

              <Field label="Nama Lengkap Orang Tua/Wali">
                <input
                  type="text"
                  required={!data.child_id}
                  value={data.parent_name}
                  onChange={(e) => update({ parent_name: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="Nomor WhatsApp Aktif (untuk kontak lanjutan)">
                <input
                  type="tel"
                  inputMode="numeric"
                  required={!data.child_id}
                  value={data.parent_whatsapp}
                  onChange={(e) => update({ parent_whatsapp: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  className={inputCls}
                />
                <p className="text-xs text-text-secondary mt-1">
                  Semua konfirmasi jadwal & follow-up akan dikirim via WhatsApp.
                </p>
              </Field>

              <Field label="Email (opsional)">
                <input
                  type="email"
                  value={data.parent_email}
                  onChange={(e) => update({ parent_email: e.target.value })}
                  placeholder="Boleh dikosongkan"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Informasi Anak */}
            <div className={`space-y-4 ${data.child_id ? "hidden" : ""}`}>
              <p className="text-primary font-semibold text-xs uppercase tracking-wider">Informasi Anak</p>

              <Field label="Nama Anak">
                <input
                  type="text"
                  required={!data.child_id}
                  value={data.child_name}
                  onChange={(e) => update({ child_name: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="Tanggal Lahir Anak">
                <input
                  type="date"
                  required={!data.child_id}
                  value={data.child_dob}
                  onChange={(e) => update({ child_dob: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="Jenis Kelamin Anak">
                <div className="grid grid-cols-2 gap-3">
                  {(["L", "P"] as const).map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => update({ child_gender: g })}
                      className={`rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${
                        data.child_gender === g
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {g === "L" ? "Laki-laki" : "Perempuan"}
                    </button>
                  ))}
                </div>
                {!data.child_gender && (
                  <p className="text-xs text-text-secondary mt-1">Pilih salah satu.</p>
                )}
              </Field>
            </div>
          </div>

          <div className="border-t border-black/5 pt-6 space-y-4">
            <Field label="Hal utama yang ingin dikonsultasikan">
              <select
                required
                value={data.consultation_topic}
                onChange={(e) => update({ consultation_topic: e.target.value as never })}
                className={inputCls}
              >
                <option value="" disabled>Pilih kebutuhan</option>
                {CONSULTATION_TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Ceritakan singkat kondisi anak (Opsional)">
              <textarea
                rows={4}
                value={data.condition_notes}
                onChange={(e) => update({ condition_notes: e.target.value })}
                className={`${inputCls} !rounded-3xl min-h-[120px]`}
              />
            </Field>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!data.child_id && !data.child_gender}
            className="w-full rounded-full shadow-warm"
          >
            Lanjut Pilih Jadwal
          </Button>

          <div className="text-center">
            <AdminWhatsAppLink />
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const inputCls =
  "w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-text-primary">{label}</label>
      {children}
    </div>
  );
}
