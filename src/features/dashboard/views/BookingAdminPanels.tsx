import { useEffect, useState } from "react";
import { Wallet, Plus, Pencil, Trash2, Printer, CalendarClock, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { rupiah } from "@/lib/settings";
import { fmtDateTime, isoLocal } from "@/lib/dates";
import { printWithTitle } from "@/lib/print";
import { KOP } from "@/features/reports/ReportPrint";

export type BookingMoney = {
  id: string;
  code: string;
  mode: "online" | "homecare";
  child_name: string;
  parent_name: string;
  psychologist_id: string;
  scheduled_at: string;
  duration_min?: number;
  amount: number;
  service_fee: number | null;
  admin_fee: number | null;
  transport_fee: number | null;
  distance_km: number | null;
  dp_percent: number | null;
  total_paid: number | null;
  payment_expires_at: string | null;
  status: string;
  homecare_service: string | null;
  history?: Array<{ at: string; by?: string; event: string }> | null;
};

export type PaymentRow = {
  id: string;
  booking_id: string;
  provider: string;
  amount: number;
  status: string;
  payment_method: string;
  paid_at: string | null;
  created_at: string;
  note: string | null;
  order_id: string;
};

export function tagihan(b: BookingMoney) {
  const total = Number(b.amount) || 0;
  const paid = Number(b.total_paid) || 0;
  const dp = b.mode === "homecare" ? Math.round((total * Number(b.dp_percent ?? 50)) / 100) : total;
  const status = paid >= total && total > 0 ? "Lunas" : b.mode === "homecare" && paid >= dp && paid > 0 ? "DP diterima" : paid > 0 ? "Sebagian" : "Belum bayar";
  return { total, paid, dp, sisa: Math.max(0, total - paid), status };
}

/** Rincian tagihan + riwayat pembayaran + catat pembayaran manual (tunai/transfer) + kuitansi. */
export function BookingMoneyPanel({ b, payments, canEdit, onChanged }: { b: BookingMoney; payments: PaymentRow[]; canEdit: boolean; onChanged: () => void }) {
  const t = tagihan(b);
  const [form, setForm] = useState<null | { id?: string; amount: string; method: string; note: string; date: string }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [receipt, setReceipt] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { profile } = useAuth();

  useEffect(() => {
    if (b.status !== "pending_payment" || !b.payment_expires_at) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [b.status, b.payment_expires_at]);
  const left = b.payment_expires_at ? new Date(b.payment_expires_at).getTime() - now : 0;

  async function savePayment() {
    if (!form) return;
    const amount = Number(form.amount.replace(/\D/g, ""));
    if (!amount) return setErr("Nominal wajib diisi.");
    setBusy(true);
    setErr(null);
    const row = {
      booking_id: b.id,
      provider: "manual",
      payment_method: form.method,
      amount,
      status: "paid",
      paid_at: new Date(form.date + "T12:00:00").toISOString(),
      note: form.note || null,
      recorded_by: profile?.id ?? null,
    };
    const res = form.id
      ? await supabase.from("online_payments").update(row).eq("id", form.id)
      : await supabase.from("online_payments").insert({ ...row, order_id: `${b.code}-M${Date.now().toString().slice(-6)}` });
    setBusy(false);
    if (res.error) return setErr(res.error.message);
    setForm(null);
    onChanged();
  }

  async function removePayment(p: PaymentRow) {
    if (!confirm(`Hapus entri pembayaran ${rupiah(p.amount)} (${p.payment_method})?`)) return;
    const { error } = await supabase.from("online_payments").delete().eq("id", p.id);
    if (error) setErr(error.message);
    else onChanged();
  }

  const paidRows = payments.filter((p) => p.status === "paid");

  return (
    <div className="mt-3 pt-3 border-t border-black/5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <p className="text-xs font-semibold flex items-center gap-1"><Wallet size={12} className="text-primary" /> Pembayaran</p>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${t.status === "Lunas" ? "bg-green-100 text-green-700" : t.status === "Belum bayar" ? "bg-yellow/10 text-yellow-700" : "bg-secondary/10 text-secondary"}`}>
          {t.status}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-background rounded-2xl p-3">
        <Money l="Biaya layanan" v={b.service_fee ?? b.amount} />
        <Money l="Biaya admin" v={b.admin_fee ?? 0} />
        {b.mode === "homecare" && <Money l={`Transport${b.distance_km ? ` (${String(b.distance_km).replace(".", ",")} km)` : ""}`} v={b.transport_fee ?? 0} />}
        <Money l="Total" v={t.total} bold />
        {b.mode === "homecare" && <Money l={`DP ${b.dp_percent ?? 50}%`} v={t.dp} />}
        <Money l="Sudah dibayar" v={t.paid} />
        {t.sisa > 0 && <Money l="Sisa" v={t.sisa} />}
      </div>
      {b.status === "pending_payment" && b.mode === "online" && b.payment_expires_at && (
        <p className={`text-xs mt-2 ${left > 0 ? "text-yellow-700" : "text-red"}`}>
          {left > 0 ? `⏱️ Batas bayar ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")} lagi` : "Batas bayar terlewat — booking otomatis kedaluwarsa."}
        </p>
      )}

      {payments.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{rupiah(p.amount)}</span>
              <span className="text-text-secondary">{p.payment_method}{p.provider === "sumopod" ? " (SumoPay)" : ""}</span>
              <span className={`px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{p.status}</span>
              <span className="text-text-secondary">{fmtDateTime(p.paid_at ?? p.created_at)}</span>
              {p.note && <span className="text-text-secondary italic">— {p.note}</span>}
              {canEdit && p.provider === "manual" && (
                <>
                  <button onClick={() => setForm({ id: p.id, amount: String(p.amount), method: p.payment_method, note: p.note ?? "", date: (p.paid_at ?? p.created_at).slice(0, 10) })} className="p-1 hover:bg-black/5 rounded-full" aria-label="Ubah"><Pencil size={11} /></button>
                  <button onClick={() => removePayment(p)} className="p-1 text-red hover:bg-red/10 rounded-full" aria-label="Hapus"><Trash2 size={11} /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => setForm({ amount: String(b.mode === "homecare" && t.paid < t.dp ? t.dp - t.paid : t.sisa), method: "Tunai", note: "", date: isoLocal() })}
            className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1"
          >
            <Plus size={12} /> Catat pembayaran di tempat
          </button>
          {paidRows.length > 0 && (
            <button onClick={() => setReceipt(true)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1">
              <Printer size={12} /> Kuitansi PDF
            </button>
          )}
        </div>
      )}

      {form && (
        <div className="mt-2 bg-primary/5 border border-primary/20 rounded-2xl p-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-end text-xs">
          <label>Nominal<input inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input mt-1" /></label>
          <label>Metode
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="input mt-1">
              <option>Tunai</option>
              <option>Transfer rekening</option>
            </select>
          </label>
          <label>Tanggal<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input mt-1" /></label>
          <label>Catatan<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input mt-1" placeholder="mis. pelunasan" /></label>
          <div className="flex gap-2">
            <Button size="sm" onClick={savePayment} disabled={busy} className="rounded-full">{busy ? <Loader2 size={12} className="animate-spin" /> : "Simpan"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)} className="rounded-full"><X size={12} /></Button>
          </div>
        </div>
      )}
      {err && <p className="text-xs text-red mt-1">{err}</p>}
      {receipt && <ReceiptModal b={b} payments={paidRows} onClose={() => setReceipt(false)} />}
    </div>
  );
}

function Money({ l, v, bold }: { l: string; v: number | string; bold?: boolean }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-[10px] text-text-secondary">{l}</p>
      <p className={bold ? "font-bold text-primary" : "font-semibold text-text-primary"}>{rupiah(v)}</p>
    </div>
  );
}

function ReceiptModal({ b, payments, onClose }: { b: BookingMoney; payments: PaymentRow[]; onClose: () => void }) {
  const t = tagihan(b);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full my-8 shadow-warm-lg">
        <div className="sticky top-0 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between rounded-t-3xl print:hidden">
          <h2 className="font-heading font-bold text-lg">Kuitansi</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full border-2" onClick={() => printWithTitle(`Kuitansi_${b.code}`)}>
              <Printer size={14} className="mr-1" /> Print / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="rounded-full">✕</Button>
          </div>
        </div>
        <div className="p-8 text-sm fc-print-area">
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <img src="/logo.png" alt="FlourishCare" className="h-12 mx-auto mb-1" />
            <p className="text-xs"><b>{KOP.kop1}</b> <i>{KOP.kop1b}</i> <b>{KOP.kop2}</b></p>
            <p className="text-[11px] text-text-secondary">{KOP.alamat}</p>
            <h1 className="text-xl font-bold mt-2">KUITANSI PEMBAYARAN</h1>
            <p className="text-xs font-mono">{b.code}</p>
          </div>
          <table className="w-full text-sm mb-4">
            <tbody>
              <tr><td className="py-1 text-text-secondary w-40">Diterima dari</td><td>{b.parent_name}</td></tr>
              <tr><td className="py-1 text-text-secondary">Untuk layanan</td><td>{b.mode === "homecare" ? `Homecare Visit${b.homecare_service ? " " + b.homecare_service.toUpperCase() : ""}` : "Konsultasi Psikolog Online"} — {b.child_name}</td></tr>
              <tr><td className="py-1 text-text-secondary">Jadwal</td><td>{fmtDateTime(b.scheduled_at)} WIB</td></tr>
            </tbody>
          </table>
          <table className="w-full text-sm border border-black/20 mb-4">
            <thead><tr className="bg-background"><th className="text-left p-2">Tanggal</th><th className="text-left p-2">Metode</th><th className="text-right p-2">Nominal</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-black/10">
                  <td className="p-2">{fmtDateTime(p.paid_at ?? p.created_at)}</td>
                  <td className="p-2">{p.payment_method}{p.note ? ` — ${p.note}` : ""}</td>
                  <td className="p-2 text-right">{rupiah(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm space-y-1 ml-auto max-w-xs">
            <p className="flex justify-between"><span>Total tagihan</span><b>{rupiah(t.total)}</b></p>
            <p className="flex justify-between"><span>Total dibayar</span><b>{rupiah(t.paid)}</b></p>
            <p className="flex justify-between"><span>Sisa</span><b>{rupiah(t.sisa)}</b></p>
            <p className="flex justify-between"><span>Status</span><b>{t.status}</b></p>
          </div>
          <p className="text-right mt-10 text-sm">Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="text-right text-sm mt-14 font-semibold">Admin FlourishCare</p>
        </div>
      </div>
    </div>
  );
}

/** Ubah jadwal (mis. psikolog berhalangan) — tanggal, jam, dan profesional. */
export function RescheduleModal({
  b,
  staff,
  onClose,
  onSaved,
}: {
  b: BookingMoney;
  staff: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const d = new Date(b.scheduled_at);
  const [date, setDate] = useState(isoLocal(d));
  const [time, setTime] = useState(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  const [psi, setPsi] = useState(b.psychologist_id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clash, setClash] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const start = new Date(`${date}T${time}:00`);
      const end = new Date(start.getTime() + (b.duration_min ?? 60) * 60000);
      const { data } = await supabase
        .from("online_bookings")
        .select("code, scheduled_at, duration_min")
        .eq("psychologist_id", psi)
        .neq("id", b.id)
        .not("status", "in", "(cancelled,expired)")
        .gte("scheduled_at", new Date(start.getTime() - 4 * 3600000).toISOString())
        .lt("scheduled_at", end.toISOString());
      const hit = ((data ?? []) as { code: string; scheduled_at: string; duration_min: number }[]).find(
        (x) => new Date(x.scheduled_at).getTime() + x.duration_min * 60000 > start.getTime()
      );
      setClash(hit ? `Bentrok dengan ${hit.code} (${fmtDateTime(hit.scheduled_at)})` : null);
    })();
  }, [date, time, psi, b.id, b.duration_min]);

  async function save() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from("online_bookings")
      .update({ scheduled_at: new Date(`${date}T${time}:00`).toISOString(), psychologist_id: psi })
      .eq("id", b.id);
    setBusy(false);
    if (error) return setErr(error.message);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-warm-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-heading font-bold text-lg flex items-center gap-2"><CalendarClock size={18} className="text-primary" /> Ubah jadwal {b.code}</h4>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full" aria-label="Tutup">✕</button>
        </div>
        <div className="space-y-3 text-sm">
          <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Psikolog / terapis</span>
            <select value={psi} onChange={(e) => setPsi(e.target.value)} className="input">
              {staff.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></label>
            <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Jam (WIB)</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" /></label>
          </div>
          {clash && <p className="text-xs text-red bg-red/10 rounded-xl px-3 py-2">⚠️ {clash}</p>}
          <p className="text-xs text-text-secondary">Perubahan tercatat di riwayat booking. Kabari orang tua via WhatsApp setelah disimpan.</p>
          {err && <p className="text-xs text-red">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
            <Button onClick={save} disabled={busy} className="rounded-full">{busy ? <Loader2 size={14} className="animate-spin" /> : "Simpan jadwal"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
