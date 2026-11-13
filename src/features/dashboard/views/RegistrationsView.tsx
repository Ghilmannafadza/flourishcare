import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Printer, KeyRound, Check, X, Eye, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { printWithTitle, isoDate } from "@/lib/print";
import { useAuth } from "@/providers/AuthProvider";
import { waLink, formatWaDisplay } from "@/lib/wa";

const SERVICE_LABEL: Record<string, string> = {
  TERAPI: "Terapi di klinik (SI / TW / OT / BT)",
  KONSUL: "Assessment/Konsultasi Psikolog On-Site",
  PSIKOTES: "Psikotes",
};

type Registration = {
  id: string;
  code: string;
  submitted_at: string;
  patient_name: string;
  place_of_birth: string | null;
  date_of_birth: string | null;
  gender: "L" | "P";
  religion: string | null;
  ethnicity: string | null;
  parent_hopes: string | null;
  therapy_history: string | null;
  consultation_history: string | null;
  chief_complaint: string | null;
  disease_history: string | null;
  birth_history: string | null;
  development_history: string | null;
  child_order: number | null;
  child_status: string | null;
  father_name: string | null;
  mother_name: string | null;
  father_address: string | null;
  mother_address: string | null;
  siblings: Array<{ name: string; gender: string; order: string; age: string }>;
  status: "pending_rm" | "rm_assigned" | "archived";
  rm_number: string | null;
  submitter_email: string | null;
  linked_child_id?: string | null;
  contact_whatsapp?: string | null;
  requested_service?: string | null;
  source?: string | null;
  // Other fields not shown in list
  [k: string]: unknown;
};

