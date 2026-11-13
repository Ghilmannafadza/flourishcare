import { useEffect, useMemo, useState } from "react";
import { LineChart, Printer, Plus, Eye, X, Pencil, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { useAuth } from "@/providers/AuthProvider";
import { printWithTitle, isoDate } from "@/lib/print";
import { LifecycleActions, StatusBadge } from "@/features/reports/ReportLifecycle";
import { ReportModal, SaveBar } from "@/features/reports/PatientReportShell";
import { SessionDocument } from "@/features/reports/ReportDocuments";
import { DraftBanner, clearDraft, useAutosave } from "@/features/reports/autosave";
import { substituteFor, takePrefill, type AnyReport } from "@/features/reports/reportKinds";

type Child = { id: string; rm_number: string; full_name: string; dob: string; gender: "L" | "P" };

type Activity = { activity: string; duration: string; assistance: string; response: string };

type Report = {
  id: string;
  child_id: string;
  therapy_date: string;
  session_number: number | null;
  total_sessions: number | null;
  therapist_name: string;
  mood: "baik" | "cukup" | "kurang_tenang" | null;
  energy: "tinggi" | "sedang" | "rendah" | null;
  activities: Activity[] | null;
  obstacles: string[] | null;
  home_program: string | null;
  notes: string | null;
  created_at: string;
  // siklus laporan (migrasi 0009)
  therapist_id: string;
  therapy_type: string | null;
  status: "draft" | "terbit";
  deleted_at: string | null;
  edited_after_publish_at: string | null;
  withdrawn_at: string | null;
  published_at: string | null;
  history: AnyReport["history"];
  substitute_for: string | null;
};

const THERAPY_TYPES = [
  { v: "BT", l: "Behaviour Therapy (BT)" },
  { v: "SI", l: "Sensory Integration (SI)" },
  { v: "OT", l: "Occupational Therapy (OT)" },
  { v: "TW", l: "Speech Therapy (TW)" },
];

const MOOD_OPTS: Array<{ v: NonNullable<Report["mood"]>; l: string }> = [
  { v: "baik", l: "Baik" },
  { v: "cukup", l: "Cukup" },
  { v: "kurang_tenang", l: "Kurang Tenang" },
];
const ENERGY_OPTS: Array<{ v: NonNullable<Report["energy"]>; l: string }> = [
  { v: "tinggi", l: "Tinggi" },
  { v: "sedang", l: "Sedang" },
  { v: "rendah", l: "Rendah" },
];
const OBSTACLES = [
  "menolak",
  "terdistraksi",
  "tantrum",
  "menangis",
  "sulit_transisi",
  "sensitif_sensori",
  "agresif",
  "tidak_ada",
];

export function DevelopmentReportsView() {
  const { profile, role } = useAuth();
  const canWrite = role === "terapis" || role === "psikolog" || role === "super_admin";
  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editReport, setEditReport] = useState<Report | null>(null);
  const [detail, setDetail] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: kids } = await supabase
        .from("children")
        .select("id, rm_number, full_name, dob, gender")
        .not("rm_number", "is", null)
        .order("full_name");
      setChildren((kids as Child[]) ?? []);
      const pre = takePrefill();
      if (pre && (kids ?? []).some((k: { id: string }) => k.id === pre.child_id)) {
        setSelectedChild(pre.child_id);
        setFormOpen(true);
      }
      const { data: rpts } = await supabase
        .from("development_reports")
        .select("*")
        .is("deleted_at", null)
        .order("therapy_date", { ascending: false });
      setReports((rpts as Report[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const child = useMemo(() => children.find((c) => c.id === selectedChild) ?? null, [children, selectedChild]);
  // Draft milik orang lain tidak ditampilkan (kecuali Super Admin)
  const childReports = useMemo(
    () =>
      reports.filter(
        (r) => r.child_id === selectedChild && (r.status === "terbit" || role === "super_admin" || r.therapist_id === profile?.id)
      ),
    [reports, selectedChild, role, profile?.id]
  );

  async function refresh() {
    const { data } = await supabase.from("development_reports").select("*").is("deleted_at", null).order("therapy_date", { ascending: false });
    setReports((data as Report[]) ?? []);
  }

  if (loading) return <LoadingBlock label="Memuat data…" />;
  if (!children.length)
    return (
      <EmptyState
        icon={LineChart}
        title="Belum ada pasien dengan RM"
        description="Pasien di sini hanya yang sudah mengisi Form Pendaftaran (assessment.flourishcare.id) dan sudah diberi Nomor RM oleh admin di tab Pendaftaran Pasien. Data booking online tidak muncul di sini."
      />
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <aside className="bg-white rounded-2xl border border-black/5 p-3">
        <h3 className="font-heading font-bold text-sm px-2 py-2 text-text-secondary">Pasien</h3>
        <ul className="space-y-1 max-h-[70vh] overflow-y-auto">
          {children.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedChild(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedChild === c.id ? "bg-primary text-white" : "hover:bg-primary/5"
                }`}
              >
                <p className="font-semibold truncate">{c.full_name}</p>
                <p className="text-[11px] opacity-80">{c.rm_number}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section>
        {!child ? (
          <EmptyState icon={LineChart} title="Pilih pasien" description="Pilih pasien untuk melihat laporan perkembangan." />
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading font-extrabold text-xl">{child.full_name}</h2>
                <p className="text-xs text-text-secondary">RM {child.rm_number} · FRM-008 Laporan Perkembangan</p>
              </div>
              {canWrite && (
                <Button size="sm" className="rounded-full" onClick={() => setFormOpen(true)}>
                  <Plus size={16} className="mr-1" /> Laporan Baru
                </Button>
              )}
            </div>

            {childReports.length === 0 ? (
              <p className="text-sm text-text-secondary italic py-8 text-center">Belum ada laporan perkembangan.</p>
            ) : (
              <ul className="space-y-2">
                {childReports.map((r) => (
                  <li key={r.id} className="border border-black/5 rounded-xl p-3">
                   <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="mb-1"><StatusBadge row={r as unknown as AnyReport} /></div>
                      <p className="font-semibold text-sm">
                        Sesi {r.session_number ?? "-"}
                        {r.total_sessions ? `/${r.total_sessions}` : ""} · {new Date(r.therapy_date).toLocaleDateString("id-ID")}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {r.therapy_type ? `${r.therapy_type} · ` : ""}Terapis: {r.therapist_name} · Mood: {r.mood ?? "-"} · Energi: {r.energy ?? "-"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDetail(r)}>
                        <Eye size={14} className="mr-1" /> Detail
                      </Button>
                      {(r.therapist_id === profile?.id || role === "super_admin") && (
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditReport(r)}>
                          <Pencil size={14} className="mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                   </div>
                   <LifecycleActions kind="sesi" row={r as unknown as AnyReport} onChanged={refresh} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {formOpen && child && (
          <ReportForm
            child={child}
            defaultTherapist={profile?.full_name ?? ""}
            therapistId={profile?.id ?? ""}
            lastReport={childReports[0]}
            onClose={() => setFormOpen(false)}
            onSaved={() => {
              setFormOpen(false);
              refresh();
            }}
          />
        )}
        {editReport && child && (
          <ReportForm
            child={child}
            defaultTherapist={profile?.full_name ?? ""}
            therapistId={profile?.id ?? ""}
            initialReport={editReport}
            onClose={() => setEditReport(null)}
            onSaved={() => {
              setEditReport(null);
              refresh();
            }}
          />
        )}
        {detail && <ReportDetail report={detail} child={child!} onClose={() => setDetail(null)} />}
      </section>
    </div>
  );
}

function ReportForm({
  child,
  defaultTherapist,
  therapistId,
  initialReport,
  lastReport,
  onClose,
  onSaved,
}: {
  child: Child;
  defaultTherapist: string;
  therapistId: string;
  initialReport?: Report;
  lastReport?: Report;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initialReport?.id);
  const [saving, setSaving] = useState(false);
  const [therapyDate, setTherapyDate] = useState(
    initialReport?.therapy_date ?? new Date().toISOString().slice(0, 10)
  );
  const [sessionNumber, setSessionNumber] = useState<string>(
    String(initialReport?.session_number ?? "")
  );
  const [totalSessions, setTotalSessions] = useState<string>(
    String(initialReport?.total_sessions ?? "12")
  );
  const [therapistName, setTherapistName] = useState(initialReport?.therapist_name ?? defaultTherapist);
  const [mood, setMood] = useState<Report["mood"]>(initialReport?.mood ?? "baik");
  const [energy, setEnergy] = useState<Report["energy"]>(initialReport?.energy ?? "sedang");
  const [activities, setActivities] = useState<Activity[]>(
    initialReport?.activities?.length
      ? initialReport.activities
      : [{ activity: "", duration: "", assistance: "", response: "" }]
  );
  const [obstacles, setObstacles] = useState<string[]>(initialReport?.obstacles ?? []);
  const [homeProgram, setHomeProgram] = useState(initialReport?.home_program ?? "");
  const [notes, setNotes] = useState(initialReport?.notes ?? "");
  const [therapyType, setTherapyType] = useState<string>(initialReport?.therapy_type ?? lastReport?.therapy_type ?? "");
  const [error, setError] = useState<string | null>(null);

  // Simpan otomatis di perangkat (tawaran Pulihkan / Buang saat dibuka lagi)
  const draftKey = `sesi_${child.id}_${initialReport?.id ?? "new"}`;
  const snapshot = { therapyDate, sessionNumber, totalSessions, therapistName, mood, energy, activities, obstacles, homeProgram, notes, therapyType };
  useAutosave(draftKey, snapshot);
  function restore(v: typeof snapshot) {
    setTherapyDate(v.therapyDate); setSessionNumber(v.sessionNumber); setTotalSessions(v.totalSessions);
    setTherapistName(v.therapistName); setMood(v.mood); setEnergy(v.energy); setActivities(v.activities);
    setObstacles(v.obstacles); setHomeProgram(v.homeProgram); setNotes(v.notes); setTherapyType(v.therapyType);
  }
  // "Salin dari sesi lalu": aktivitas, program rumah, jenis terapi, nomor sesi berikutnya
  function copyFromLast() {
    if (!lastReport) return;
    setActivities((lastReport.activities ?? []).map((a) => ({ ...a, response: "" })));
    setHomeProgram(lastReport.home_program ?? "");
    setTherapyType(lastReport.therapy_type ?? "");
    setTotalSessions(String(lastReport.total_sessions ?? "12"));
    if (lastReport.session_number) setSessionNumber(String(Number(lastReport.session_number) + 1));
  }

  function toggleObstacle(o: string) {
    setObstacles((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  async function submit(status: "draft" | "terbit") {
    setError(null);
    if (!therapistId) {
      setError("Profil terapis belum ter-load. Refresh halaman lalu coba lagi.");
      return;
    }
    setSaving(true);
    const sesNum = sessionNumber ? Number(sessionNumber) : null;
    const sesTot = totalSessions ? Number(totalSessions) : 12;
    const payload = {
      child_id: child.id,
      therapy_date: therapyDate,
      therapy_type: therapyType || null,
      status,
      session_no: sesNum,
      session_number: sesNum,
      session_total: sesTot,
      total_sessions: sesTot,
      therapist_name: therapistName,
      mood,
      energy,
      activities,
      obstacles,
      home_program: homeProgram || null,
      notes: notes || null,
    };
    let error;
    if (isEdit && initialReport) {
      const { error: e } = await supabase
        .from("development_reports")
        .update(payload)
        .eq("id", initialReport.id);
      error = e;
    } else {
      const sub = await substituteFor(child.id, therapyType, therapistId);
      const { error: e } = await supabase
        .from("development_reports")
        .insert({ ...payload, therapist_id: therapistId, substitute_for: sub });
      error = e;
    }
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    clearDraft(draftKey);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-lg">{isEdit ? "Edit Laporan Perkembangan" : "Laporan Perkembangan Baru"}</h3>
            <p className="text-xs text-text-secondary">{child.full_name} · RM {child.rm_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <DraftBanner<typeof snapshot> storageKey={draftKey} onRestore={restore} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <Field label="Jenis Terapi (format MDxFlourishCare-FRM-008)">
                <select value={therapyType} onChange={(e) => setTherapyType(e.target.value)} className="input">
                  <option value="">Pilih jenis terapi</option>
                  {THERAPY_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </Field>
            </div>
            {!isEdit && lastReport && (
              <Button type="button" variant="outline" size="sm" className="rounded-full border-2" onClick={copyFromLast}>
                <Copy size={14} className="mr-1" /> Salin dari sesi lalu
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Tanggal Terapi">
              <input type="date" value={therapyDate} onChange={(e) => setTherapyDate(e.target.value)} className="input" />
            </Field>
            <Field label="Sesi Ke-">
              <input type="number" value={sessionNumber} onChange={(e) => setSessionNumber(e.target.value)} className="input" placeholder="1" />
            </Field>
            <Field label="Dari Total">
              <input type="number" value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)} className="input" placeholder="12" />
            </Field>
            <Field label="Nama Terapis">
              <input value={therapistName} onChange={(e) => setTherapistName(e.target.value)} className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Mood">
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTS.map((o) => (
                  <Pill key={o.v} active={mood === o.v} onClick={() => setMood(o.v)}>
                    {o.l}
                  </Pill>
                ))}
              </div>
            </Field>
            <Field label="Energi">
              <div className="flex flex-wrap gap-2">
                {ENERGY_OPTS.map((o) => (
                  <Pill key={o.v} active={energy === o.v} onClick={() => setEnergy(o.v)}>
                    {o.l}
                  </Pill>
                ))}
              </div>
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading font-bold text-sm">Aktivitas Sesi</h4>
              <button
                onClick={() =>
                  setActivities((a) => [...a, { activity: "", duration: "", assistance: "", response: "" }])
                }
                className="text-primary text-xs font-semibold hover:underline"
              >
                + Tambah aktivitas
              </button>
            </div>
            <div className="space-y-2">
              {activities.map((a, i) => (
                <div key={i} className="border border-black/10 rounded-xl p-3 grid grid-cols-1 md:grid-cols-[1fr_100px_140px_1fr_28px] gap-2">
                  <input
                    placeholder="Aktivitas"
                    value={a.activity}
                    onChange={(e) => setActivities((arr) => arr.map((x, idx) => (idx === i ? { ...x, activity: e.target.value } : x)))}
                    className="input"
                  />
                  <input
                    placeholder="Durasi"
                    value={a.duration}
                    onChange={(e) => setActivities((arr) => arr.map((x, idx) => (idx === i ? { ...x, duration: e.target.value } : x)))}
                    className="input"
                  />
                  <input
                    placeholder="Bantuan (mandiri/verbal/fisik)"
                    value={a.assistance}
                    onChange={(e) => setActivities((arr) => arr.map((x, idx) => (idx === i ? { ...x, assistance: e.target.value } : x)))}
                    className="input"
                  />
                  <input
                    placeholder="Respon anak"
                    value={a.response}
                    onChange={(e) => setActivities((arr) => arr.map((x, idx) => (idx === i ? { ...x, response: e.target.value } : x)))}
                    className="input"
                  />
                  <button
                    onClick={() => setActivities((arr) => arr.filter((_, idx) => idx !== i))}
                    className="text-red hover:bg-red/10 rounded-lg p-1 self-center"
                    aria-label="Hapus"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-2">Hambatan Selama Sesi</h4>
            <div className="flex flex-wrap gap-2">
              {OBSTACLES.map((o) => (
                <Pill key={o} active={obstacles.includes(o)} onClick={() => toggleObstacle(o)}>
                  {o.replace(/_/g, " ")}
                </Pill>
              ))}
            </div>
          </div>

          <Field label="Home Program (aktivitas untuk orang tua)">
            <textarea rows={3} value={homeProgram} onChange={(e) => setHomeProgram(e.target.value)} className="input" />
          </Field>

          <Field label="Catatan Terapis">
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
          </Field>

        </div>

        <SaveBar saving={saving} error={error} onSave={submit} isEdit={isEdit} currentStatus={initialReport?.status} />
      </div>
    </div>
  );
}

function ReportDetail({ report, child, onClose }: { report: Report; child: Child; onClose: () => void }) {
  return (
    <ReportModal
      title="Laporan Sesi Terapi (FRM-008)"
      subtitle={`${child.full_name} · RM ${child.rm_number}`}
      onClose={onClose}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-2"
          onClick={() =>
            printWithTitle(`FRM-008_${child.rm_number}_${child.full_name.replace(/\s+/g, "-")}_${isoDate(report.therapy_date)}`)
          }
        >
          <Printer size={14} className="mr-1" /> Cetak/PDF
        </Button>
      }
    >
      <SessionDocument row={report as unknown as AnyReport} child={child} />
    </ReportModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-secondary mb-1">{label}</span>
      {children}
    </label>
  );
}
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-black/10 hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}
