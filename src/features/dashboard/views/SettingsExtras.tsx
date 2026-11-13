import { useEffect, useState } from "react";
import { MessageCircle, CalendarCog, Truck, Stamp, BookText, CalendarOff, Loader2, Save, Trash2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { rupiah, saveSetting, useSetting, type BookingRules } from "@/lib/settings";
import { toWaNumber, formatWaDisplay } from "@/lib/wa";
import { fmtDateLong, isoLocal } from "@/lib/dates";
import { SignaturePad } from "@/features/reports/SignaturePad";
import { NB_DTVP, NB_KES_DEF, NB_SARAN_KOND, NB_VARS, PT, PT_LV, PT_LVN, nbDefault, nbGet, nbKes, nbSaran, type NarrativeBank, type PtPackage } from "@/features/reports/psikotes";

// Bagian tambahan menu Pengaturan (Super Admin) sesuai serah-terima PM.

function Card({ icon: Icon, title, desc, children }: { icon: typeof Save; title: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <Icon size={18} className="text-primary" /> {title}
      </h3>
      {desc && <p className="text-xs text-text-secondary mb-4">{desc}</p>}
      {children}
    </section>
  );
}
function Msg({ m }: { m: string | null }) {
  return m ? <p className={`text-xs mt-2 ${m.startsWith("Error") ? "text-red" : "text-green-700"}`}>{m}</p> : null;
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-secondary mb-1">{label}</span>
      {children}
    </label>
  );
}

// ---------------- Kontak Admin ----------------
export function ContactSection() {
  const { profile } = useAuth();
  const { value, setValue, loading } = useSetting("contact");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    setSaving(true);
    const wa = toWaNumber(value.wa);
    const { error } = await saveSetting("contact", { ...value, wa }, profile?.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Tersimpan. Tombol WhatsApp di situs memakai nomor ini.");
  }
  return (
    <Card icon={MessageCircle} title="Kontak Admin (WhatsApp)" desc="Dipakai tombol WhatsApp melayang di semua halaman publik, halaman booking, dan halaman Info Kunjungan.">
      {loading ? <Loader2 className="animate-spin" size={14} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <L label={`Nomor WhatsApp admin${value.wa ? ` (${formatWaDisplay(value.wa)})` : ""}`}><input value={value.wa} onChange={(e) => setValue({ ...value, wa: e.target.value })} className="input" placeholder="08xx / 628xx" /></L>
          <L label="Kalimat pembuka"><input value={value.greeting} onChange={(e) => setValue({ ...value, greeting: e.target.value })} className="input" /></L>
          <div className="md:col-span-2 flex justify-end"><Button size="sm" onClick={save} disabled={saving} className="rounded-full">{saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="mr-1" /> Simpan</>}</Button></div>
        </div>
      )}
      <Msg m={msg} />
    </Card>
  );
}

// ---------------- Aturan booking ----------------
export function BookingRulesSection() {
  const { profile } = useAuth();
  const { value, setValue, loading } = useSetting("booking");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    setSaving(true);
    const { error } = await saveSetting("booking", { ...value, horizon_days: 30, payment_minutes: 10 }, profile?.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Tersimpan.");
  }
  const opts: Array<[BookingRules["lead"], string]> = [["today", "Hari ini (min. 1 jam sebelum sesi)"], ["h1", "H+1 (besok)"], ["h2", "H+2"], ["h3", "H+3"]];
  return (
    <Card icon={CalendarCog} title="Aturan Booking Online" desc="Batas tanggal yang bisa dipilih tetap 30 hari bergulir; batas bayar QRIS tetap 10 menit (booking otomatis kedaluwarsa).">
      {loading ? <Loader2 className="animate-spin" size={14} /> : (
        <div className="flex flex-wrap items-end gap-3">
          <L label="Paling cepat booking">
            <select value={value.lead} onChange={(e) => setValue({ ...value, lead: e.target.value as BookingRules["lead"] })} className="input min-w-[260px]">
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </L>
          <Button size="sm" onClick={save} disabled={saving} className="rounded-full">{saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="mr-1" /> Simpan</>}</Button>
        </div>
      )}
      <Msg m={msg} />
    </Card>
  );
}

