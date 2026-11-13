import { useEffect, useState } from "react";
import { PenLine, KeyRound, Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { SignaturePad } from "@/features/reports/SignaturePad";

// Tanda Tangan & Akun — setiap staf mengatur identitas di laporan (nama, jabatan,
// izin praktik/SIPP/STR) + tanda tangan, dan mengganti kata sandi sendiri.

export function AccountView() {
  return (
    <div className="space-y-6 max-w-3xl">
      <SignatureSection />
      <ChangePasswordSection />
    </div>
  );
}

function SignatureSection() {
  const { profile, role } = useAuth();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [license, setLicense] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from("staff_signatures").select("*").eq("profile_id", profile.id).maybeSingle();
      const d = data as { display_name?: string; title?: string; license?: string; image_data?: string | null } | null;
      setName(d?.display_name ?? profile.full_name);
      setTitle(d?.title ?? (role === "psikolog" ? "Psikolog" : role === "terapis" ? "Terapis" : ""));
      setLicense(d?.license ?? "");
      setImage(d?.image_data ?? null);
      setLoading(false);
    })();
  }, [profile, role]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("staff_signatures").upsert(
      { profile_id: profile.id, display_name: name.trim(), title: title.trim(), license: license.trim(), image_data: image, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Tersimpan. Tanda tangan dipakai di semua laporan Anda.");
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <PenLine size={18} className="text-primary" /> Tanda Tangan di Laporan
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Muncul di bagian <i>"Jakarta, tanggal — Mengetahui"</i> pada setiap laporan yang Anda tulis, berdampingan dengan Penanggungjawab Klinik.
      </p>
      {loading ? (
        <div className="text-sm text-text-secondary flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Memuat…</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Nama + gelar</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></label>
            <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Jabatan</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Psikolog / Terapis Wicara" /></label>
            <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Izin praktik</span><input value={license} onChange={(e) => setLicense(e.target.value)} className="input" placeholder="SIPP: … / STR: …" /></label>
          </div>
          <SignaturePad value={image} onChange={setImage} />
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !name.trim()} className="rounded-full">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <><Save size={14} className="mr-1" /> Simpan</>}
            </Button>
          </div>
          {msg && <p className={`text-xs ${msg.startsWith("Error") ? "text-red" : "text-green-700"}`}>{msg}</p>}
        </div>
      )}
    </section>
  );
}

export function ChangePasswordSection({ onDone, forced = false }: { onDone?: () => void; forced?: boolean }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg("Error: kata sandi minimal 8 karakter.");
    if (pw !== pw2) return setMsg("Error: konfirmasi kata sandi tidak sama.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (!error) await supabase.rpc("mark_password_changed");
    setSaving(false);
    if (error) return setMsg(`Error: ${error.message}`);
    setPw("");
    setPw2("");
    setMsg("Kata sandi berhasil diganti.");
    onDone?.();
  }

  return (
    <section className={forced ? "" : "bg-white rounded-2xl border border-black/5 p-5"}>
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <KeyRound size={18} className="text-primary" /> {forced ? "Ganti kata sandi sementara" : "Ganti Kata Sandi"}
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        {forced ? "Akun Anda dibuat dengan kata sandi sementara. Demi keamanan rekam medis, ganti dulu sebelum melanjutkan." : "Minimal 8 karakter, kombinasikan huruf dan angka."}
      </p>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Kata sandi baru" className="input" required />
          <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Ulangi kata sandi baru" className="input" required />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="animate-spin" size={14} /> : "Simpan Kata Sandi"}
          </Button>
        </div>
        {msg && <p className={`text-xs ${msg.startsWith("Error") ? "text-red" : "text-green-700"}`}>{msg}</p>}
      </form>
    </section>
  );
}
