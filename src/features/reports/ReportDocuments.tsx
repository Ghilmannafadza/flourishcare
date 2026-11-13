import type { Child } from "@/types/database";
import type { PjSetting } from "@/lib/settings";
import { ageMonths, fmtAge, fmtDateLong } from "@/lib/dates";
import { ReportKop, SignatureBlock, Tick, type SignatureData } from "./ReportPrint";
import { REPORT_META, type AnyReport, type ReportKind } from "./reportKinds";
import { ConsultationDocument } from "./ConsultationView";
import { EvaluationDocument } from "./EvaluationView";
import { PsychotestDocument } from "./PsychotestView";

type DocChild = Pick<Child, "full_name" | "dob" | "gender" | "rm_number"> & { nickname?: string | null };

const MOOD = ["baik", "cukup", "kurang_tenang"];
const ENERGY = ["tinggi", "sedang", "rendah"];
const OBSTACLES = ["menolak", "terdistraksi", "tantrum", "menangis", "sulit_transisi", "sensitif_sensori", "agresif", "tidak_ada"];
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const THERAPY_TITLE: Record<string, string> = {
  BT: "Behaviour Therapy (BT)",
  SI: "Sensory Integration Therapy (SI)",
  OT: "Occupational Therapy (OT)",
  TW: "Speech Therapy (TW)",
};

