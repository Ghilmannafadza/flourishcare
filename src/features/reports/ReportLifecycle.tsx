import { useState } from "react";
import { Send, Undo2, Trash2, History, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { fmtDateTime } from "@/lib/dates";
import { DELETE_REASONS, authorOf, reportActions, type AnyReport, type ReportKind } from "./reportKinds";

export function StatusBadge({ row }: { row: AnyReport }) {
  if (row.deleted_at)
    return <span className="text-xs px-2.5 py-0.5 rounded-full bg-red/10 text-red font-medium">Di Sampah</span>;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {row.status === "terbit" ? (
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Terbit</span>
      ) : (
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow/10 text-yellow-700 font-medium">
          Draft{row.withdrawn_at ? " (ditarik)" : ""}
        </span>
      )}
      {row.status === "terbit" && row.edited_after_publish_at && (
        <span className="text-[11px] text-text-secondary">diperbarui {fmtDateTime(row.edited_after_publish_at)}</span>
      )}
      {row.substitute_for && (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-black/10 text-text-secondary">Pengganti</span>
      )}
    </span>
  );
}

/** Tombol Terbitkan / Tarik / Hapus / Riwayat (penulis sendiri atau Super Admin). */
export function LifecycleActions({
  kind,
  row,
  onChanged,
  compact = false,
}: {
  kind: ReportKind;
  row: AnyReport;
  onChanged: () => void;
  compact?: boolean;
}) {
  const { profile, role } = useAuth();
  const canEdit = role === "super_admin" || authorOf(kind, row) === profile?.id;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | "withdraw" | "trash">(null);
  const [showHist, setShowHist] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (row.deleted_at) return null;

  return (
    <div className="print:hidden">
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-1"}`}>
        {canEdit && row.status === "draft" && (
          <Button size="sm" onClick={() => run(() => reportActions.publish(kind, row.id))} disabled={busy} className="rounded-full">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} className="mr-1" /> Terbitkan</>}
          </Button>
        )}
        {canEdit && row.status === "terbit" && (
          <Button size="sm" variant="outline" onClick={() => setAsk("withdraw")} disabled={busy} className="rounded-full border-2">
            <Undo2 size={14} className="mr-1" /> Tarik
          </Button>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAsk("trash")}
            disabled={busy}
            className="rounded-full border-2 text-red border-red/30 hover:bg-red/10"
          >
            <Trash2 size={14} className="mr-1" /> Hapus
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowHist((v) => !v)} className="rounded-full">
          <History size={14} className="mr-1" /> Riwayat
        </Button>
      </div>
      {err && <p className="text-xs text-red mt-2">{err}</p>}
      {showHist && <HistoryList history={row.history} />}
      {ask && (
        <ReasonModal
          title={ask === "withdraw" ? "Tarik laporan" : "Hapus laporan"}
          description={
            ask === "withdraw"
              ? "Laporan kembali menjadi draft dan langsung hilang dari portal orang tua."
              : row.status === "terbit"
                ? "Laporan dipindah ke Sampah (30 hari) dan hilang dari portal orang tua. Alasan wajib diisi."
                : "Draft dipindah ke Sampah (30 hari). Alasan opsional."
          }
          required={ask === "withdraw" || row.status === "terbit"}
          onCancel={() => setAsk(null)}
          onConfirm={(reason) => {
            const a = ask;
            setAsk(null);
            void run(() => (a === "withdraw" ? reportActions.withdraw(kind, row.id, reason) : reportActions.trash(kind, row.id, reason)));
          }}
        />
      )}
    </div>
  );
}

export function TrashActions({ kind, row, onChanged }: { kind: ReportKind; row: AnyReport; onChanged: () => void }) {
  const { role } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (role !== "super_admin") return null;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => reportActions.restore(kind, row.id))} className="rounded-full border-2">
        <RotateCcw size={14} className="mr-1" /> Pulihkan
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (confirm("Hapus permanen laporan ini? Tidak bisa dibatalkan.")) void run(() => reportActions.purge(kind, row.id));
        }}
        className="rounded-full border-2 text-red border-red/30 hover:bg-red/10"
      >
        <Trash2 size={14} className="mr-1" /> Hapus permanen
      </Button>
      {err && <p className="text-xs text-red w-full">{err}</p>}
    </div>
  );
}

export function HistoryList({ history }: { history: AnyReport["history"] }) {
  const list = [...(history ?? [])].reverse();
  if (!list.length) return <p className="text-xs text-text-secondary mt-2">Belum ada riwayat.</p>;
  return (
    <ul className="mt-2 bg-background rounded-2xl border border-black/5 p-3 space-y-1 text-xs">
      {list.map((h, i) => (
        <li key={i} className="flex flex-wrap gap-x-2">
          <span className="text-text-secondary">{fmtDateTime(h.at)}</span>
          <span className="font-semibold capitalize">{h.event}</span>
          {h.by && <span className="text-text-secondary">oleh {h.by}</span>}
          {h.reason && <span className="text-text-secondary">— {h.reason}</span>}
        </li>
      ))}
    </ul>
  );
}

export function ReasonModal({
  title,
  description,
  required,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  required: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [pick, setPick] = useState("");
  const [other, setOther] = useState("");
  const reason = pick === "Lainnya" ? other.trim() : pick;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-warm-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-heading font-bold text-lg">{title}</h4>
          <button onClick={onCancel} className="p-1 hover:bg-black/5 rounded-full" aria-label="Tutup">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-text-secondary mb-4">{description}</p>
        <p className="text-xs font-semibold text-text-secondary mb-2">Alasan{required ? " *" : " (opsional)"}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {DELETE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setPick(r)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                pick === r ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {pick === "Lainnya" && (
          <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Tulis alasan" className="input mb-3" />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} className="rounded-full">Batal</Button>
          <Button onClick={() => onConfirm(reason)} disabled={required && !reason} className="rounded-full">
            Lanjutkan
          </Button>
        </div>
      </div>
    </div>
  );
}
