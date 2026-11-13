import { useEffect, useState } from "react";
import { FileText, Plus, Printer, X, Loader2, Save, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { fetchAssessedChildren } from "@/features/dashboard/queries";
import type { Child } from "@/types/database";
import { printWithTitle, isoDate } from "@/lib/print";
import { LifecycleActions, StatusBadge } from "@/features/reports/ReportLifecycle";
import { ReportModal } from "@/features/reports/PatientReportShell";
import { AssessmentDocument } from "@/features/reports/ReportDocuments";
import { takePrefill, type AnyReport } from "@/features/reports/reportKinds";

type Exam = {
  id: string;
  child_id: string;
  examination_date: string;
  patient_age: string | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  general_condition: Record<string, unknown>;
  language_aspects: Record<string, string>;
  motor_aspects: Record<string, string>;
  sensory_aspects: Record<string, string>;
  other_aspects: Record<string, unknown>;
  follow_up_plan: string[];
  additional_notes: string | null;
  subjective_info: string | null;
  objective_info: string | null;
  conclusion: string | null;
  created_at: string;
  examiner_id: string;
  status: "draft" | "terbit";
  deleted_at: string | null;
};

const LEVELS = [
  { v: "belum_berkembang", l: "Belum Berkembang" },
  { v: "mulai_berkembang", l: "Mulai Berkembang" },
  { v: "kurang_optimal", l: "Kurang Optimal" },
  { v: "optimal", l: "Optimal" },
];

const FOLLOW_UP_OPTIONS = [
  { v: "observasi_berkala", l: "Observasi berkala" },
  { v: "ases_lanjutan", l: "Ases lanjutan" },
  { v: "rujukan_medis", l: "Rujukan medis" },
  { v: "BT", l: "BT" },
  { v: "OT", l: "OT" },
  { v: "TW", l: "TW" },
  { v: "FT", l: "FT" },
  { v: "SI", l: "SI" },
];

export function ExaminationsView() {
  const { role, profile } = useAuth();
  const canWrite = role === "super_admin" || role === "psikolog";
  const [reloadKey, setReloadKey] = useState(0);

  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [detailExam, setDetailExam] = useState<Exam | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Hanya anak yang sudah mengisi assessment DAN sudah diberi RM oleh admin.
      // Anak dari booking online (belum punya RM) tidak muncul di sini.
      const data = await fetchAssessedChildren(500);
      setChildren(data);
      const pre = takePrefill();
      if (pre && data.some((c) => c.id === pre.child_id)) {
        setSelected(pre.child_id);
        setShowForm(true);
      } else if (data[0]) setSelected(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data } = await supabase
        .from("medical_examinations")
        .select("*")
        .eq("child_id", selected)
        .is("deleted_at", null)
        .order("examination_date", { ascending: false });
      // Draft milik orang lain tidak ditampilkan (kecuali Super Admin)
      setExams(((data as Exam[]) ?? []).filter((e) => e.status === "terbit" || role === "super_admin" || e.examiner_id === profile?.id));
    })();
  }, [selected, showForm, editExam, reloadKey, role, profile?.id]);

  if (loading) return <LoadingBlock />;
  if (children.length === 0)
    return (
      <EmptyState
        title="Belum ada pasien dengan RM"
        description="Pasien di sini hanya yang sudah mengisi Form Pendaftaran (flourishcare.id/assessment) dan sudah diberi Nomor RM oleh admin di tab Pendaftaran Pasien. Data booking online tidak muncul di sini."
        icon={FileText}
      />
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Sidebar list pasien */}
      <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5 overflow-hidden max-h-[70vh] overflow-y-auto">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`w-full text-left px-4 py-3 hover:bg-background transition-colors ${selected === c.id ? "bg-primary/5" : ""}`}
          >
            <p className="text-sm font-semibold">{c.full_name}</p>
            <p className="text-xs text-text-secondary font-mono">{c.rm_number}</p>
          </button>
        ))}
      </div>

      <div className="md:col-span-2 space-y-4">
        {selected && canWrite && (
          <Button onClick={() => setShowForm(true)} className="rounded-full shadow-warm">
            <Plus size={14} className="mr-1" /> Buat Laporan Pemeriksaan Baru (FRM-005)
          </Button>
        )}

        {exams.length === 0 ? (
          <EmptyState title="Belum ada laporan pemeriksaan" description="Klik tombol di atas untuk membuat laporan pertama." icon={FileText} />
        ) : (
          <div className="space-y-3">
            {exams.map((ex) => (
              <div key={ex.id} className="bg-white rounded-2xl border border-black/5 p-4 shadow-warm-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1"><StatusBadge row={ex as unknown as AnyReport} /></div>
                    <p className="font-semibold text-sm">
                      Pemeriksaan {new Date(ex.examination_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                    {ex.diagnosis && <p className="text-xs text-primary mt-1">Diagnosa: {ex.diagnosis}</p>}
                    {ex.chief_complaint && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{ex.chief_complaint}</p>}
                    {ex.follow_up_plan.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ex.follow_up_plan.map((p) => (
                          <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{p.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Button size="sm" variant="outline" onClick={() => setDetailExam(ex)} className="rounded-full border-2">
                      Detail
                    </Button>
                    {canWrite && (ex.examiner_id === profile?.id || role === "super_admin") && (
                      <Button size="sm" variant="outline" onClick={() => setEditExam(ex)} className="rounded-full border-2">
                        <Pencil size={12} className="mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                </div>
                <LifecycleActions kind="asesmen" row={ex as unknown as AnyReport} onChanged={() => setReloadKey((k) => k + 1)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && selected && (
        <ExaminationForm
          childId={selected}
          child={children.find((c) => c.id === selected)}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
      {editExam && (
        <ExaminationForm
          childId={editExam.child_id}
          child={children.find((c) => c.id === editExam.child_id)}
          initialExam={editExam}
          onClose={() => setEditExam(null)}
          onSaved={() => setEditExam(null)}
        />
      )}
      {detailExam && (
        <ExaminationDetail exam={detailExam} child={children.find((c) => c.id === detailExam.child_id)} onClose={() => setDetailExam(null)} />
      )}
    </div>
  );
}

// ============ Form Create Examination ============

function ExaminationForm({
  childId,
  child,
  initialExam,
  onClose,
  onSaved,
}: {
  childId: string;
  child: Child | undefined;
  initialExam?: Exam;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const isEdit = Boolean(initialExam?.id);

  const [examDate, setExamDate] = useState(
    initialExam?.examination_date ?? new Date().toISOString().slice(0, 10)
  );
  const [age, setAge] = useState(initialExam?.patient_age ?? "");
  const [complaint, setComplaint] = useState(initialExam?.chief_complaint ?? "");
  const [diagnosis, setDiagnosis] = useState(initialExam?.diagnosis ?? "");
  const [langAspects, setLangAspects] = useState<Record<string, string>>({
    joint_attention: (initialExam?.language_aspects?.joint_attention as string) ?? "",
    respon_panggil: (initialExam?.language_aspects?.respon_panggil as string) ?? "",
  });
  const [langNotes, setLangNotes] = useState({
    ekspresif: (initialExam?.language_aspects?.ekspresif as string) ?? "",
    reseptif: (initialExam?.language_aspects?.reseptif as string) ?? "",
  });
  const [motor, setMotor] = useState<Record<string, string>>({
    motorik_kasar: (initialExam?.motor_aspects?.motorik_kasar as string) ?? "",
    motorik_halus: (initialExam?.motor_aspects?.motorik_halus as string) ?? "",
  });
  const [sensory, setSensory] = useState<Record<string, string>>({
    taktil: (initialExam?.sensory_aspects?.taktil as string) ?? "",
    visual: (initialExam?.sensory_aspects?.visual as string) ?? "",
    auditori: (initialExam?.sensory_aspects?.auditori as string) ?? "",
    gustatori: (initialExam?.sensory_aspects?.gustatori as string) ?? "",
    olfactory: (initialExam?.sensory_aspects?.olfactory as string) ?? "",
    proprioceptive: (initialExam?.sensory_aspects?.proprioceptive as string) ?? "",
    introsceptive: (initialExam?.sensory_aspects?.introsceptive as string) ?? "",
    vestibular: (initialExam?.sensory_aspects?.vestibular as string) ?? "",
  });
  const [control, setControl] = useState<string>(
    (initialExam?.other_aspects as { control_impulse?: string })?.control_impulse ?? ""
  );
  const [regulasi, setRegulasi] = useState<string>(
    (initialExam?.other_aspects as { regulasi_emosi?: string })?.regulasi_emosi ?? ""
  );
  const [adaptasi, setAdaptasi] = useState<string>(
    (initialExam?.other_aspects as { kemampuan_adaptasi?: string })?.kemampuan_adaptasi ?? ""
  );
  const [followUp, setFollowUp] = useState<string[]>(initialExam?.follow_up_plan ?? []);
  const [notes, setNotes] = useState(initialExam?.additional_notes ?? "");
  const [subjective, setSubjective] = useState((initialExam as { subjective_info?: string } | undefined)?.subjective_info ?? "");
  const [objective, setObjective] = useState((initialExam as { objective_info?: string } | undefined)?.objective_info ?? "");
  const [conclusion, setConclusion] = useState(initialExam?.conclusion ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleFollowUp(v: string) {
    setFollowUp((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function save(status: "draft" | "terbit") {
    if (!profile) return;
    setSaving(true);
    setErr(null);
    const payload = {
      child_id: childId,
      status,
      examination_date: examDate,
      patient_age: age || null,
      chief_complaint: complaint || null,
      diagnosis: diagnosis || null,
      language_aspects: { ...langAspects, ekspresif: langNotes.ekspresif, reseptif: langNotes.reseptif },
      motor_aspects: motor,
      sensory_aspects: sensory,
      other_aspects: {
        control_impulse: control,
        regulasi_emosi: regulasi,
        kemampuan_adaptasi: adaptasi,
      },
      follow_up_plan: followUp,
      additional_notes: notes || null,
      subjective_info: subjective || null,
      objective_info: objective || null,
      conclusion: conclusion || null,
    };
    let error;
    if (isEdit && initialExam) {
      // UPDATE mode: preserve created_at & examiner_id lama kalau perlu
      const { error: e } = await supabase
        .from("medical_examinations")
        .update(payload)
        .eq("id", initialExam.id);
      error = e;
    } else {
      const { error: e } = await supabase.from("medical_examinations").insert({
        ...payload,
        examiner_id: profile.id,
        signed_at: new Date().toISOString(),
      });
      error = e;
    }
    setSaving(false);
    if (error) setErr(error.message);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full my-8 shadow-warm-lg">
        <div className="sticky top-0 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="font-heading font-bold text-lg">
              {isEdit ? "Edit Laporan Pemeriksaan" : "Laporan Pemeriksaan"} (FRM-005)
            </h2>
            <p className="text-xs text-text-secondary">Pasien: {child?.full_name} · RM {child?.rm_number}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="rounded-full"><X size={16} /></Button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tanggal Pemeriksaan"><input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Usia (contoh: 5 tahun 3 bulan)"><input type="text" value={age} onChange={(e) => setAge(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Keluhan Awal"><textarea rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)} className={textareaCls} /></Field>
          <Field label="Diagnosa"><input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className={inputCls} /></Field>

          <SectionHeader title="Aspek Bahasa" />
          <LevelPicker label="Joint Attention" value={langAspects.joint_attention} onChange={(v) => setLangAspects({ ...langAspects, joint_attention: v })} />
          <LevelPicker label="Respon Panggil" value={langAspects.respon_panggil} onChange={(v) => setLangAspects({ ...langAspects, respon_panggil: v })} />
          <Field label="Bahasa Ekspresif (deskripsi)"><textarea rows={2} value={langNotes.ekspresif} onChange={(e) => setLangNotes({ ...langNotes, ekspresif: e.target.value })} className={textareaCls} placeholder="Reflexive vocation, pointing, babbling, echolalia, true speech, komunikasi 2 arah, dst" /></Field>
          <Field label="Bahasa Reseptif"><textarea rows={2} value={langNotes.reseptif} onChange={(e) => setLangNotes({ ...langNotes, reseptif: e.target.value })} className={textareaCls} placeholder="Kemampuan memahami perintah" /></Field>

          <SectionHeader title="Aspek Motorik" />
          <LevelPicker label="Motorik Kasar" value={motor.motorik_kasar} onChange={(v) => setMotor({ ...motor, motorik_kasar: v })} />
          <LevelPicker label="Motorik Halus" value={motor.motorik_halus} onChange={(v) => setMotor({ ...motor, motorik_halus: v })} />

          <SectionHeader title="Aspek Sensorik" />
          {[
            { k: "taktil", l: "Taktil (Peraba)" },
            { k: "visual", l: "Visual (Penglihatan)" },
            { k: "auditori", l: "Auditori (Pendengaran)" },
            { k: "gustatori", l: "Gustatori (Perasa/Mulut)" },
            { k: "olfactory", l: "Olfactory (Penciuman)" },
            { k: "proprioceptive", l: "Proprioceptive" },
            { k: "introsceptive", l: "Introsceptive" },
            { k: "vestibular", l: "Vestibular" },
          ].map((s) => (
            <LevelPicker key={s.k} label={s.l} value={sensory[s.k] ?? ""} onChange={(v) => setSensory({ ...sensory, [s.k]: v })} />
          ))}

          <SectionHeader title="Aspek Lainnya" />
          <Field label="Control Impulse"><input type="text" value={control} onChange={(e) => setControl(e.target.value)} className={inputCls} placeholder="Impulsif / aktif / mampu perencanaan gerak" /></Field>
          <Field label="Regulasi Emosi"><input type="text" value={regulasi} onChange={(e) => setRegulasi(e.target.value)} className={inputCls} placeholder="Belum optimal / butuh koregulasi / adaptif" /></Field>
          <Field label="Kemampuan Adaptasi"><input type="text" value={adaptasi} onChange={(e) => setAdaptasi(e.target.value)} className={inputCls} placeholder="Berulang dominan / menarik diri / butuh bantuan / mampu" /></Field>

          <SectionHeader title="Rencana Lanjutan" />
          <div className="flex flex-wrap gap-2">
            {FOLLOW_UP_OPTIONS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => toggleFollowUp(o.v)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  followUp.includes(o.v) ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <Field label="Catatan Tambahan"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaCls} /></Field>
          <Field label="Informasi Subjektif (Prenatal, natal, postnatal, dll)"><textarea rows={3} value={subjective} onChange={(e) => setSubjective(e.target.value)} className={textareaCls} /></Field>
          <Field label="Informasi Objektif (Hasil observasi)"><textarea rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} className={textareaCls} /></Field>
          <Field label="Kesimpulan"><textarea rows={3} value={conclusion} onChange={(e) => setConclusion(e.target.value)} className={textareaCls} /></Field>

          {err && <div className="text-sm text-red bg-red/10 border border-red/20 rounded-2xl px-4 py-3">{err}</div>}

          <div className="flex justify-end gap-2 pt-4 border-t border-black/5">
            <Button variant="outline" onClick={onClose} className="rounded-full border-2">Batal</Button>
            {isEdit && initialExam?.status === "terbit" ? (
              <Button onClick={() => save("terbit")} disabled={saving} className="rounded-full shadow-warm">
                {saving ? <><Loader2 className="animate-spin mr-2" size={14} /> Menyimpan…</> : <><Save size={14} className="mr-2" /> Simpan Perubahan</>}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => save("draft")} disabled={saving} className="rounded-full border-2">
                  Simpan Draft
                </Button>
                <Button onClick={() => save("terbit")} disabled={saving} className="rounded-full shadow-warm">
                  {saving ? <><Loader2 className="animate-spin mr-2" size={14} /> Menyimpan…</> : <><Save size={14} className="mr-2" /> Simpan & Terbitkan</>}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Detail Modal ============

function ExaminationDetail({ exam, child, onClose }: { exam: Exam; child: Child | undefined; onClose: () => void }) {
  return (
    <ReportModal
      title="Laporan Hasil Asesmen (FRM-005)"
      subtitle={child ? `${child.full_name} · RM ${child.rm_number}` : undefined}
      onClose={onClose}
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            printWithTitle(
              `FRM-005_${child?.rm_number ?? "RM"}_${(child?.full_name ?? "").replace(/\s+/g, "-")}_${isoDate(exam.examination_date)}`
            )
          }
          className="rounded-full border-2"
        >
          <Printer size={14} className="mr-1" /> Print / PDF
        </Button>
      }
    >
      {child && <AssessmentDocument row={exam as unknown as AnyReport} child={child} />}
    </ReportModal>
  );
}


// ============ Small helpers ============
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function SectionHeader({ title }: { title: string }) {
  return <h3 className="font-heading font-bold text-base pb-1 mb-2 border-b border-primary/30 text-primary mt-4">{title}</h3>;
}
function LevelPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((lv) => (
          <button
            key={lv.v}
            type="button"
            onClick={() => onChange(lv.v)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              value === lv.v ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
            }`}
          >
            {lv.l}
          </button>
        ))}
      </div>
    </Field>
  );
}
const inputCls = "w-full rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const textareaCls = "w-full rounded-2xl border border-black/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