export function RegistrationsView() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Registration | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("patient_registrations")
      .select("*")
      .order("submitted_at", { ascending: false });
    setRows((data as Registration[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingBlock />;
  if (rows.length === 0)
    return <EmptyState title="Belum ada pendaftaran" description="Form pendaftaran dari assessment.flourishcare.id akan tampil di sini." icon={ClipboardList} />;

  const pending = rows.filter((r) => r.status === "pending_rm");
  const assigned = rows.filter((r) => r.status === "rm_assigned");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h3 className="font-heading font-bold text-lg mb-3">Menunggu Nomor RM ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map((r) => (
              <RegCard key={r.id} r={r} onView={() => setSelected(r)} onUpdated={load} />
            ))}
          </div>
        </section>
      )}

      {assigned.length > 0 && (
        <section>
          <h3 className="font-heading font-bold text-lg mb-3">Sudah ter-RM ({assigned.length})</h3>
          <div className="space-y-3">
            {assigned.map((r) => (
              <RegCard key={r.id} r={r} onView={() => setSelected(r)} onUpdated={load} />
            ))}
          </div>
        </section>
      )}

      {selected && <RegistrationDetailModal reg={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RegCard({ r, onView, onUpdated }: { r: Registration; onView: () => void; onUpdated: () => void }) {
  const { role } = useAuth();
  // PM: Admin Operasional & Super Admin boleh menghapus pendaftaran
  const isSuperAdmin = role === "super_admin" || role === "admin_cabang";
  const [showRmForm, setShowRmForm] = useState(false);
  const [rmValue, setRmValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<"none" | "assign" | "editRm" | "editInfo">("none");
  const [editName, setEditName] = useState(r.patient_name);
  const [editComplaint, setEditComplaint] = useState(r.chief_complaint ?? "");
  const [editDob, setEditDob] = useState(r.date_of_birth ?? "");
  const [editEmail, setEditEmail] = useState(r.submitter_email ?? "");
  const [deleting, setDeleting] = useState(false);

  async function fetchNextRm() {
    const { data } = await supabase.rpc("next_rm_number");
    if (data) setRmValue(String(data));
  }

  async function assign() {
    setSaving(true);
    setErr(null);
    const { error } = await supabase.rpc("assign_rm_to_registration", {
      p_registration_id: r.id,
      p_rm_number: rmValue.trim(),
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      setShowRmForm(false);
      setEditMode("none");
      onUpdated();
    }
  }

  async function updateRm() {
    setSaving(true);
    setErr(null);
    // Update di 2 tabel: patient_registrations & children (linked)
    const { error: e1 } = await supabase
      .from("patient_registrations")
      .update({ rm_number: rmValue.trim() })
      .eq("id", r.id);
    if (e1) { setErr(e1.message); setSaving(false); return; }
    if (r.linked_child_id) {
      await supabase
        .from("children")
        .update({ rm_number: rmValue.trim() })
        .eq("id", r.linked_child_id);
    }
    setSaving(false);
    setEditMode("none");
    onUpdated();
  }

  async function updateInfo() {
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from("patient_registrations")
      .update({
        patient_name: editName.trim(),
        chief_complaint: editComplaint.trim() || null,
        date_of_birth: editDob || null,
        submitter_email: editEmail.trim() || null,
      })
      .eq("id", r.id);
    if (error) { setErr(error.message); setSaving(false); return; }
    if (r.linked_child_id) {
      await supabase
        .from("children")
        .update({ full_name: editName.trim(), dob: editDob || null })
        .eq("id", r.linked_child_id);
    }
    setSaving(false);
    setEditMode("none");
    onUpdated();
  }

  async function handleDelete() {
    if (!confirm(`HAPUS PERMANEN pendaftaran "${r.patient_name}" (${r.code})?\n\nData anak, laporan pemeriksaan, dan laporan perkembangan yang terkait juga akan terhapus. Aksi ini tidak bisa di-undo.`)) return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_patient_registration", { p_registration_id: r.id });
    setDeleting(false);
    if (error) { alert("Gagal hapus: " + error.message); return; }
    onUpdated();
  }

  return (
    <div className="bg-white rounded-3xl border border-black/5 p-5 shadow-warm-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-text-secondary">{r.code}</span>
            {r.status === "rm_assigned" ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">RM: {r.rm_number}</span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow/10 text-yellow-700 font-medium">Menunggu RM</span>
            )}
          </div>
          <p className="font-semibold text-lg">{r.patient_name}</p>
          <p className="text-xs text-text-secondary">
            {r.gender === "L" ? "Laki-laki" : "Perempuan"}
            {r.date_of_birth && ` · Lahir ${new Date(r.date_of_birth).toLocaleDateString("id-ID")}`}
            {r.submitter_email && ` · ${r.submitter_email}`}
          </p>
          {(r.contact_whatsapp || r.requested_service) && (
            <p className="text-xs text-text-secondary mt-1">
              {r.requested_service && <span className="font-semibold text-text-primary">{SERVICE_LABEL[r.requested_service] ?? r.requested_service}</span>}
              {r.contact_whatsapp && (
                <>
                  {r.requested_service ? " · " : ""}WA{" "}
                  <a href={waLink(r.contact_whatsapp, `Halo Bapak/Ibu, kami dari FlourishCare terkait pendaftaran ${r.patient_name} (${r.code}).`)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {formatWaDisplay(r.contact_whatsapp)}
                  </a>
                </>
              )}
              {r.mother_name && ` · Ibu: ${r.mother_name}`}
            </p>
          )}
          {r.chief_complaint && (
            <p className="text-xs text-text-secondary mt-2 line-clamp-2">
              <span className="font-semibold text-text-primary">Keluhan:</span> {r.chief_complaint}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          <Button size="sm" variant="outline" onClick={onView} className="rounded-full border-2">
            <Eye size={14} className="mr-1" /> Detail
          </Button>
          {r.status === "pending_rm" && (
            <Button size="sm" onClick={() => { setShowRmForm(true); void fetchNextRm(); }} className="rounded-full">
              <KeyRound size={14} className="mr-1" /> Input RM
            </Button>
          )}
          {r.status === "rm_assigned" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setRmValue(r.rm_number ?? ""); setEditMode("editRm"); }}
              className="rounded-full border-2"
            >
              <Pencil size={14} className="mr-1" /> Edit RM
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditMode("editInfo")}
            className="rounded-full border-2"
          >
            <Pencil size={14} className="mr-1" /> Edit Info
          </Button>
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border-2 text-red border-red/30 hover:bg-red/10"
            >
              {deleting ? <Loader2 className="animate-spin" size={14} /> : <><Trash2 size={14} className="mr-1" /> Hapus</>}
            </Button>
          )}
        </div>
      </div>

      {editMode === "editRm" && (
        <div className="mt-4 pt-4 border-t border-black/5 bg-background rounded-2xl p-3">
          <p className="text-xs text-text-secondary mb-2">Ubah nomor RM. Format: <span className="font-mono">FC-RM-YYMM-XXXX</span></p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={rmValue}
              onChange={(e) => setRmValue(e.target.value)}
              className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={updateRm} disabled={!rmValue || saving} className="rounded-full">
                {saving ? <Loader2 className="animate-spin" size={14} /> : <><Check size={14} className="mr-1" /> Simpan</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditMode("none")} className="rounded-full">
                <X size={14} />
              </Button>
            </div>
          </div>
          {err && <p className="text-xs text-red mt-2">{err}</p>}
        </div>
      )}

      {editMode === "editInfo" && (
        <div className="mt-4 pt-4 border-t border-black/5 bg-background rounded-2xl p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs">
              <span className="block text-text-secondary mb-1">Nama Pasien</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input" />
            </label>
            <label className="text-xs">
              <span className="block text-text-secondary mb-1">Tanggal Lahir</span>
              <input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} className="input" />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="block text-text-secondary mb-1">Email Pengirim</span>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input" />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="block text-text-secondary mb-1">Keluhan Utama</span>
              <textarea rows={2} value={editComplaint} onChange={(e) => setEditComplaint(e.target.value)} className="input" />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditMode("none")} className="rounded-full">Batal</Button>
            <Button size="sm" onClick={updateInfo} disabled={saving || !editName.trim()} className="rounded-full">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <><Check size={14} className="mr-1" /> Simpan Perubahan</>}
            </Button>
          </div>
          {err && <p className="text-xs text-red mt-1">{err}</p>}
        </div>
      )}

      {showRmForm && (
        <div className="mt-4 pt-4 border-t border-black/5 bg-background rounded-2xl p-3">
          <p className="text-xs text-text-secondary mb-2">
            Format standar: <span className="font-mono">FC-RM-YYMM-XXXX</span>. Klik "Generate" untuk nomor otomatis atau ketik manual dari MD.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={rmValue}
              onChange={(e) => setRmValue(e.target.value)}
              placeholder="Contoh: FC-RM-2608-0001"
              className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchNextRm} className="rounded-full border-2">Generate</Button>
              <Button size="sm" onClick={assign} disabled={!rmValue || saving} className="rounded-full">
                {saving ? <Loader2 className="animate-spin" size={14} /> : <><Check size={14} className="mr-1" /> Simpan</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRmForm(false)} className="rounded-full">
                <X size={14} />
              </Button>
            </div>
          </div>
          {err && <p className="text-xs text-red mt-2">{err}</p>}
        </div>
      )}
    </div>
  );
}