/** Laporan Sesi Terapi — MDxFlourishCare-FRM-008 (hitam-putih, A4 tegak). */
export function SessionDocument({ row, child, author, pj }: { row: AnyReport; child: DocChild; author?: SignatureData | null; pj?: PjSetting | null }) {
  const acts = (row.activities as Array<Record<string, string>> | null) ?? [];
  const obstacles = (row.obstacles as string[] | null) ?? [];
  const td = "border border-black/30 p-1.5";
  const tt = String(row.therapy_type ?? "");
  return (
    <div className="p-6 md:p-8 text-sm space-y-3 fc-print-area">
      <ReportKop title={`Laporan Perkembangan Terapi${THERAPY_TITLE[tt] ? " — " + THERAPY_TITLE[tt] : ""}`} code={REPORT_META.sesi.code} />
      <table className="w-full border border-black/30 text-xs">
        <tbody>
          <tr><td className={td}><b>Nama Anak</b></td><td className={td}>{child.full_name}</td><td className={td}><b>Tanggal Terapi</b></td><td className={td}>{fmtDateLong(String(row.therapy_date))}</td></tr>
          <tr><td className={td}><b>Usia</b></td><td className={td}>{fmtAge(ageMonths(child.dob, String(row.therapy_date)))}</td><td className={td}><b>Sesi ke-</b></td><td className={td}>{String(row.session_number ?? row.session_no ?? "-")} / {String(row.total_sessions ?? row.session_total ?? "-")}</td></tr>
          <tr><td className={td}><b>No. RM</b></td><td className={td}>{child.rm_number}</td><td className={td}><b>Terapis</b></td><td className={td}>{String(row.therapist_name ?? "")}</td></tr>
        </tbody>
      </table>
      <p className="font-bold">1. Kondisi Anak saat Datang</p>
      <p>Mood: {MOOD.map((m) => <Tick key={m} on={row.mood === m} label={label(m)} />)}</p>
      <p>Energi: {ENERGY.map((m) => <Tick key={m} on={row.energy === m} label={label(m)} />)}</p>
      <p className="font-bold">2. Aktivitas Terapi & Respon</p>
      <table className="w-full border border-black/30 text-xs">
        <thead><tr><th className={td}>Aktivitas</th><th className={td}>Durasi</th><th className={td}>Bantuan</th><th className={td}>Respon Anak</th></tr></thead>
        <tbody>
          {(acts.length ? acts : [{}]).map((a, i) => (
            <tr key={i}>
              <td className={td}>{a.activity ?? a.aktivitas ?? ""}</td>
              <td className={td}>{a.duration ?? a.durasi ?? ""}</td>
              <td className={td}>{a.assistance ?? a.bantuan ?? ""}</td>
              <td className={td}>{a.response ?? a.respon ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-bold">3. Hambatan</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
        {OBSTACLES.map((o) => <Tick key={o} on={obstacles.includes(o)} label={o === "tidak_ada" ? "Tidak Ada Hambatan" : label(o)} />)}
      </div>
      <p className="font-bold">4. Program Latihan di Rumah</p>
      <p className="whitespace-pre-line">{String(row.home_program ?? "-")}</p>
      {row.notes ? <p className="whitespace-pre-line text-xs"><b>Catatan:</b> {String(row.notes)}</p> : null}
      <SignatureBlock date={String(row.therapy_date)} authorId={String(row.therapist_id)} authorName={String(row.therapist_name ?? "")} author={author} pj={pj} />
    </div>
  );
}

/** Laporan Hasil Asesmen — MDxFlourishCare-FRM-005 (data dari tab Pemeriksaan). */
export function AssessmentDocument({ row, child, author, pj }: { row: AnyReport; child: DocChild; author?: SignatureData | null; pj?: PjSetting | null }) {
  const sec = (title: string, obj: unknown) => {
    const entries = Object.entries((obj as Record<string, unknown>) ?? {}).filter(([, v]) => v != null && v !== "");
    if (!entries.length) return null;
    return (
      <div className="break-inside-avoid">
        <p className="font-bold border-b border-primary/30 text-primary mb-1">{title}</p>
        {entries.map(([k, v]) => (
          <p key={k} className="text-xs">
            <span className="capitalize text-text-secondary inline-block w-40">{k.replace(/_/g, " ")}</span>
            {typeof v === "object" ? JSON.stringify(v) : label(String(v))}
          </p>
        ))}
      </div>
    );
  };
  const nl = (t: unknown) => (t ? <p className="whitespace-pre-line">{String(t)}</p> : <p>-</p>);
  return (
    <div className="p-6 md:p-8 text-sm space-y-3 fc-print-area">
      <ReportKop title="Laporan Hasil Asesmen" code={REPORT_META.asesmen.code} />
      <div className="grid grid-cols-2 gap-2 text-xs border border-black/20 p-2">
        <span>Nama: <b>{child.full_name}</b></span>
        <span>Tanggal: <b>{fmtDateLong(String(row.examination_date))}</b></span>
        <span>Usia: <b>{String(row.patient_age ?? fmtAge(ageMonths(child.dob, String(row.examination_date))))}</b></span>
        <span>Jenis kelamin: <b>{child.gender === "L" ? "Laki-laki" : "Perempuan"}</b></span>
        <span>Diagnosa: <b>{String(row.diagnosis ?? "-")}</b></span>
        <span>No. RM: <b>{child.rm_number}</b></span>
      </div>
      {row.chief_complaint ? <p><b>Keluhan awal:</b> {String(row.chief_complaint)}</p> : null}
      {sec("Aspek Bahasa", row.language_aspects)}
      {sec("Aspek Motorik", row.motor_aspects)}
      {sec("Aspek Sensorik", row.sensory_aspects)}
      {sec("Aspek Lainnya", row.other_aspects)}
      {Array.isArray(row.follow_up_plan) && (row.follow_up_plan as string[]).length > 0 && (
        <p><b>Rencana lanjutan:</b> {(row.follow_up_plan as string[]).map((x) => x.replace(/_/g, " ")).join(", ")}</p>
      )}
      {row.additional_notes ? <p><b>Catatan tambahan:</b> {String(row.additional_notes)}</p> : null}
      <p className="font-bold">Informasi subjektif</p>
      {nl(row.subjective_info)}
      <p className="font-bold">Informasi objektif</p>
      {nl(row.objective_info)}
      <p className="font-bold">Kesimpulan</p>
      {nl(row.conclusion)}
      <SignatureBlock date={String(row.examination_date)} authorId={String(row.examiner_id)} author={author} pj={pj} />
    </div>
  );
}

/** Dispatcher dokumen per jenis laporan. */
export function ReportDocument({
  kind,
  row,
  child,
  siblings = [],
  author,
  pj,
  parentView = false,
}: {
  kind: ReportKind;
  row: AnyReport;
  child: DocChild;
  siblings?: AnyReport[];
  author?: SignatureData | null;
  pj?: PjSetting | null;
  parentView?: boolean;
}) {
  const c = { ...child, nickname: child.nickname ?? null };
  switch (kind) {
    case "sesi":
      return <SessionDocument row={row} child={c} author={author} pj={pj} />;
    case "asesmen":
      return <AssessmentDocument row={row} child={c} author={author} pj={pj} />;
    case "konsultasi":
      return <ConsultationDocument row={row} child={c} author={author} pj={pj} />;
    case "evaluasi":
      return <EvaluationDocument row={row} child={c} siblings={siblings} author={author} pj={pj} />;
    case "psikotes":
      return <PsychotestDocument row={row} child={c} full={!parentView} author={author} pj={pj} />;
  }
}