// ---------------- Tarif visit (radius, transport, DP) ----------------
export function VisitTariffSection() {
  const { profile } = useAuth();
  const { value, setValue, loading } = useSetting("tarif_visit");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    setSaving(true);
    const v = { radius_km: Number(value.radius_km) || 0, transport_base: Number(value.transport_base) || 0, per_km: Number(value.per_km) || 0, dp_percent: Math.min(100, Math.max(0, Number(value.dp_percent) || 0)) };
    const { error } = await saveSetting("tarif_visit", v, profile?.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Tersimpan.");
  }
  const num = (k: keyof typeof value) => (e: React.ChangeEvent<HTMLInputElement>) => setValue({ ...value, [k]: Number(e.target.value.replace(/\D/g, "")) });
  return (
    <Card icon={Truck} title="Tarif Homecare / Visit" desc={<>Transport = biaya dasar + per km di luar radius. Contoh 14 km: {rupiah(Number(value.transport_base) + Math.max(0, Math.ceil(14 - Number(value.radius_km))) * Number(value.per_km))}. Orang tua membayar DP di awal, pelunasan setelah sesi.</>}>
      {loading ? <Loader2 className="animate-spin" size={14} /> : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <L label="Radius (km)"><input inputMode="numeric" value={value.radius_km} onChange={num("radius_km")} className="input" /></L>
          <L label="Transport dasar (Rp)"><input inputMode="numeric" value={value.transport_base} onChange={num("transport_base")} className="input" /></L>
          <L label="Per km di luar radius (Rp)"><input inputMode="numeric" value={value.per_km} onChange={num("per_km")} className="input" /></L>
          <L label="DP (%)"><input inputMode="numeric" value={value.dp_percent} onChange={num("dp_percent")} className="input" /></L>
          <Button size="sm" onClick={save} disabled={saving} className="rounded-full h-10">{saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="mr-1" /> Simpan</>}</Button>
        </div>
      )}
      <Msg m={msg} />
    </Card>
  );
}

// ---------------- Pengesahan (Penanggungjawab Klinik) ----------------
export function PjSection() {
  const { profile } = useAuth();
  const { value, setValue, loading } = useSetting("pj");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    setSaving(true);
    const { error } = await saveSetting("pj", value, profile?.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Tersimpan. Berlaku di semua laporan & PDF.");
  }
  return (
    <Card icon={Stamp} title="Pengesahan — Penanggungjawab Klinik" desc="Ditampilkan di samping tanda tangan penulis pada bagian “Mengetahui” di setiap laporan.">
      {loading ? <Loader2 className="animate-spin" size={14} /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <L label="Jabatan"><input value={value.jabatan} onChange={(e) => setValue({ ...value, jabatan: e.target.value })} className="input" /></L>
            <L label="Nama"><input value={value.nama} onChange={(e) => setValue({ ...value, nama: e.target.value })} className="input" /></L>
            <L label="Izin (SIP)"><input value={value.izin} onChange={(e) => setValue({ ...value, izin: e.target.value })} className="input" /></L>
          </div>
          <SignaturePad value={value.image_data} onChange={(v) => setValue({ ...value, image_data: v })} />
          <div className="flex justify-end"><Button size="sm" onClick={save} disabled={saving} className="rounded-full">{saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="mr-1" /> Simpan</>}</Button></div>
        </div>
      )}
      <Msg m={msg} />
    </Card>
  );
}

