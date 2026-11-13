import { useState } from "react";
import { MessagesSquare, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { printWithTitle, isoDate } from "@/lib/print";
import { ageMonths, fmtAge, isoLocal } from "@/lib/dates";
import type { Child } from "@/types/database";
import { PatientReportShell, ReportModal, SaveBar } from "./PatientReportShell";
import { ReportKop, SignatureBlock, type SignatureData } from "./ReportPrint";
import { DraftBanner, clearDraft, useAutosave } from "./autosave";
import { REPORT_META, type AnyReport } from "./reportKinds";
import type { PjSetting } from "@/lib/settings";

// Laporan Konsultasi — format MDxFlourishCare-FRM-006 "Laporan Pemeriksaan"
// (identitas, informasi subjektif, informasi objektif, kesimpulan wajib).
// Disimpan di tabel reexamination_reports (dibuat di migrasi 0008).

type Kons = {
  examination_date: string;
  address: string;
  parent_name: string;
  subjective_info: string;
  objective_info: string;
  conclusion: string;
  additional_notes: string;
};

export function ConsultationView() {
  const { role } = useAuth();
  return (
    <PatientReportShell
      kind="konsultasi"
      icon={MessagesSquare}
      canWrite={role === "psikolog" || role === "super_admin"}
      summary={(r) => <span className="line-clamp-2">{String(r.conclusion ?? "")}</span>}
      renderForm={(p) => <KonsForm {...p} />}
      renderDetail={({ child, row, onClose }) => (
        <ReportModal
          title="Laporan Pemeriksaan (FRM-006)"
          subtitle={`${child.full_name} · RM ${child.rm_number}`}
          onClose={onClose}
          actions={
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-2"
              onClick={() => printWithTitle(`FRM-006_${child.rm_number}_${child.full_name.replace(/\s+/g, "-")}_${isoDate(String(row.examination_date))}`)}
            >
              <Printer size={14} className="mr-1" /> Print / PDF
            </Button>
          }
        >
          <ConsultationDocument row={row} child={child} />
        </ReportModal>
      )}
    />
  );
}

function KonsForm({ child, initial, onClose, onSaved }: { child: Child; initial?: AnyReport; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const isEdit = Boolean(initial?.id);
  const draftKey = `kons_${child.id}_${initial?.id ?? "new"}`;
  const [v, setV] = useState<Kons>({
    examination_date: String(initial?.examination_date ?? isoLocal()),
    address: String(initial?.address ?? ""),
    parent_name: String(initial?.parent_name ?? ""),
    subjective_info: String(initial?.subjective_info ?? ""),
    objective_info: String(initial?.objective_info ?? ""),
    conclusion: String(initial?.conclusion ?? ""),
    additional_notes: String(initial?.additional_notes ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useAutosave(draftKey, v);
  const set = (k: keyof Kons, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function save(status: "draft" | "terbit") {
    if (!profile) return;
    if (!v.conclusion.trim()) {
      setErr("Kesimpulan wajib diisi.");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload = {
      ...v,
      patient_age: fmtAge(ageMonths(child.dob, v.examination_date)),
      signed_by_name: profile.full_name,
      status,
    };
    const res = isEdit
      ? await supabase.from("reexamination_reports").update(payload).eq("id", initial!.id)
      : await supabase.from("reexamination_reports").insert({ ...payload, child_id: child.id, examiner_id: profile.id, signed_at: new Date().toISOString() });
    setSaving(false);
    if (res.error) return setErr(res.error.message);
    clearDraft(draftKey);
    onSaved();
  }

  return (
    <ReportModal title={`${isEdit ? "Edit" : "Buat"} Laporan Pemeriksaan (FRM-006)`} subtitle={`${child.full_name} · RM ${child.rm_number}`} onClose={onClose}>
      <div className="p-6 space-y-4 text-sm">
        <DraftBanner<Kons> storageKey={draftKey} onRestore={setV} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-background rounded-2xl p-3 text-xs">
          <span>Nama: <b>{child.full_name}</b></span>
          <span>Usia: <b>{fmtAge(ageMonths(child.dob, v.examination_date))}</b></span>
          <span>JK: <b>{child.gender === "L" ? "Laki-laki" : "Perempuan"}</b></span>
          <span>RM: <b>{child.rm_number}</b></span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Tanggal pemeriksaan">
            <input type="date" value={v.examination_date} onChange={(e) => set("examination_date", e.target.value)} className="input" />
          </Field>
          <Field label="Nama orang tua / wali">
            <input value={v.parent_name} onChange={(e) => set("parent_name", e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Alamat">
          <input value={v.address} onChange={(e) => set("address", e.target.value)} className="input" />
        </Field>
        <Field label="Informasi subjektif (prenatal, natal, postnatal, dan informasi lainnya)">
          <textarea rows={6} value={v.subjective_info} onChange={(e) => set("subjective_info", e.target.value)} className="input" placeholder="Keluhan dan cerita orang tua, riwayat kehamilan/kelahiran, perkembangan, kesehatan, keluarga, sekolah…" />
        </Field>
        <Field label="Informasi objektif (hasil observasi)">
          <textarea rows={6} value={v.objective_info} onChange={(e) => set("objective_info", e.target.value)} className="input" placeholder="Perilaku, interaksi, komunikasi, motorik, atensi selama pemeriksaan…" />
        </Field>
        <Field label="Kesimpulan *">
          <textarea rows={4} value={v.conclusion} onChange={(e) => set("conclusion", e.target.value)} className="input" placeholder="Kesimpulan pemeriksaan dan saran tindak lanjut" />
        </Field>
      </div>
      <SaveBar saving={saving} error={err} onSave={save} isEdit={isEdit} currentStatus={initial?.status} />
    </ReportModal>
  );
}

export function ConsultationDocument({
  row,
  child,
  author,
  pj,
}: {
  row: AnyReport;
  child: Pick<Child, "full_name" | "dob" | "gender" | "rm_number">;
  author?: SignatureData | null;
  pj?: PjSetting | null;
}) {
  const nl = (v: unknown) => <p className="whitespace-pre-line">{String(v || "-")}</p>;
  return (
    <div className="p-6 md:p-8 text-sm space-y-4 fc-print-area">
      <ReportKop title="Laporan Pemeriksaan" code={REPORT_META.konsultasi.code} />
      <table className="w-full text-sm border border-black/20">
        <tbody>
          <Tr a="Nama" b={child.full_name} c="Tanggal" d={String(row.examination_date ?? "")} />
          <Tr a="Usia" b={String(row.patient_age ?? fmtAge(ageMonths(child.dob, String(row.examination_date))))} c="Jenis kelamin" d={child.gender === "L" ? "Laki-laki" : "Perempuan"} />
          <Tr a="Orang tua / wali" b={String(row.parent_name ?? "-")} c="No. RM" d={child.rm_number} />
          <tr>
            <td className="border border-black/20 px-2 py-1 font-semibold">Alamat</td>
            <td className="border border-black/20 px-2 py-1" colSpan={3}>{String(row.address ?? "-")}</td>
          </tr>
        </tbody>
      </table>
      <Sec title="Informasi Subjektif (Prenatal, natal, postnatal, dan informasi lainnya)">{nl(row.subjective_info)}</Sec>
      <Sec title="Informasi Objektif (Informasi hasil observasi)">{nl(row.objective_info)}</Sec>
      <Sec title="Kesimpulan">{nl(row.conclusion)}</Sec>
      <SignatureBlock
        date={String(row.examination_date ?? "")}
        authorId={String(row.examiner_id ?? "")}
        authorName={String(row.signed_by_name ?? "")}
        author={author}
        pj={pj}
      />
    </div>
  );
}

function Tr({ a, b, c, d }: { a: string; b: string; c: string; d: string }) {
  return (
    <tr>
      <td className="border border-black/20 px-2 py-1 font-semibold w-[18%]">{a}</td>
      <td className="border border-black/20 px-2 py-1">{b}</td>
      <td className="border border-black/20 px-2 py-1 font-semibold w-[18%]">{c}</td>
      <td className="border border-black/20 px-2 py-1">{d}</td>
    </tr>
  );
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <p className="font-heading font-bold text-base pb-1 mb-2 border-b border-primary/30 text-primary">{title}</p>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-text-primary mb-1.5">{label}</span>
      {children}
    </label>
  );
}