function RegistrationDetailModal({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  function printDetail() {
    const safeName = (reg.patient_name ?? "pasien").replace(/\s+/g, "-");
    printWithTitle(`FRM-007_${reg.code}_${safeName}_${isoDate(reg.submitted_at)}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-warm-lg print:shadow-none print:max-h-none print:rounded-none">
        <div className="sticky top-0 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between print:hidden">
          <div>
            <h2 className="font-heading font-bold text-lg">Detail Pendaftaran</h2>
            <p className="text-xs text-text-secondary font-mono">{reg.code}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={printDetail} className="rounded-full border-2">
              <Printer size={14} className="mr-1" /> Print / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="rounded-full">
              <X size={16} />
            </Button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6 text-sm fc-print-area">
          {/* Header untuk print */}
          <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-black">
            <div className="flex justify-center gap-4 items-center mb-3">
              <img src="/mitra-diani-logo.png" alt="Mitra Diani" style={{ height: 60 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              <img src="/logo.png" alt="FlourishCare" style={{ height: 60 }} />
            </div>
            <h1 className="text-2xl font-bold">Formulir Pendaftaran</h1>
            <p className="text-xs italic text-text-secondary">(Confidential)</p>
          </div>

          {(reg.requested_service || reg.contact_whatsapp) && (
            <Section title="Layanan & Kontak">
              <Row label="Layanan yang dibutuhkan" value={SERVICE_LABEL[reg.requested_service ?? ""] ?? reg.requested_service ?? "-"} />
              <Row label="WhatsApp orang tua" value={reg.contact_whatsapp ? formatWaDisplay(reg.contact_whatsapp) : "-"} />
              <Row label="Email" value={reg.submitter_email ?? "-"} />
            </Section>
          )}

          <Section title="A. Identitas Pasien">
            <Row label="Nama Pasien" value={reg.patient_name} />
            <Row label="Tempat, Tanggal Lahir" value={`${reg.place_of_birth ?? "-"}, ${reg.date_of_birth ?? "-"}`} />
            <Row label="Jenis Kelamin" value={reg.gender === "L" ? "Laki-laki" : "Perempuan"} />
            <Row label="Agama" value={reg.religion ?? "-"} />
            <Row label="Suku" value={reg.ethnicity ?? "-"} />
            <Row label="Anak ke-" value={reg.child_order?.toString() ?? "-"} />
            <Row label="Status Anak" value={reg.child_status ?? "-"} />
            <Row label="Harapan" value={reg.parent_hopes ?? "-"} />
            <Row label="Riwayat Terapi" value={reg.therapy_history ?? "-"} />
            <Row label="Riwayat Konsultasi" value={reg.consultation_history ?? "-"} />
          </Section>

          <Section title="Riwayat Keluhan">
            <Row label="a. Keluhan Utama" value={reg.chief_complaint ?? "-"} />
            <Row label="b. Riwayat Penyakit" value={reg.disease_history ?? "-"} />
            <Row label="c. Riwayat Kelahiran" value={reg.birth_history ?? "-"} />
            <Row label="d. Riwayat Tumbuh Kembang" value={reg.development_history ?? "-"} />
          </Section>

          <Section title="B. Identitas Orang Tua / Wali">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SubSection title="Ayah">
                <Row label="Nama" value={reg.father_name ?? "-"} />
                <Row label="Tempat/Tgl Lahir" value={`${(reg as unknown as { father_pob?: string }).father_pob ?? "-"}, ${(reg as unknown as { father_dob?: string }).father_dob ?? "-"}`} />
                <Row label="Agama" value={(reg as unknown as { father_religion?: string }).father_religion ?? "-"} />
                <Row label="Alamat" value={reg.father_address ?? "-"} />
                <Row label="Pekerjaan" value={(reg as unknown as { father_occupation?: string }).father_occupation ?? "-"} />
                <Row label="Pernikahan ke-" value={String((reg as unknown as { father_marriage_order?: number }).father_marriage_order ?? "-")} />
                <Row label="Usia Menikah" value={String((reg as unknown as { father_marriage_age?: number }).father_marriage_age ?? "-")} />
                <Row label="Pendidikan Terakhir" value={(reg as unknown as { father_education?: string }).father_education ?? "-"} />
              </SubSection>
              <SubSection title="Ibu">
                <Row label="Nama" value={reg.mother_name ?? "-"} />
                <Row label="Tempat/Tgl Lahir" value={`${(reg as unknown as { mother_pob?: string }).mother_pob ?? "-"}, ${(reg as unknown as { mother_dob?: string }).mother_dob ?? "-"}`} />
                <Row label="Agama" value={(reg as unknown as { mother_religion?: string }).mother_religion ?? "-"} />
                <Row label="Alamat" value={reg.mother_address ?? "-"} />
                <Row label="Pekerjaan" value={(reg as unknown as { mother_occupation?: string }).mother_occupation ?? "-"} />
                <Row label="Pernikahan ke-" value={String((reg as unknown as { mother_marriage_order?: number }).mother_marriage_order ?? "-")} />
                <Row label="Usia Menikah" value={String((reg as unknown as { mother_marriage_age?: number }).mother_marriage_age ?? "-")} />
                <Row label="Pendidikan Terakhir" value={(reg as unknown as { mother_education?: string }).mother_education ?? "-"} />
              </SubSection>
            </div>
          </Section>

          {reg.siblings && reg.siblings.length > 0 && (
            <Section title="C. Identitas Saudara">
              {reg.siblings.map((s, i) => (
                <div key={i} className="mb-3 pb-3 border-b border-black/5 last:border-b-0">
                  <p className="font-semibold text-xs uppercase text-primary mb-1">Saudara {i + 1}</p>
                  <Row label="Nama" value={s.name || "-"} />
                  <Row label="Jenis Kelamin" value={s.gender === "L" ? "Laki-laki" : s.gender === "P" ? "Perempuan" : "-"} />
                  <Row label="Anak ke-" value={s.order || "-"} />
                  <Row label="Usia" value={s.age || "-"} />
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-heading font-bold text-base mb-2 pb-1 border-b-2 border-primary/30 text-primary">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-xs uppercase text-primary mb-1">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1 border-b border-black/5 last:border-b-0">
      <span className="w-40 flex-shrink-0 text-text-secondary text-xs">{label}</span>
      <span className="flex-1 text-text-primary whitespace-pre-line">{value}</span>
    </div>
  );
}