// ---------------- Libur / cuti per tanggal ----------------
export function TimeOffSection() {
  const [staff, setStaff] = useState<Array<{ id: string; title: string }>>([]);
  const [sel, setSel] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; off_date: string; note: string | null }>>([]);
  const [date, setDate] = useState(isoLocal());
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void supabase.from("staff_profiles").select("id,title").eq("is_visible", true).order("display_order").then(({ data }) => {
      const l = (data as Array<{ id: string; title: string }>) ?? [];
      setStaff(l);
      if (l[0]) setSel(l[0].id);
    });
  }, []);
  async function load() {
    if (!sel) return;
    const { data } = await supabase.from("staff_time_off").select("id, off_date, note").eq("staff_id", sel).gte("off_date", isoLocal()).order("off_date");
    setRows((data as typeof rows) ?? []);
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  async function add() {
    setMsg(null);
    const { error } = await supabase.from("staff_time_off").insert({ staff_id: sel, off_date: date, note: note || null });
    if (error) return setMsg(`Error: ${error.message}`);
    setNote("");
    void load();
  }
  async function del(id: string) {
    await supabase.from("staff_time_off").delete().eq("id", id);
    void load();
  }
  return (
    <Card icon={CalendarOff} title="Libur / Cuti per Tanggal" desc="Tanggal libur tidak muncul di halaman booking (online & homecare). Booking yang sudah ada di tanggal itu perlu diubah jadwalnya di tab Booking Online.">
      <div className="flex flex-wrap gap-2 items-end mb-3">
        <L label="Psikolog / terapis">
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="input min-w-[240px]">
            {staff.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </L>
        <L label="Tanggal"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></L>
        <L label="Keterangan"><input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="mis. cuti, seminar" /></L>
        <Button size="sm" onClick={add} className="rounded-full h-10"><Plus size={14} className="mr-1" /> Tambah</Button>
      </div>
      {rows.length === 0 ? <p className="text-xs text-text-secondary">Tidak ada libur terjadwal.</p> : (
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <span key={r.id} className="text-xs px-3 py-1.5 rounded-full bg-red/10 text-red inline-flex items-center gap-1">
              {fmtDateLong(r.off_date)}{r.note ? ` · ${r.note}` : ""}
              <button onClick={() => del(r.id)} aria-label="Hapus"><Trash2 size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <Msg m={msg} />
    </Card>
  );
}

// ---------------- Bank Narasi (psikolog & Super Admin) ----------------
const NB_TABS = [["wisc", "WISC"], ["cpm", "CPM"], ["nst", "NST"], ["dtvp", "Frostig / DTVP"], ["se", "Sosial-emosional"], ["saran", "Saran"], ["kes", "Draf kesimpulan"]] as const;

export function NarrativeBankSection() {
  const { profile } = useAuth();
  const { value, setValue, loading } = useSetting("narasi");
  const bank = value as NarrativeBank;
  const [tab, setTab] = useState<(typeof NB_TABS)[number][0]>("wisc");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function setLv(kind: string, key: string, val: string, text: string) {
    const b = JSON.parse(JSON.stringify(bank)) as Record<string, Record<string, Record<string, string>>>;
    b[kind] = b[kind] || {};
    b[kind][key] = b[kind][key] || {};
    if (text.trim() && text !== nbDefault(kind, key, val)) b[kind][key][val] = text;
    else delete b[kind][key][val];
    setValue(b as never);
  }
  async function save() {
    setSaving(true);
    const { error } = await saveSetting("narasi", bank as never, profile?.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Bank narasi tersimpan. Berlaku untuk laporan baru.");
  }

  const lvRows = (kind: string, items: Array<{ key: string; name: string; sub?: string }>, vals: string[], labelOf?: (v: string) => string) => (
    <table className="w-full text-xs">
      <tbody className="divide-y divide-black/5">
        {items.flatMap((it) =>
          vals.map((v, i) => {
            const cur = nbGet(bank, kind, it.key, v);
            const def = nbDefault(kind, it.key, v);
            return (
              <tr key={it.key + v}>
                {i === 0 && <td rowSpan={vals.length} className="p-2 align-top w-48"><b>{it.name}</b>{it.sub && <div className="text-text-secondary">{it.sub}</div>}</td>}
                <td className="p-2 w-36 text-text-secondary">{labelOf ? labelOf(v) : v}</td>
                <td className="p-2">
                  <textarea rows={2} value={cur} onChange={(e) => setLv(kind, it.key, v, e.target.value)} className="input" />
                  {cur !== def && <button type="button" onClick={() => setLv(kind, it.key, v, def)} className="text-[11px] text-primary hover:underline">↺ bawaan</button>}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <Card icon={BookText} title="Bank Narasi Psikotes" desc={<>Kalimat bawaan untuk laporan psikotes. Gunakan <code>{"{nama}"}</code> untuk “Ananda [panggilan]”. Perubahan berlaku untuk laporan baru; laporan yang sudah ditulis tidak berubah.</>}>
      {loading ? <Loader2 className="animate-spin" size={14} /> : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {NB_TABS.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`text-xs px-3 py-1.5 rounded-full font-medium border ${tab === k ? "bg-primary text-white border-primary" : "bg-white border-black/10 text-text-secondary"}`}>{l}</button>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto border border-black/5 rounded-2xl">
            {tab === "wisc" && lvRows("wisc", PT.wisc.map((w) => ({ key: w[1], name: w[2], sub: w[3] })), PT_LV, (v) => `${v} · ${PT_LVN[v as keyof typeof PT_LVN]}`)}
            {tab === "nst" && lvRows("nst", PT.nst.map((n) => ({ key: n[0], name: n[1] })), PT_LV, (v) => `${v} · ${PT_LVN[v as keyof typeof PT_LVN]}`)}
            {tab === "dtvp" && lvRows("dtvp", PT.dtvp.map((n) => ({ key: n[0], name: n[1] })), NB_DTVP)}
            {tab === "se" && lvRows("se", PT.se.map((n) => ({ key: n[0], name: n[1] })), PT.seStatus)}
            {tab === "cpm" && lvRows("cpm", [{ key: "grade", name: "Coloured Progressive Matrices" }], Object.keys(PT.cpmGrade), (g) => `Grade ${g} · ${PT.cpmGrade[g]}`)}
            {tab === "saran" && (
              <div className="p-3 space-y-3">
                {Object.keys(PT.saran).map((k) => {
                  const [j, i] = nbSaran(bank, k);
                  const setS = (p: { judul?: string; isi?: string }) => setValue({ ...bank, saran: { ...(bank.saran ?? {}), [k]: { judul: j, isi: i, ...p } } } as never);
                  return (
                    <div key={k} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 text-xs">
                      <p className="text-text-secondary">{NB_SARAN_KOND[k]}</p>
                      <div className="space-y-1">
                        <input value={j} onChange={(e) => setS({ judul: e.target.value })} className="input font-semibold" />
                        <textarea rows={2} value={i} onChange={(e) => setS({ isi: e.target.value })} className="input" />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs font-semibold pt-2">Saran tambahan buatan sendiri (selalu ditawarkan)</p>
                {(bank.saranCustom ?? []).map((c, idx) => (
                  <div key={c.key} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <input value={c.judul} onChange={(e) => setValue({ ...bank, saranCustom: (bank.saranCustom ?? []).map((x, j) => (j === idx ? { ...x, judul: e.target.value } : x)) } as never)} className="input font-semibold" placeholder="Judul saran" />
                      <textarea rows={2} value={c.isi} onChange={(e) => setValue({ ...bank, saranCustom: (bank.saranCustom ?? []).map((x, j) => (j === idx ? { ...x, isi: e.target.value } : x)) } as never)} className="input" placeholder="Isi saran" />
                    </div>
                    <button onClick={() => setValue({ ...bank, saranCustom: (bank.saranCustom ?? []).filter((_, j) => j !== idx) } as never)} className="p-2 text-red hover:bg-red/10 rounded-full" aria-label="Hapus"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={() => setValue({ ...bank, saranCustom: [...(bank.saranCustom ?? []), { key: "c" + Math.random().toString(36).slice(2, 8), judul: "", isi: "" }] } as never)} className="text-xs text-primary font-semibold hover:underline">＋ Tambah saran</button>
              </div>
            )}
            {tab === "kes" && (
              <div className="p-3 space-y-4">
                {(Object.keys(PT.kes) as PtPackage[]).map((pk) => (
                  <div key={pk}>
                    <p className="font-semibold text-sm">{PT.paket[pk].nama}</p>
                    <p className="text-[11px] text-text-secondary mb-2">Variabel: <code>{NB_VARS[pk]}</code> — kalimat dilewati bila ada variabel yang belum terisi.</p>
                    {PT.kes[pk].map(([k, l]) => (
                      <L key={k} label={l}>
                        <textarea
                          rows={2}
                          value={nbKes(bank, pk, k)}
                          onChange={(e) => setValue({ ...bank, kes: { ...(bank.kes ?? {}), [pk]: { ...((bank.kes ?? {})[pk] ?? {}), [k]: e.target.value } } } as never)}
                          className="input mb-2"
                          placeholder={NB_KES_DEF[pk][k]}
                        />
                      </L>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end mt-3"><Button size="sm" onClick={save} disabled={saving} className="rounded-full">{saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="mr-1" /> Simpan perubahan</>}</Button></div>
          <Msg m={msg} />
        </>
      )}
    </Card>
  );
}
