import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, ShieldCheck, KeyRound, Loader2, ChevronRight, User2, ClipboardList, LineChart, Home, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { fadeUp } from "@/lib/motion";
import { fmtDateLong, fmtDateTime } from "@/lib/dates";
import { printWithTitle, isoDate } from "@/lib/print";
import type { PjSetting } from "@/lib/settings";
import { REPORT_META, type AnyReport, type ReportKind } from "@/features/reports/reportKinds";
import { ReportDocument } from "@/features/reports/ReportDocuments";
import { EvalProgressChart } from "@/features/reports/EvaluationView";
import { SERVICE_NAME } from "@/features/reports/evaluation";
import type { SignatureData } from "@/features/reports/ReportPrint";

// Portal Laporan Orang Tua (serah-terima PM):
// login No. RM + nama depan anak + kode akses 6 karakter (dicek di server, kunci 5x salah / 15 menit).
// Hanya laporan berstatus "terbit" yang tampil; laporan ditarik/dihapus langsung hilang.

type PortalChild = { id: string; rm_number: string; full_name: string; nickname: string | null; dob: string; gender: "L" | "P"; parent_name: string | null };
type PortalReport = AnyReport & { kind: ReportKind; report_date: string; author_id: string };
type Portal = {
  ok: boolean;
  child: PortalChild;
  team: Array<{ service: string; name: string }>;
  reports: PortalReport[];
  authors: Record<string, { full_name: string; role: string; signature: SignatureData | null }>;
  pj: PjSetting;
};

const TOKEN_KEY = "fc_parent_token";

export function Progress() {
  const [rm, setRm] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portal, setPortal] = useState<Portal | null>(null);

  async function loadPortal(token: string) {
    const { data, error: err } = await supabase.rpc("parent_portal", { p_token: token });
    const p = data as Portal | null;
    if (err || !p?.ok) {
      sessionStorage.removeItem(TOKEN_KEY);
      setPortal(null);
      return false;
    }
    setPortal(p);
    return true;
  }

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) void loadPortal(t);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: err } = await supabase.rpc("parent_login", { p_rm: rm.trim(), p_name: name.trim(), p_code: code.trim() });
      if (err) throw err;
      const r = data as { ok: boolean; token?: string; error?: string; remaining?: number; until?: string };
      if (!r.ok || !r.token) {
        if (r.error === "locked") {
          setError(`Terlalu banyak percobaan salah. Login untuk No. RM ini dikunci sampai ${fmtDateTime(r.until ?? null)}. Hubungi admin bila perlu dibuka lebih cepat.`);
        } else {
          setError(`No. RM, nama depan, atau kode akses tidak cocok.${r.remaining != null ? ` Sisa ${r.remaining} kali percobaan.` : ""}`);
        }
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, r.token);
      setCode("");
      await loadPortal(r.token);
    } catch {
      setError("Layanan sedang tidak tersedia. Silakan coba lagi atau hubungi admin klinik.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) await supabase.rpc("parent_logout", { p_token: t });
    sessionStorage.removeItem(TOKEN_KEY);
    setPortal(null);
  }

  return (
    <div className="min-h-[70vh] relative overflow-hidden">
      <div className="blob blob-peach w-[380px] h-[380px] -top-16 -right-16" />
      <div className="blob blob-mist w-[300px] h-[300px] top-40 -left-16" />

      <section className="relative z-10 pt-12 pb-12 md:pt-20 md:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <FileSearch size={26} />
          </div>
          <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Portal Laporan</p>
          <h1 className="text-3xl md:text-4xl font-heading font-extrabold mb-3">
            Pantau <span className="font-accent text-primary text-5xl md:text-6xl">progres</span> anak Anda
          </h1>
          <p className="text-text-secondary">
            Masukkan Nomor Rekam Medis (RM), nama depan anak, dan kode akses dari admin klinik.
          </p>
        </div>
      </section>

      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          key={portal ? "portal" : "form"}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className={`${portal ? "max-w-4xl" : "max-w-xl"} mx-auto bg-white rounded-[2rem] p-6 md:p-8 border border-primary/10 shadow-warm-lg`}
        >
          {!portal ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="rm" className="block text-sm font-medium text-text-primary mb-1.5">Nomor Rekam Medis</label>
                <input
                  id="rm"
                  type="text"
                  value={rm}
                  onChange={(e) => setRm(e.target.value.toUpperCase())}
                  required
                  placeholder="Contoh: FC-RM-2607-0001"
                  className="w-full rounded-2xl border border-primary/20 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1.5">Nama depan anak</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Contoh: Raka"
                  className="w-full rounded-2xl border border-primary/20 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-primary" /> Kode akses
                </label>
                <input
                  id="code"
                  type="text"
                  autoComplete="off"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="••••••"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-2xl border border-primary/20 bg-background px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {error && <div className="text-sm text-red bg-red/10 border border-red/20 rounded-2xl px-4 py-3">{error}</div>}
              <Button type="submit" className="w-full rounded-full shadow-warm" size="lg" disabled={loading || code.length !== 6}>
                {loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Memproses…</> : <>Masuk <ChevronRight size={18} className="ml-1" /></>}
              </Button>
              <p className="text-xs text-text-secondary flex items-center gap-1.5 justify-center text-center">
                <ShieldCheck size={14} className="text-primary shrink-0" />
                Kode akses diberikan admin klinik via WhatsApp. Belum punya? Hubungi admin.
              </p>
            </form>
          ) : (
            <PortalView portal={portal} onSignOut={signOut} />
          )}
        </motion.div>
      </section>
    </div>
  );
}

