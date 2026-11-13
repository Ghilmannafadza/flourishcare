import { useEffect, useState } from "react";
import { dmyToIso, isoLocal, maskDmy } from "@/lib/dates";
import { toWaNumber } from "@/lib/wa";

// Pilihan layanan formulir pendaftaran (serah-terima PM)
const REG_SERVICES: Array<[string, string]> = [
  ["TERAPI", "Terapi di klinik (SI / TW / OT / BT)"],
  ["KONSUL", "Assessment/Konsultasi Psikolog On-Site"],
  ["PSIKOTES", "Psikotes"],
];
const DRAFT_KEY = "fc_draft_daftar";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

type Sibling = {
  name: string;
  gender: "L" | "P" | "";
  order: string;
  age: string;
};

type FormData = {
  // Bagian A - Identitas Pasien
  patient_name: string;
  place_of_birth: string;
  date_of_birth: string;
  gender: "L" | "P" | "";
  religion: string;
  ethnicity: string;
  parent_hopes: string;
  therapy_history: string;
  consultation_history: string;
  chief_complaint: string;
  disease_history: string;
  birth_history: string;
  development_history: string;
  child_order: string;
  child_status: "kandung" | "angkat" | "";

  // Bagian B - Ayah
  father_name: string;
  father_pob: string;
  father_dob: string;
  father_religion: string;
  father_address: string;
  father_occupation: string;
  father_marriage_order: string;
  father_marriage_age: string;
  father_education: string;

  // Bagian B - Ibu
  mother_name: string;
  mother_pob: string;
  mother_dob: string;
  mother_religion: string;
  mother_address: string;
  mother_occupation: string;
  mother_marriage_order: string;
  mother_marriage_age: string;
  mother_education: string;

  // Bagian C - Saudara
  siblings: Sibling[];

  submitter_email: string;
  requested_service: string;
  contact_whatsapp: string;
  consent: boolean;
};

const DEFAULT: FormData = {
  patient_name: "", place_of_birth: "", date_of_birth: "", gender: "",
  religion: "", ethnicity: "", parent_hopes: "", therapy_history: "",
  consultation_history: "", chief_complaint: "", disease_history: "",
  birth_history: "", development_history: "", child_order: "", child_status: "",
  father_name: "", father_pob: "", father_dob: "", father_religion: "",
  father_address: "", father_occupation: "", father_marriage_order: "",
  father_marriage_age: "", father_education: "",
  mother_name: "", mother_pob: "", mother_dob: "", mother_religion: "",
  mother_address: "", mother_occupation: "", mother_marriage_order: "",
  mother_marriage_age: "", mother_education: "",
  siblings: [],
  submitter_email: "",
  requested_service: "",
  contact_whatsapp: "",
  consent: false,
};

