import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Eye, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { fetchAssessedChildren } from "@/features/dashboard/queries";
import { useAuth } from "@/providers/AuthProvider";
import type { Child } from "@/types/database";
import { fmtDateLong } from "@/lib/dates";
import { REPORT_META, authorOf, dateOf, takePrefill, type AnyReport, type ReportKind } from "./reportKinds";
import { LifecycleActions, StatusBadge } from "./ReportLifecycle";

// Kerangka tab laporan per pasien (pola sama dengan tab Pemeriksaan & Laporan Perkembangan):
// daftar pasien ber-RM di kiri, laporan pasien terpilih di kanan.

export function PatientReportShell({
  kind,
  icon,
  canWrite,
  summary,
  renderForm,
  renderDetail,
}: {
  kind: ReportKind;
  icon: LucideIcon;
  canWrite: boolean;
  summary: (r: AnyReport) => React.ReactNode;
  renderForm: (p: { child: Child; initial?: AnyReport; siblings: AnyReport[]; onClose: () => void; onSaved: () => void }) => React.ReactNode;
  renderDetail: (p: { child: Child; row: AnyReport; siblings: AnyReport[]; onClose: () => void }) => React.ReactNode;
}) {
  const meta = REPORT_META[kind];
  const { profile, role } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<AnyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ initial?: AnyReport } | null>(null);
  const [detail, setDetail] = useState<AnyReport | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchAssessedChildren(500).catch(() => [] as Child[]);
      setChildren(data);
      const pre = takePrefill();
      if (pre && data.some((c) => c.id === pre.child_id)) {
        setSelected(pre.child_id);
        if (canWrite) setForm({});
      } else if (data[0]) setSelected(data[0].id);
      setLoading(false);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!selected) return;
    const { data } = await supabase
      .from(meta.table)
      .select("*")
      .eq("child_id", selected)
      .is("deleted_at", null)
      .order(meta.dateCol, { ascending: false });
    setRows((data as AnyReport[]) ?? []);
  }, [selected, meta.table, meta.dateCol]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingBlock />;
  if (children.length === 0)
    return (
      <EmptyState
        title="Belum ada pasien"
        description="Pasien muncul di sini setelah diberi Nomor RM (tab Pendaftaran Pasien). Terapis hanya melihat pasien yang ditugaskan atau bidangnya sama."
        icon={icon}
      />
    );

  const child = children.find((c) => c.id === selected);
  const filtered = children.filter(
    (c) => !q.trim() || c.full_name.toLowerCase().includes(q.toLowerCase()) || c.rm_number.toLowerCase().includes(q.toLowerCase())
  );
  // Draft milik orang lain tidak ditampilkan (kecuali Super Admin)
  const visible = rows.filter((r) => r.status === "terbit" || role === "super_admin" || authorOf(kind, r) === profile?.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <aside className="bg-white rounded-2xl border border-black/5 p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / RM" className="input mb-2" />
        <ul className="space-y-1 max-h-[70vh] overflow-y-auto">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected === c.id ? "bg-primary text-white" : "hover:bg-primary/5"
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
          <EmptyState icon={icon} title="Pilih pasien" />
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div>
                <h2 className="font-heading font-extrabold text-xl">{child.full_name}</h2>
                <p className="text-xs text-text-secondary">
                  RM {child.rm_number} · {meta.label}
                </p>
              </div>
              {canWrite && (
                <Button size="sm" className="rounded-full" onClick={() => setForm({})}>
                  <Plus size={16} className="mr-1" /> Laporan Baru
                </Button>
              )}
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-text-secondary italic py-8 text-center">Belum ada laporan.</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((r) => {
                  const mine = authorOf(kind, r) === profile?.id || role === "super_admin";
                  return (
                    <li key={r.id} className="border border-black/5 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm">{fmtDateLong(dateOf(kind, r))}</p>
                            <StatusBadge row={r} />
                          </div>
                          <div className="text-xs text-text-secondary">{summary(r)}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDetail(r)}>
                            <Eye size={14} className="mr-1" /> Detail
                          </Button>
                          {mine && (
                            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setForm({ initial: r })}>
                              <Pencil size={14} className="mr-1" /> Edit
                            </Button>
                          )}
                        </div>
                      </div>
                      <LifecycleActions kind={kind} row={r} onChanged={load} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {form && child &&
          renderForm({
            child,
            initial: form.initial,
            siblings: rows,
            onClose: () => setForm(null),
            onSaved: () => {
              setForm(null);
              void load();
            },
          })}
        {detail && child && renderDetail({ child, row: detail, siblings: rows, onClose: () => setDetail(null) })}
      </section>
    </div>
  );
}

/** Modal kerangka seragam untuk form/detail laporan. */
export function ReportModal({
  title,
  subtitle,
  onClose,
  actions,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className={`bg-white rounded-3xl ${wide ? "max-w-5xl" : "max-w-3xl"} w-full my-8 shadow-warm-lg`}>
        <div className="sticky top-0 z-10 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between gap-3 rounded-t-3xl print:hidden">
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-lg">{title}</h2>
            {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
          </div>
          <div className="flex gap-2 items-center">
            {actions}
            <Button size="sm" variant="ghost" onClick={onClose} className="rounded-full" aria-label="Tutup">
              ✕
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Tombol simpan draft / simpan & terbitkan. */
export function SaveBar({
  saving,
  error,
  onSave,
  disabled,
  isEdit,
  currentStatus,
}: {
  saving: boolean;
  error: string | null;
  onSave: (status: "draft" | "terbit") => void;
  disabled?: boolean;
  isEdit?: boolean;
  currentStatus?: "draft" | "terbit";
}) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-black/5 px-6 py-4 rounded-b-3xl flex flex-wrap items-center justify-end gap-2">
      {error && <p className="text-xs text-red flex-1">{error}</p>}
      {isEdit && currentStatus === "terbit" ? (
        <Button onClick={() => onSave("terbit")} disabled={saving || disabled} className="rounded-full shadow-warm">
          {saving ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
      ) : (
        <>
          <Button variant="outline" onClick={() => onSave("draft")} disabled={saving || disabled} className="rounded-full border-2">
            Simpan Draft
          </Button>
          <Button onClick={() => onSave("terbit")} disabled={saving || disabled} className="rounded-full shadow-warm">
            {saving ? "Menyimpan…" : "Simpan & Terbitkan"}
          </Button>
        </>
      )}
    </div>
  );
}
