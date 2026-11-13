import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Eye, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { useAuth } from "@/providers/AuthProvider";
import { fmtDateLong, fmtDateTime } from "@/lib/dates";
import { printWithTitle, isoDate } from "@/lib/print";
import type { Child } from "@/types/database";
import { REPORT_KINDS, REPORT_META, authorOf, dateOf, fetchReports, type AnyReport, type ReportKind } from "./reportKinds";
import { HistoryList, LifecycleActions, StatusBadge, TrashActions } from "./ReportLifecycle";
import { ReportDocument } from "./ReportDocuments";
import { ReportModal } from "./PatientReportShell";

type Mode = "mine" | "all" | "trash";
type Item = { kind: ReportKind; row: AnyReport };

/**
 * mine  = Laporan Saya (penulis: edit lewat tab jenis laporan, terbitkan/tarik/hapus di sini)
 * all   = Semua Laporan (Admin Operasional & Super Admin, baca saja)
 * trash = Sampah Laporan (Super Admin: pulihkan / hapus permanen; otomatis terhapus > 30 hari)
 */
export function ReportListView({ mode }: { mode: Mode }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [children, setChildren] = useState<Record<string, Child>>({});
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<ReportKind | "all">("all");
  const [status, setStatus] = useState<"all" | "draft" | "terbit">("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Item | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [list, kids, profs] = await Promise.all([
      fetchReports({ authorId: mode === "mine" ? profile.id : undefined, trash: mode === "trash" }),
      supabase.from("children").select("id, full_name, nickname, rm_number, dob, gender, parent_id"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setItems(list);
    setChildren(Object.fromEntries(((kids.data ?? []) as Child[]).map((c) => [c.id, c])));
    setAuthors(Object.fromEntries(((profs.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name])));
    setLoading(false);
  }, [profile, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      items.filter(({ kind: k, row }) => {
        if (kind !== "all" && k !== kind) return false;
        if (mode !== "trash" && status !== "all" && row.status !== status) return false;
        // Semua Laporan: draft orang lain tidak ikut tampil
        if (mode === "all" && row.status === "draft" && authorOf(k, row) !== profile?.id) return false;
        const c = children[row.child_id];
        if (q.trim()) {
          const s = q.toLowerCase();
          if (!c || !(c.full_name.toLowerCase().includes(s) || c.rm_number.toLowerCase().includes(s))) return false;
        }
        return true;
      }),
    [items, kind, status, q, children, mode, profile?.id]
  );

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      {mode === "trash" && (
        <p className="text-xs text-text-secondary bg-white rounded-2xl border border-black/5 p-3">
          Laporan yang dihapus disimpan di Sampah selama <b>30 hari</b>, lalu terhapus permanen otomatis. Super Admin bisa memulihkan atau menghapus permanen lebih awal.
        </p>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama anak / No. RM" className="input max-w-xs" />
        <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind | "all")} className="input max-w-[220px]">
          <option value="all">Semua jenis</option>
          {REPORT_KINDS.map((k) => <option key={k} value={k}>{REPORT_META[k].short}</option>)}
        </select>
        {mode !== "trash" && (
          <select value={status} onChange={(e) => setStatus(e.target.value as "all" | "draft" | "terbit")} className="input max-w-[160px]">
            <option value="all">Semua status</option>
            <option value="draft">Draft</option>
            <option value="terbit">Terbit</option>
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={mode === "trash" ? Trash2 : FileText}
          title={mode === "trash" ? "Sampah kosong" : "Belum ada laporan"}
          description={mode === "mine" ? "Laporan yang Anda tulis (draft maupun terbit) akan muncul di sini." : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => {
            const c = children[it.row.child_id];
            return (
              <div key={it.kind + it.row.id} className="bg-white rounded-2xl border border-black/5 p-4 shadow-warm-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{REPORT_META[it.kind].short}</span>
                      <StatusBadge row={it.row} />
                    </div>
                    <p className="font-semibold">{c?.full_name ?? "Pasien"} <span className="text-xs font-mono text-text-secondary">{c?.rm_number}</span></p>
                    <p className="text-xs text-text-secondary">
                      {fmtDateLong(dateOf(it.kind, it.row))} · {authors[authorOf(it.kind, it.row)] ?? "-"}
                      {it.row.substitute_for ? ` (pengganti ${authors[String(it.row.substitute_for)] ?? ""})` : ""}
                    </p>
                    {mode === "trash" && (
                      <p className="text-xs text-red mt-1">
                        Dihapus {fmtDateTime(it.row.deleted_at)}{it.row.delete_reason ? ` — ${it.row.delete_reason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDetail(it)} disabled={!c}>
                      <Eye size={14} className="mr-1" /> Lihat
                    </Button>
                  </div>
                </div>
                {mode === "trash" ? (
                  <div className="mt-2 space-y-2">
                    <TrashActions kind={it.kind} row={it.row} onChanged={load} />
                    <HistoryList history={it.row.history} />
                  </div>
                ) : mode === "mine" ? (
                  <LifecycleActions kind={it.kind} row={it.row} onChanged={load} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {detail && children[detail.row.child_id] && (
        <ReportModal
          wide={detail.kind === "evaluasi" || detail.kind === "psikotes"}
          title={REPORT_META[detail.kind].label}
          subtitle={`${children[detail.row.child_id].full_name} · RM ${children[detail.row.child_id].rm_number}`}
          onClose={() => setDetail(null)}
          actions={
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-2"
              onClick={() => {
                const c = children[detail.row.child_id];
                printWithTitle(`${REPORT_META[detail.kind].code}_${c.rm_number}_${c.full_name.replace(/\s+/g, "-")}_${isoDate(dateOf(detail.kind, detail.row))}`);
              }}
            >
              <Printer size={14} className="mr-1" /> Print / PDF
            </Button>
          }
        >
          <ReportDocument
            kind={detail.kind}
            row={detail.row}
            child={children[detail.row.child_id]}
            siblings={items.filter((x) => x.kind === "evaluasi" && x.row.child_id === detail.row.child_id).map((x) => x.row)}
          />
        </ReportModal>
      )}
    </div>
  );
}