function PortalView({ portal, onSignOut }: { portal: Portal; onSignOut: () => void }) {
  const { child, reports, authors, pj } = portal;
  const [open, setOpen] = useState<PortalReport | null>(null);
  const [svc, setSvc] = useState<string>("all");
  const evaluations = reports.filter((r) => r.kind === "evaluasi");
  const latest = reports[0];
  const homeProgram = useMemo(() => reports.find((r) => (r.kind === "sesi" || r.kind === "evaluasi") && r.home_program), [reports]);
  const serviceOf = (r: PortalReport) =>
    r.kind === "sesi" ? String(r.therapy_type ?? "Terapi") : r.kind === "evaluasi" ? String(r.service) : "PSI";
  const services = [...new Set(reports.map(serviceOf))];
  const list = reports.filter((r) => svc === "all" || serviceOf(r) === svc);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center"><User2 size={22} /></div>
          <div>
            <h2 className="text-xl font-heading font-bold">{child.full_name}</h2>
            <p className="text-xs text-text-secondary">
              RM {child.rm_number} · lahir {fmtDateLong(child.dob)}
              {portal.team.length > 0 && ` · Tim: ${portal.team.map((t) => `${t.service} ${t.name}`).join(", ")}`}
            </p>
          </div>
        </div>
        <button onClick={onSignOut} className="text-xs text-primary font-semibold hover:underline">Keluar</button>
      </header>

      <section>
        <h3 className="font-heading font-bold flex items-center gap-2 mb-3"><LineChart size={16} className="text-primary" /> Grafik perkembangan</h3>
        <EvalProgressChart evaluations={evaluations} onOpen={(r) => setOpen(r as PortalReport)} />
      </section>

      {latest && (
        <section className="bg-background rounded-2xl p-5 border border-primary/10">
          <p className="text-xs uppercase tracking-wider text-text-secondary mb-1">Laporan terbaru</p>
          <p className="font-semibold">{REPORT_META[latest.kind].label}</p>
          <p className="text-xs text-text-secondary mb-3">{fmtDateLong(latest.report_date)} · {authors[latest.author_id]?.full_name ?? ""}</p>
          <Button size="sm" className="rounded-full" onClick={() => setOpen(latest)}>Baca laporan</Button>
        </section>
      )}

      {homeProgram && (
        <section className="bg-background rounded-2xl p-5 border border-primary/10">
          <h3 className="font-heading font-bold flex items-center gap-2 mb-2"><Home size={16} className="text-primary" /> Program di rumah</h3>
          <p className="text-sm text-text-secondary whitespace-pre-line">{String(homeProgram.home_program)}</p>
          <p className="text-[11px] text-text-secondary mt-2">Dari {REPORT_META[homeProgram.kind].label.toLowerCase()} · {fmtDateLong(homeProgram.report_date)}</p>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h3 className="font-heading font-bold flex items-center gap-2"><ClipboardList size={16} className="text-primary" /> Riwayat laporan</h3>
          {services.length > 1 && (
            <select value={svc} onChange={(e) => setSvc(e.target.value)} className="input max-w-[220px]">
              <option value="all">Semua layanan</option>
              {services.map((s) => <option key={s} value={s}>{SERVICE_NAME[s] ?? s}</option>)}
            </select>
          )}
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-text-secondary">Belum ada laporan yang diterbitkan. Terapis/psikolog akan menerbitkan laporan setelah sesi.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.kind + r.id} className="bg-background rounded-xl p-4 border border-primary/10 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">{REPORT_META[r.kind].label}{r.kind === "evaluasi" ? ` — Evaluasi ke-${r.period}` : ""}</p>
                  <p className="text-xs text-text-secondary">
                    {fmtDateLong(r.report_date)} · {SERVICE_NAME[serviceOf(r)] ?? serviceOf(r)} · {authors[r.author_id]?.full_name ?? ""}
                  </p>
                  {r.edited_after_publish_at && (
                    <p className="text-[11px] text-yellow-700">Laporan ini diperbarui pada {fmtDateTime(r.edited_after_publish_at)}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="rounded-full border-2" onClick={() => setOpen(r)}>Baca & unduh</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-text-secondary pt-2 border-t border-primary/10">Sesi berakhir otomatis dalam 12 jam. Jangan bagikan kode akses Anda.</p>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`bg-white rounded-3xl ${open.kind === "evaluasi" || open.kind === "psikotes" ? "max-w-5xl" : "max-w-3xl"} w-full my-8 shadow-warm-lg`}>
            <div className="sticky top-0 z-10 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between rounded-t-3xl print:hidden">
              <div>
                <h2 className="font-heading font-bold text-lg">{REPORT_META[open.kind].label}</h2>
                {open.edited_after_publish_at && <p className="text-[11px] text-yellow-700">Diperbarui {fmtDateTime(open.edited_after_publish_at)}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-2"
                  onClick={() => printWithTitle(`${REPORT_META[open.kind].code}_${child.rm_number}_${child.full_name.replace(/\s+/g, "-")}_${isoDate(open.report_date)}`)}
                >
                  <Printer size={14} className="mr-1" /> Unduh PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(null)} className="rounded-full" aria-label="Tutup"><X size={16} /></Button>
              </div>
            </div>
            <ReportDocument
              kind={open.kind}
              row={open}
              child={child}
              siblings={evaluations}
              author={authors[open.author_id]?.signature ?? { display_name: authors[open.author_id]?.full_name ?? null, title: null, license: null, image_data: null }}
              pj={pj}
              parentView
            />
          </div>
        </div>
      )}
    </div>
  );
}