export function AssessmentForm() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<FormData>(() => {
    // Isian tersimpan otomatis di perangkat dan dipulihkan bila halaman tertutup (maks. 7 hari)
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { t: number; v: FormData };
        if (Date.now() - d.t < 7 * 864e5) return { ...DEFAULT, ...d.v, consent: false };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT, submitter_email: session?.user.email ?? "" };
  });
  const [restored] = useState(() => {
    try {
      return !!localStorage.getItem(DRAFT_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ t: Date.now(), v: data }));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [data]);

  // Validasi tanggal dd/mm/yyyy (tidak boleh di masa depan)
  function dateErr(label: string, v: string, required: boolean): string | null {
    if (!v.trim()) return required ? `${label} wajib diisi (format dd/mm/yyyy).` : null;
    const iso = dmyToIso(v);
    if (!iso) return `${label}: tanggal belum valid. Gunakan format dd/mm/yyyy.`;
    if (iso > isoLocal()) return `${label}: tanggal tidak boleh di masa depan.`;
    return null;
  }
  const step1Err =
    (!data.requested_service && "Pilih layanan yang dibutuhkan.") ||
    dateErr("Tanggal lahir pasien", data.date_of_birth, true) ||
    (toWaNumber(data.contact_whatsapp).length < 10 ? "Nomor WhatsApp orang tua wajib diisi." : null);
  const step2Err = (!data.mother_name.trim() && "Nama ibu wajib diisi.") || dateErr("Tanggal lahir ayah", data.father_dob, false) || dateErr("Tanggal lahir ibu", data.mother_dob, false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function addSibling() {
    setData((d) => ({ ...d, siblings: [...d.siblings, { name: "", gender: "", order: "", age: "" }] }));
  }
  function updateSibling(i: number, patch: Partial<Sibling>) {
    setData((d) => ({
      ...d,
      siblings: d.siblings.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }
  function removeSibling(i: number) {
    setData((d) => ({ ...d, siblings: d.siblings.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // GUARD: hanya submit kalau user memang di step 3 (klik tombol Submit Form).
    // Cegah bug: tekan Enter di input step 1/2 memicu submit form.
    if (step !== 3) return;
    setError(null);
    if (!data.consent) {
      setError("Centang pernyataan persetujuan terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: err } = await supabase.from("patient_registrations").insert({
        submitter_email: data.submitter_email || null,
        requested_service: data.requested_service || null,
        contact_whatsapp: toWaNumber(data.contact_whatsapp) || null,
        source: "web",
        submitter_user_id: session?.user.id ?? null,
        patient_name: data.patient_name,
        place_of_birth: data.place_of_birth || null,
        date_of_birth: dmyToIso(data.date_of_birth),
        gender: data.gender || "L",
        religion: data.religion || null,
        ethnicity: data.ethnicity || null,
        parent_hopes: data.parent_hopes || null,
        therapy_history: data.therapy_history || null,
        consultation_history: data.consultation_history || null,
        chief_complaint: data.chief_complaint || null,
        disease_history: data.disease_history || null,
        birth_history: data.birth_history || null,
        development_history: data.development_history || null,
        child_order: data.child_order ? Number(data.child_order) : null,
        child_status: data.child_status || null,
        father_name: data.father_name || null,
        father_pob: data.father_pob || null,
        father_dob: dmyToIso(data.father_dob),
        father_religion: data.father_religion || null,
        father_address: data.father_address || null,
        father_occupation: data.father_occupation || null,
        father_marriage_order: data.father_marriage_order ? Number(data.father_marriage_order) : null,
        father_marriage_age: data.father_marriage_age ? Number(data.father_marriage_age) : null,
        father_education: data.father_education || null,
        mother_name: data.mother_name || null,
        mother_pob: data.mother_pob || null,
        mother_dob: dmyToIso(data.mother_dob),
        mother_religion: data.mother_religion || null,
        mother_address: data.mother_address || null,
        mother_occupation: data.mother_occupation || null,
        mother_marriage_order: data.mother_marriage_order ? Number(data.mother_marriage_order) : null,
        mother_marriage_age: data.mother_marriage_age ? Number(data.mother_marriage_age) : null,
        mother_education: data.mother_education || null,
        siblings: data.siblings,
        status: "pending_rm",
      });
      if (err) throw err;
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      navigate("/success");
    } catch (e) {
      setError((e as Error).message ?? "Gagal submit form.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-6 md:p-8 border border-black/5 shadow-warm">
        {/* Progress bar step */}
        <div className="flex items-center gap-2 mb-6 text-xs">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${step >= s ? "bg-primary" : "bg-black/10"}`} />
          ))}
        </div>
        <p className="text-xs text-text-secondary mb-2">Bagian {step} dari 3</p>

        {step === 1 && (
          <>
            <h2 className="text-xl font-heading font-bold mb-1 uppercase tracking-wider text-primary">A. Identitas Pasien</h2>
            <p className="text-xs text-text-secondary mb-6">Data anak/pasien yang akan mendapatkan layanan</p>
            {restored && (
              <p className="text-xs text-text-secondary bg-background rounded-xl px-3 py-2 mb-4">Isian sebelumnya dipulihkan dari perangkat ini.</p>
            )}

            <div className="space-y-4">
              <Field label="Layanan yang dibutuhkan" required>
                <div className="grid grid-cols-1 gap-2">
                  {REG_SERVICES.map(([k, l]) => (
                    <button key={k} type="button" onClick={() => set("requested_service", k)}
                      className={`text-left rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                        data.requested_service === k ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 hover:border-primary/40"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Nama Pasien" required>
                <input type="text" required value={data.patient_name} onChange={(e) => set("patient_name", e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tempat Lahir" required>
                  <input type="text" required value={data.place_of_birth} onChange={(e) => set("place_of_birth", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Tanggal Lahir (dd/mm/yyyy)" required>
                  <input type="text" inputMode="numeric" required placeholder="dd/mm/yyyy" value={data.date_of_birth} onChange={(e) => set("date_of_birth", maskDmy(e.target.value))} className={inputCls} />
                </Field>
              </div>
              <Field label="Jenis Kelamin" required>
                <div className="grid grid-cols-2 gap-3">
                  {(["L", "P"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => set("gender", g)}
                      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                        data.gender === g ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 hover:border-primary/40"
                      }`}>
                      {g === "L" ? "Laki-laki" : "Perempuan"}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Agama"><input type="text" value={data.religion} onChange={(e) => set("religion", e.target.value)} className={inputCls} /></Field>
                <Field label="Suku"><input type="text" value={data.ethnicity} onChange={(e) => set("ethnicity", e.target.value)} className={inputCls} /></Field>
              </div>
              <Field label="Harapan (dari orang tua terhadap tumbuh kembang anak)">
                <textarea rows={2} value={data.parent_hopes} onChange={(e) => set("parent_hopes", e.target.value)} className={textareaCls} />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Riwayat Terapi (sebelumnya)"><textarea rows={2} value={data.therapy_history} onChange={(e) => set("therapy_history", e.target.value)} className={textareaCls} /></Field>
                <Field label="Riwayat Konsultasi"><textarea rows={2} value={data.consultation_history} onChange={(e) => set("consultation_history", e.target.value)} className={textareaCls} /></Field>
              </div>

              <div className="pt-4 border-t border-black/5">
                <p className="text-sm font-semibold mb-3">Riwayat Keluhan</p>
                <div className="space-y-4">
                  <Field label="a. Keluhan Utama" required>
                    <textarea required rows={2} value={data.chief_complaint} onChange={(e) => set("chief_complaint", e.target.value)} className={textareaCls} />
                  </Field>
                  <Field label="b. Riwayat Penyakit"><textarea rows={2} value={data.disease_history} onChange={(e) => set("disease_history", e.target.value)} className={textareaCls} /></Field>
                  <Field label="c. Riwayat Kelahiran"><textarea rows={2} value={data.birth_history} onChange={(e) => set("birth_history", e.target.value)} className={textareaCls} /></Field>
                  <Field label="d. Riwayat Tumbuh Kembang"><textarea rows={2} value={data.development_history} onChange={(e) => set("development_history", e.target.value)} className={textareaCls} /></Field>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Anak ke-"><input type="number" min={1} value={data.child_order} onChange={(e) => set("child_order", e.target.value)} className={inputCls} /></Field>
                <Field label="Status Anak" required>
                  <div className="grid grid-cols-2 gap-3">
                    {(["kandung", "angkat"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => set("child_status", s)}
                        className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                          data.child_status === s ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 hover:border-primary/40"
                        }`}>
                        {s === "kandung" ? "Kandung" : "Angkat"}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="No. WhatsApp orang tua" required>
                  <input type="tel" inputMode="tel" required value={data.contact_whatsapp} onChange={(e) => set("contact_whatsapp", e.target.value)} placeholder="08xx" className={inputCls} />
                </Field>
                <Field label="Email (opsional)">
                  <input type="email" value={data.submitter_email} onChange={(e) => set("submitter_email", e.target.value)} placeholder="nama@email.com" className={inputCls} />
                </Field>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-heading font-bold mb-1 uppercase tracking-wider text-primary">B. Identitas Orang Tua / Wali</h2>
            <p className="text-xs text-text-secondary mb-6">Data lengkap ayah dan ibu / wali</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ParentColumn
                title="Ayah"
                prefix="father"
                data={data}
                set={set}
              />
              <ParentColumn
                title="Ibu"
                prefix="mother"
                data={data}
                set={set}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-heading font-bold mb-1 uppercase tracking-wider text-primary">C. Identitas Saudara <span className="text-text-secondary normal-case font-normal text-sm">(Jika Ada)</span></h2>
            <p className="text-xs text-text-secondary mb-6">Data saudara kandung/tiri anak. Bisa ditambahkan lebih dari satu.</p>

            {data.siblings.length === 0 ? (
              <div className="bg-background rounded-2xl p-6 border border-dashed border-black/10 text-center">
                <p className="text-sm text-text-secondary mb-3">Belum ada data saudara.</p>
                <Button type="button" size="sm" onClick={addSibling} className="rounded-full">
                  <Plus size={14} className="mr-1" /> Tambah Saudara
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.siblings.map((s, i) => (
                  <div key={i} className="bg-background rounded-2xl p-4 border border-black/5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">Saudara {i + 1}</p>
                      <button type="button" onClick={() => removeSibling(i)} className="text-red hover:bg-red/10 p-2 rounded-full" aria-label="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Nama">
                        <input type="text" value={s.name} onChange={(e) => updateSibling(i, { name: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Jenis Kelamin">
                        <div className="grid grid-cols-2 gap-2">
                          {(["L", "P"] as const).map((g) => (
                            <button key={g} type="button" onClick={() => updateSibling(i, { gender: g })}
                              className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                                s.gender === g ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10"
                              }`}>
                              {g === "L" ? "Laki-laki" : "Perempuan"}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Anak ke-"><input type="number" min={1} value={s.order} onChange={(e) => updateSibling(i, { order: e.target.value })} className={inputCls} /></Field>
                      <Field label="Usia"><input type="text" value={s.age} onChange={(e) => updateSibling(i, { age: e.target.value })} placeholder="Contoh: 8 tahun" className={inputCls} /></Field>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSibling} className="rounded-full border-2">
                  <Plus size={14} className="mr-1" /> Tambah Saudara Lain
                </Button>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <label className="mt-6 flex items-start gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={data.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-1" />
            Saya menyatakan data di atas benar dan setuju data ini digunakan FlourishCare untuk keperluan layanan.
          </label>
        )}
        {step < 3 && (step === 1 ? step1Err : step2Err) && (
          <p className="mt-6 text-xs text-text-secondary">{step === 1 ? step1Err : step2Err}</p>
        )}
        {error && (
          <div className="mt-6 text-sm text-red bg-red/10 border border-red/20 rounded-2xl px-4 py-3">{error}</div>
        )}

        {/* Nav buttons */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep((step - 1) as 1 | 2 | 3)} className="rounded-full border-2">
              <ChevronLeft size={16} className="mr-1" /> Kembali
            </Button>
          ) : <span />}

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((step + 1) as 1 | 2 | 3)}
              className="rounded-full shadow-warm"
              disabled={
                (step === 1 && (!data.patient_name || !data.gender || !data.child_status || !data.chief_complaint || !!step1Err)) ||
                (step === 2 && !!step2Err)
              }
            >
              Lanjut <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting} className="rounded-full shadow-warm">
              {submitting ? <><Loader2 className="animate-spin mr-2" size={16} /> Mengirim…</> : <><Send size={16} className="mr-2" /> Submit Form</>}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// Reusable field
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label}{required && <span className="text-red ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const textareaCls =
  "w-full rounded-2xl border border-black/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

// Parent (Ayah/Ibu) column
type ParentPrefix = "father" | "mother";

function ParentColumn({
  title,
  prefix,
  data,
  set,
}: {
  title: string;
  prefix: ParentPrefix;
  data: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const g = (k: string) => `${prefix}_${k}` as keyof FormData;
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-primary">{title}</p>
      <Field label="Nama" required={prefix === "mother"}><input type="text" required={prefix === "mother"} value={data[g("name")] as string} onChange={(e) => set(g("name") as keyof FormData, e.target.value as never)} className={inputCls} /></Field>
      <Field label="Tempat Lahir"><input type="text" value={data[g("pob")] as string} onChange={(e) => set(g("pob") as keyof FormData, e.target.value as never)} className={inputCls} /></Field>
      <Field label="Tanggal Lahir (dd/mm/yyyy)"><input type="text" inputMode="numeric" placeholder="dd/mm/yyyy" value={data[g("dob")] as string} onChange={(e) => set(g("dob") as keyof FormData, maskDmy(e.target.value) as never)} className={inputCls} /></Field>
      <Field label="Agama"><input type="text" value={data[g("religion")] as string} onChange={(e) => set(g("religion") as keyof FormData, e.target.value as never)} className={inputCls} /></Field>
      <Field label="Alamat"><textarea rows={2} value={data[g("address")] as string} onChange={(e) => set(g("address") as keyof FormData, e.target.value as never)} className={textareaCls} /></Field>
      <Field label="Pekerjaan"><input type="text" value={data[g("occupation")] as string} onChange={(e) => set(g("occupation") as keyof FormData, e.target.value as never)} className={inputCls} /></Field>
      <Field label="Pernikahan ke-"><input type="number" min={1} value={data[g("marriage_order")] as string} onChange={(e) => set(g("marriage_order") as keyof FormData, e.target.value as never)} className={inputCls} /></Field>
      <Field label="Usia saat Menikah"><input type="number" min={0} value={data[g("marriage_age")] as string} onChange={(e) => set(g("marriage_age") as keyof FormData, e.target.value as never)} className={inputCls} /></Field>
      <Field label="Pendidikan Terakhir"><input type="text" value={data[g("education")] as string} onChange={(e) => set(g("education") as keyof FormData, e.target.value as never)} className={inputCls} /></Field>
    </div>
  );
}
