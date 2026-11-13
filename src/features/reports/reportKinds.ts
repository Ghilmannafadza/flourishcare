import { supabase } from "@/lib/supabase";

// Lima jenis laporan sesuai serah-terima PM. Tabel lama dipertahankan
// (FRM-005 & FRM-008 sudah dipakai di produksi) + dua tabel baru.

export type ReportKind = "sesi" | "evaluasi" | "asesmen" | "konsultasi" | "psikotes";

export type ReportMeta = {
  kind: ReportKind;
  label: string;
  short: string;
  code: string;
  table: string;
  authorCol: string;
  dateCol: string;
  /** layanan: terapi (BT/SI/OT/TW) atau psikolog */
  group: "terapi" | "psikolog";
};

export const REPORT_META: Record<ReportKind, ReportMeta> = {
  sesi: { kind: "sesi", label: "Laporan Sesi Terapi", short: "Sesi (FRM-008)", code: "MDxFlourishCare-FRM-008", table: "development_reports", authorCol: "therapist_id", dateCol: "therapy_date", group: "terapi" },
  evaluasi: { kind: "evaluasi", label: "Laporan Evaluasi Perkembangan (12 Sesi)", short: "Evaluasi", code: "MDxFlourishCare-EVL", table: "evaluation_reports", authorCol: "author_id", dateCol: "report_date", group: "terapi" },
  asesmen: { kind: "asesmen", label: "Laporan Hasil Asesmen", short: "Asesmen (FRM-005)", code: "MDxFlourishCare-FRM-005", table: "medical_examinations", authorCol: "examiner_id", dateCol: "examination_date", group: "psikolog" },
  konsultasi: { kind: "konsultasi", label: "Laporan Pemeriksaan (Konsultasi)", short: "Konsultasi (FRM-006)", code: "MDxFlourishCare-FRM-006", table: "reexamination_reports", authorCol: "examiner_id", dateCol: "examination_date", group: "psikolog" },
  psikotes: { kind: "psikotes", label: "Laporan Psikotes", short: "Psikotes", code: "MDxFlourishCare-PT", table: "psychotest_reports", authorCol: "author_id", dateCol: "report_date", group: "psikolog" },
};

export const REPORT_KINDS = Object.keys(REPORT_META) as ReportKind[];

export type Lifecycle = {
  id: string;
  child_id: string;
  status: "draft" | "terbit";
  published_at: string | null;
  edited_after_publish_at: string | null;
  withdrawn_at: string | null;
  deleted_at: string | null;
  delete_reason: string | null;
  history: Array<{ at: string; by?: string | null; event: string; reason?: string | null }> | null;
  substitute_for?: string | null;
  created_at: string;
  updated_at?: string;
};

export type AnyReport = Lifecycle & Record<string, unknown>;

export const DELETE_REASONS = ["Salah pasien", "Laporan ganda", "Salah jenis laporan", "Salah tanggal", "Isi keliru", "Lainnya"];

export function authorOf(kind: ReportKind, r: Record<string, unknown>): string {
  return String(r[REPORT_META[kind].authorCol] ?? "");
}
export function dateOf(kind: ReportKind, r: Record<string, unknown>): string {
  return String(r[REPORT_META[kind].dateCol] ?? r.created_at ?? "").slice(0, 10);
}

async function upd(kind: ReportKind, id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from(REPORT_META[kind].table).update(patch).eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Perubahan ditolak. Hanya penulis laporan atau Super Admin yang boleh mengubah.");
}

export const reportActions = {
  publish: (kind: ReportKind, id: string) => upd(kind, id, { status: "terbit" }),
  withdraw: (kind: ReportKind, id: string, reason: string) => upd(kind, id, { status: "draft", withdraw_reason: reason }),
  trash: (kind: ReportKind, id: string, reason: string) =>
    upd(kind, id, { deleted_at: new Date().toISOString(), delete_reason: reason || null }),
  restore: (kind: ReportKind, id: string) => upd(kind, id, { deleted_at: null }),
  purge: async (kind: ReportKind, id: string) => {
    const { error } = await supabase.from(REPORT_META[kind].table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

/** Ambil laporan lintas jenis (dipakai Laporan Saya / Semua Laporan / Sampah / Hari Ini). */
export async function fetchReports(opts: { authorId?: string; trash?: boolean; childId?: string; kinds?: ReportKind[] } = {}) {
  const kinds = opts.kinds ?? REPORT_KINDS;
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const m = REPORT_META[kind];
      let q = supabase.from(m.table).select("*").order(m.dateCol, { ascending: false }).limit(500);
      q = opts.trash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
      if (opts.authorId) q = q.eq(m.authorCol, opts.authorId);
      if (opts.childId) q = q.eq("child_id", opts.childId);
      const { data } = await q;
      return ((data ?? []) as AnyReport[]).map((r) => ({ kind, row: r }));
    })
  );
  return results.flat().sort((a, b) => dateOf(b.kind, b.row).localeCompare(dateOf(a.kind, a.row)));
}

/** Terapis pengganti: bila pasien punya terapis utama lain untuk layanan ini → id terapis utama. */
export async function substituteFor(childId: string, service: string | null | undefined, myId: string | undefined) {
  if (!service || !myId) return null;
  const { data } = await supabase
    .from("child_care_team")
    .select("staff_id")
    .eq("child_id", childId)
    .eq("service", service.toUpperCase())
    .maybeSingle();
  const main = (data as { staff_id?: string } | null)?.staff_id;
  return main && main !== myId ? main : null;
}

/** Prefill "Tulis laporan" dari beranda Hari ini → tab laporan langsung memilih pasien & membuka form. */
export const PREFILL_KEY = "fc_prefill_report";
export function takePrefill(): { child_id: string; date: string } | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
