import { useEffect, useState } from "react";
import { DatabaseBackup, Download, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { loadSetting, saveSetting } from "@/lib/settings";
import { fmtDateTime } from "@/lib/dates";
import { REPORT_KINDS, REPORT_META } from "@/features/reports/reportKinds";

// Backup data bulanan (Super Admin): unduh JSON lengkap (termasuk Sampah) + CSV rekap laporan.
// Pengingat muncul di Overview dari tanggal 25 s.d. tanggal 5 bulan berikutnya
// bila backup bulan itu belum dibuat. Backup harian otomatis tetap dari Supabase (paket Pro).

const TABLES = [
  "branches", "profiles", "staff_profiles", "psychologist_schedules", "staff_time_off", "parents", "children",
  "child_care_team", "patient_registrations", "online_bookings", "online_payments", "online_booking_prices",
  "medical_examinations", "development_reports", "reexamination_reports", "evaluation_reports", "psychotest_reports",
  "patient_attachments", "progress_notes", "attendance_logs", "leave_requests", "staff_signatures", "clinic_settings",
];

type LogEntry = { at: string; by: string; month: string; kind?: string };

function targetMonth(d = new Date()): string | null {
  const day = d.getDate();
  if (day >= 25) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (day <= 5) {
    const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}
const monthLabel = (ym: string) => new Date(ym + "-01T00:00:00").toLocaleDateString("id-ID", { month: "long", year: "numeric" });

export function BackupNotice({ onOpen }: { onOpen?: () => void }) {
  const [due, setDue] = useState<string | null>(null);
  useEffect(() => {
    const m = targetMonth();
    if (!m) return;
    void loadSetting("backup_log").then((log) => {
      if (!(log as LogEntry[]).some((x) => x.month === m && x.kind !== "csv")) setDue(m);
    });
  }, []);
  if (!due) return null;
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-yellow-800 flex items-start gap-2">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">Backup data bulan <b>{monthLabel(due)}</b> belum dibuat.</span>
      {onOpen && <button onClick={onOpen} className="text-xs px-3 py-1.5 rounded-full bg-primary text-white font-semibold">Buat backup</button>}
    </div>
  );
}

export function BackupSection() {
  const { profile } = useAuth();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadSetting("backup_log").then((v) => setLog(v as LogEntry[]));
  }, []);

  async function record(kind: string) {
    const entry: LogEntry = { at: new Date().toISOString(), by: profile?.full_name ?? "-", month: targetMonth() ?? new Date().toISOString().slice(0, 7), kind };
    const next = [entry, ...log].slice(0, 60);
    await saveSetting("backup_log", next as never, profile?.id);
    setLog(next);
  }

  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function doJson() {
    setBusy("json");
    setMsg(null);
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), by: profile?.full_name };
    for (const t of TABLES) {
      const { data, error } = await supabase.from(t).select("*").limit(50000);
      out[t] = error ? { error: error.message } : data;
    }
    download(`flourishcare-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 1), "application/json");
    await record("json");
    setBusy(null);
    setMsg("Backup JSON terunduh. Simpan di penyimpanan aman (bukan laptop bersama).");
  }

  async function doCsv() {
    setBusy("csv");
    const rows: string[][] = [["bulan", "jenis_laporan", "status", "jumlah"]];
    for (const k of REPORT_KINDS) {
      const m = REPORT_META[k];
      const { data } = await supabase.from(m.table).select(`${m.dateCol}, status, deleted_at`).limit(50000);
      const agg: Record<string, number> = {};
      ((data ?? []) as unknown as Record<string, string | null>[]).forEach((r) => {
        const key = `${String(r[m.dateCol] ?? "").slice(0, 7)}|${r.deleted_at ? "sampah" : r.status}`;
        agg[key] = (agg[key] ?? 0) + 1;
      });
      Object.entries(agg).forEach(([key, n]) => {
        const [mo, st] = key.split("|");
        rows.push([mo, m.label, st, String(n)]);
      });
    }
    rows.sort((a, b) => (a[0] < b[0] ? 1 : -1));
    download(`flourishcare-rekap-laporan-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
    await record("csv");
    setBusy(null);
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <DatabaseBackup size={18} className="text-primary" /> Backup Data
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Unduh backup manual tiap bulan (pengingat muncul tanggal 25–5). Pastikan juga <b>backup harian Supabase</b> aktif (Project Settings → Database → Backups, paket Pro).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={doJson} disabled={!!busy} className="rounded-full">
          {busy === "json" ? <Loader2 size={14} className="animate-spin" /> : <><Download size={14} className="mr-1" /> Backup lengkap (JSON)</>}
        </Button>
        <Button variant="outline" onClick={doCsv} disabled={!!busy} className="rounded-full border-2">
          {busy === "csv" ? <Loader2 size={14} className="animate-spin" /> : <><Download size={14} className="mr-1" /> Rekap laporan per bulan (CSV)</>}
        </Button>
      </div>
      {msg && <p className="text-xs text-green-700 mt-2">{msg}</p>}
      <p className="text-xs font-semibold mt-4 mb-1">Riwayat backup</p>
      {log.length === 0 ? (
        <p className="text-xs text-text-secondary">Belum ada backup.</p>
      ) : (
        <ul className="text-xs space-y-1">
          {log.slice(0, 12).map((l, i) => (
            <li key={i} className="text-text-secondary">
              {fmtDateTime(l.at)} · {l.kind === "csv" ? "CSV rekap" : "JSON lengkap"} · {monthLabel(l.month)} · oleh {l.by}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
