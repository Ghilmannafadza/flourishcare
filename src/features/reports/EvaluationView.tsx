import { useMemo, useState } from "react";
import { TrendingUp, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { printWithTitle, isoDate } from "@/lib/print";
import { ageMonths, fmtAge, fmtDateLong, isoLocal } from "@/lib/dates";
import type { Child } from "@/types/database";
import type { PjSetting } from "@/lib/settings";
import { PatientReportShell, ReportModal, SaveBar } from "./PatientReportShell";
import { ReportKop, SignatureBlock, Tick, type SignatureData } from "./ReportPrint";
import { DraftBanner, clearDraft, useAutosave } from "./autosave";
import { EVT, type EvalService } from "./evalTemplates";
import {
  EVX, SERVICE_NAME, emptyEv, evAvg, evInit, evPct, evRingkas, evSkorTxt, evStatus, fmt1, isTercapai,
  type EvPayload, type EvPm,
} from "./evaluation";
import { substituteFor, type AnyReport } from "./reportKinds";

const SERVICES: EvalService[] = ["BT", "SI", "OT", "TW"];

export function EvaluationView() {
  const { role } = useAuth();
  return (
    <PatientReportShell
      kind="evaluasi"
      icon={TrendingUp}
      canWrite={role === "terapis" || role === "psikolog" || role === "super_admin"}
      summary={(r) => {
        const s = r.service as EvalService;
        const pct = evPct(((r.payload as EvPayload) ?? emptyEv()).skor, s);
        return (
          <span>
            {SERVICE_NAME[s]} · Evaluasi ke-{String(r.period ?? 1)}
            {pct ? ` · ${pct.pct}% indikator lulus (${pct.L}/${pct.n})` : ""}
          </span>
        );
      }}
      renderForm={(p) => <EvalForm {...p} />}
      renderDetail={({ child, row, siblings, onClose }) => (
        <ReportModal
          wide
          title="Laporan Evaluasi Perkembangan"
          subtitle={`${child.full_name} · RM ${child.rm_number}`}
          onClose={onClose}
          actions={
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-2"
              onClick={() =>
                printWithTitle(`EVL-${row.service}_${child.rm_number}_${child.full_name.replace(/\s+/g, "-")}_Eval${row.period}_${isoDate(String(row.report_date))}`)
              }
            >
              <Printer size={14} className="mr-1" /> Print / PDF
            </Button>
          }
        >
          <EvaluationDocument row={row} child={child} siblings={siblings} />
        </ReportModal>
      )}
    />
  );
}

// ======================= FORM =======================

function EvalForm({ child, initial, siblings, onClose, onSaved }: { child: Child; initial?: AnyReport; siblings: AnyReport[]; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const isEdit = Boolean(initial?.id);
  const [service, setService] = useState<EvalService>((initial?.service as EvalService) ?? "BT");
  const prevOf = (svc: EvalService) => siblings.filter((r) => r.service === svc && r.id !== initial?.id && r.status === "terbit");
  const seed = useMemo(() => {
    if (initial) return { period: Number(initial.period ?? 1), ev: { ...emptyEv(), ...(initial.payload as EvPayload) } };
    return evInit(prevOf(service));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [period, setPeriod] = useState<number>(seed.period);
  const [date, setDate] = useState<string>(String(initial?.report_date ?? isoLocal()));
  const [ev, setEv] = useState<EvPayload>(seed.ev);
  const [homeProgram, setHomeProgram] = useState(String(initial?.home_program ?? ""));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const draftKey = `eval_${child.id}_${initial?.id ?? "new"}`;
  useAutosave(draftKey, { service, period, date, ev, homeProgram });

  const T = EVT[service];
  const previous = prevOf(service).filter((r) => Number(r.period) < period).sort((a, b) => Number(a.period) - Number(b.period));
  const showAwal = previous.length === 0;
  const sum = evRingkas(service, ev);

  function changeService(s: EvalService) {
    setService(s);
    if (!isEdit) {
      const init = evInit(prevOf(s));
      setPeriod(init.period);
      setEv(init.ev);
    }
  }
  const patch = (p: Partial<EvPayload>) => setEv((e) => ({ ...e, ...p }));
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function save(status: "draft" | "terbit") {
    if (!profile) return;
    setSaving(true);
    setErr(null);
    const payload = { service, period, report_date: date, payload: ev, home_program: homeProgram || null, status };
    let res;
    if (isEdit) {
      res = await supabase.from("evaluation_reports").update(payload).eq("id", initial!.id);
    } else {
      const sub = await substituteFor(child.id, service, profile.id);
      res = await supabase.from("evaluation_reports").insert({ ...payload, child_id: child.id, author_id: profile.id, substitute_for: sub });
    }
    setSaving(false);
    if (res.error) return setErr(res.error.message);
    clearDraft(draftKey);
    onSaved();
  }

  const opt = (
    <>
      <option value=""></option>
      {EVX.skala.map(([v, l]) => (
        <option key={v} value={v}>{v === "NA" ? "N/A" : v} · {l}</option>
      ))}
    </>
  );

  return (
    <ReportModal wide title={`${isEdit ? "Edit" : "Buat"} Laporan Evaluasi Perkembangan`} subtitle={`${child.full_name} · RM ${child.rm_number}`} onClose={onClose}>
      <div className="p-6 space-y-5 text-sm">
        <DraftBanner<{ service: EvalService; period: number; date: string; ev: EvPayload; homeProgram: string }>
          storageKey={draftKey}
          onRestore={(d) => {
            setService(d.service);
            setPeriod(d.period);
            setDate(d.date);
            setEv({ ...emptyEv(), ...d.ev });
            setHomeProgram(d.homeProgram);
          }}
        />
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 text-xs">
          Format <b>Evaluasi Perkembangan — {T.judul}</b>. Target: {T.target}
        </div>

        <Sec title="A. Identitas & latar belakang anak">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-background rounded-2xl p-3 text-xs mb-3">
            <span>Nama: <b>{child.full_name}</b></span>
            <span>JK: <b>{child.gender === "L" ? "Laki-laki" : "Perempuan"}</b></span>
            <span>Tgl lahir: <b>{fmtDateLong(child.dob)}</b></span>
            <span>Usia: <b>{fmtAge(ageMonths(child.dob, date))}</b></span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Layanan">
              <select value={service} onChange={(e) => changeService(e.target.value as EvalService)} disabled={isEdit} className="input">
                {SERVICES.map((s) => <option key={s} value={s}>{s} — {SERVICE_NAME[s]}</option>)}
              </select>
            </Field>
            <Field label="Periode evaluasi *">
              <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="input">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Evaluasi ke-{n}</option>)}
              </select>
            </Field>
            <Field label="Tanggal">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </Field>
            <Field label="Frekuensi terapi">
              <input value={ev.frek} onChange={(e) => patch({ frek: e.target.value })} className="input" placeholder="mis. 2x/minggu, 60 menit" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Field label="Setting penilaian">
              <Chips options={EVX.setting} value={ev.setting} onToggle={(v) => patch({ setting: toggle(ev.setting, v) })} />
            </Field>
            <Field label="Sekolah / kelas">
              <input value={ev.sekolah} onChange={(e) => patch({ sekolah: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Kondisi / diagnosis">
            <Chips options={EVX.kondisi} value={ev.kondisi} onToggle={(v) => patch({ kondisi: toggle(ev.kondisi, v) })} />
            <input value={ev.kondisiLain} onChange={(e) => patch({ kondisiLain: e.target.value })} className="input mt-2" placeholder="Lainnya: sebutkan" />
          </Field>
          <Field label="Riwayat singkat">
            <textarea rows={2} value={ev.riwayat} onChange={(e) => patch({ riwayat: e.target.value })} className="input" placeholder="Riwayat kehamilan/kelahiran, kesehatan, obat, alat bantu, bahasa di rumah" />
          </Field>
          <Field label="Pemeriksaan penunjang">
            <input value={ev.penunjang} onChange={(e) => patch({ penunjang: e.target.value })} className="input" placeholder="Pendengaran: … • Penglihatan: … • Instrumen baku: …" />
          </Field>
        </Sec>

        <details className="bg-background rounded-2xl border border-black/5 p-3" open={Object.keys(ev.profil).length > 0}>
          <summary className="font-semibold cursor-pointer">B. Profil usia perkembangan <span className="text-xs text-text-secondary font-normal">(opsional)</span></summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead className="text-left text-text-secondary"><tr><th className="p-1">Domain</th><th className="p-1">Usia perkembangan</th><th className="p-1">Dasar penentuan</th><th className="p-1">Catatan</th></tr></thead>
              <tbody>
                {EVX.domain.map((d, i) => {
                  const o = ev.profil[i] ?? {};
                  const setP = (k: "usia" | "dasar" | "cat", val: string) => patch({ profil: { ...ev.profil, [i]: { ...o, [k]: val } } });
                  return (
                    <tr key={d}>
                      <td className="p-1 font-semibold">{d}</td>
                      <td className="p-1"><input value={o.usia ?? ""} onChange={(e) => setP("usia", e.target.value)} className="input" placeholder="… th … bln" /></td>
                      <td className="p-1"><input value={o.dasar ?? ""} onChange={(e) => setP("dasar", e.target.value)} className="input" /></td>
                      <td className="p-1"><input value={o.cat ?? ""} onChange={(e) => setP("cat", e.target.value)} className="input" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>

        <details className="bg-background rounded-2xl border border-black/5 p-3">
          <summary className="font-semibold cursor-pointer">C. Panduan penilaian</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {EVX.skala.map(([v, l, d]) => (
              <li key={v}><b className="inline-block w-10">{v === "NA" ? "N/A" : v}</b><b>{l}</b> — {d}</li>
            ))}
          </ul>
          <p className="text-xs text-text-secondary mt-2">Status otomatis: 4 = Lulus (L), 1–3 = Proses (P), 0 = Belum (B). Kosong/N/A tidak dihitung. Aspek tercapai bila ≥80% indikator lulus.</p>
        </details>

        <Sec title="1A. Indikator perkembangan">
          <p className="text-xs text-text-secondary mb-3">
            Isi skor <b>Eval {period}</b>.{" "}
            {showAwal ? "Karena ini evaluasi pertama, isi juga skor awal (baseline)." : `Skor awal diambil dari evaluasi pertama (${fmtDateLong(String(previous[0]?.report_date ?? ""))}).`}
          </p>
          {T.aspek.map((a) => {
            const r = sum.rows.find((x) => x.k === a.k)!;
            return (
              <details key={a.k} open className="mb-3 border border-black/5 rounded-2xl">
                <summary className="px-3 py-2 cursor-pointer bg-background rounded-2xl">
                  <b>{a.k}. {a.nama}</b> <span className="text-xs text-text-secondary">· {r.n}/{r.total} dinilai · {r.L} lulus</span>
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-text-secondary">
                      <tr>
                        <th className="p-2 w-12">No.</th>
                        <th className="p-2">Indikator & target kelulusan (skor 4)</th>
                        <th className="p-2 w-28">Riwayat</th>
                        {showAwal && <th className="p-2 w-28">Awal</th>}
                        <th className="p-2 w-32">Eval {period}</th>
                        <th className="p-2 w-12">Status</th>
                        <th className="p-2 w-36">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {a.ind.map(([kode, ind, usia, target]) => {
                        const hist = [
                          ev.awal[kode] ? `Awal ${evSkorTxt(ev.awal[kode])}` : "",
                          ...previous.map((p) => {
                            const v = ((p.payload as EvPayload)?.skor ?? {})[kode];
                            return v != null && v !== "" ? `E${p.period} ${evSkorTxt(v)}` : "";
                          }),
                        ].filter(Boolean).join(" · ");
                        return (
                          <tr key={kode}>
                            <td className="p-2 font-semibold">{kode}</td>
                            <td className="p-2">{ind}<div className="text-text-secondary">Acuan {usia} · {target}</div></td>
                            <td className="p-2 text-text-secondary">{hist || "—"}</td>
                            {showAwal && (
                              <td className="p-2">
                                <select value={ev.awal[kode] ?? ""} onChange={(e) => patch({ awal: { ...ev.awal, [kode]: e.target.value } })} className="input">{opt}</select>
                              </td>
                            )}
                            <td className="p-2">
                              <select value={ev.skor[kode] ?? ""} onChange={(e) => patch({ skor: { ...ev.skor, [kode]: e.target.value } })} className="input">{opt}</select>
                            </td>
                            <td className="p-2"><StatusTag v={ev.skor[kode]} /></td>
                            <td className="p-2">
                              <input value={ev.cat[kode] ?? ""} onChange={(e) => patch({ cat: { ...ev.cat, [kode]: e.target.value } })} className="input" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
          <p className="text-[11px] text-text-secondary">{EVX.legend}</p>
        </Sec>

        {service === "BT" && <PmEditor ev={ev} patch={patch} period={period} previous={previous} />}

        <Sec title="Ringkasan hasil per aspek">
          <SummaryTable service={service} ev={ev} onCat={(k, v) => patch({ aspekCat: { ...ev.aspekCat, [k]: v } })} />
        </Sec>

        <Field label="Kekuatan anak">
          <textarea rows={2} value={ev.kekuatan} onChange={(e) => patch({ kekuatan: e.target.value })} className="input" placeholder="Kemampuan yang menonjol dan faktor pendukung" />
        </Field>
        <Field label="Hambatan / area prioritas">
          <textarea rows={2} value={ev.hambatan} onChange={(e) => patch({ hambatan: e.target.value })} className="input" placeholder="Indikator berskor ≤2 yang menjadi prioritas" />
        </Field>
        <Field label="Keputusan program">
          <div className="space-y-2">
            {EVX.keputusan.map((k, i) => (
              <div key={k}>
                <Chips options={[k]} value={ev.keputusan} onToggle={(v) => patch({ keputusan: toggle(ev.keputusan, v) })} />
                {i === 2 && ev.keputusan.includes(k) && (
                  <div className="ml-4 mt-1"><Chips options={EVX.frek} value={ev.frekUbah} onToggle={(v) => patch({ frekUbah: toggle(ev.frekUbah, v) })} /></div>
                )}
                {i === 4 && ev.keputusan.includes(k) && (
                  <input value={ev.rujuk} onChange={(e) => patch({ rujuk: e.target.value })} className="input mt-1" placeholder="dokter anak/tumbuh kembang, THT, mata, fisioterapi, psikolog, lainnya" />
                )}
              </div>
            ))}
          </div>
        </Field>
        {T.lulus && (
          <Field label="Kriteria lulus program">
            <p className="text-xs text-text-secondary bg-background rounded-xl p-3">{T.lulus}</p>
          </Field>
        )}
        <Field label="Program rumah & sekolah">
          <textarea rows={3} value={homeProgram} onChange={(e) => setHomeProgram(e.target.value)} className="input" placeholder="Kegiatan yang dilakukan orang tua dan guru, frekuensi, dan cara memantaunya" />
        </Field>
      </div>
      <SaveBar saving={saving} error={err} onSave={save} isEdit={isEdit} currentStatus={initial?.status} />
    </ReportModal>
  );
}

function PmEditor({ ev, patch, period, previous }: { ev: EvPayload; patch: (p: Partial<EvPayload>) => void; period: number; previous: AnyReport[] }) {
  const names = [...EVX.pm, ...ev.pm.filter((p) => !EVX.pm.includes(p.nama)).map((p) => p.nama), ""];
  const get = (nama: string): EvPm => ev.pm.find((p) => p.nama === nama) ?? { nama, on: false, def: "", fungsi: [], base: "", nilai: "", target: "" };
  const put = (oldName: string, o: EvPm) => {
    const rest = ev.pm.filter((p) => p.nama !== oldName);
    patch({ pm: o.nama ? [...rest, o] : rest });
  };
  return (
    <Sec title="1B. Perilaku menantang (target pengurangan)">
      <p className="text-xs text-text-secondary mb-2">Centang perilaku yang dipantau. {EVX.pmCatat}</p>
      {names.map((nama, i) => {
        const o = get(nama);
        const custom = !EVX.pm.includes(nama);
        const prevV = previous
          .map((p) => {
            const q = ((p.payload as EvPayload)?.pm ?? []).find((x) => x.nama === nama);
            return q?.nilai ? `Eval ${p.period}: ${q.nilai}` : "";
          })
          .filter(Boolean)
          .join(" · ");
        return (
          <div key={i} className={`rounded-2xl border p-3 mb-2 ${o.on ? "border-primary/40 bg-primary/5" : "border-black/5"}`}>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={o.on} onChange={(e) => put(nama, { ...o, nama: nama || o.nama, on: e.target.checked })} />
              {custom ? (
                <input value={o.nama} onChange={(e) => put(nama, { ...o, nama: e.target.value })} className="input" placeholder="Perilaku lain (sebutkan)" />
              ) : (
                nama
              )}
            </label>
            {o.on && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <Field label="Definisi operasional"><input value={o.def} onChange={(e) => put(nama, { ...o, def: e.target.value })} className="input" /></Field>
                <Field label="Dugaan fungsi">
                  <Chips options={EVX.fungsi} value={o.fungsi} onToggle={(v) => put(nama, { ...o, fungsi: o.fungsi.includes(v) ? o.fungsi.filter((x) => x !== v) : [...o.fungsi, v] })} />
                </Field>
                <Field label="Baseline (frek./durasi)"><input value={o.base} onChange={(e) => put(nama, { ...o, base: e.target.value })} className="input" placeholder="mis. 5x/hari, 10 menit" /></Field>
                <Field label={`Eval ${period} (saat ini)`}><input value={o.nilai} onChange={(e) => put(nama, { ...o, nilai: e.target.value })} className="input" placeholder="mis. 2x/hari, ringan" /></Field>
                {prevV && <p className="text-xs text-text-secondary md:col-span-2">Sebelumnya — {prevV}</p>}
                <div className="md:col-span-2">
                  <Field label="Target kelulusan & perilaku pengganti"><input value={o.target} onChange={(e) => put(nama, { ...o, target: e.target.value })} className="input" /></Field>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Sec>
  );
}

// ======================= DOKUMEN =======================

export function EvaluationDocument({
  row,
  child,
  siblings,
  author,
  pj,
}: {
  row: AnyReport;
  child: Pick<Child, "full_name" | "dob" | "gender" | "rm_number">;
  siblings: AnyReport[];
  author?: SignatureData | null;
  pj?: PjSetting | null;
}) {
  const service = row.service as EvalService;
  const T = EVT[service];
  const ev = { ...emptyEv(), ...((row.payload as EvPayload) ?? {}) };
  const per = Number(row.period ?? 1);
  // kolom: Awal + hingga 3 periode (berakhir di periode ini)
  const start = Math.max(1, per - 2);
  const cols = [0, 1, 2].map((i) => start + i).filter((k) => k <= per).map((k) => {
    if (k === per) return { label: `Eval ${k}`, skor: ev.skor };
    const p = siblings.filter((x) => x.service === service && Number(x.period) === k).pop();
    return { label: `Eval ${k}`, skor: ((p?.payload as EvPayload)?.skor ?? {}) as Record<string, string> };
  });
  const sum = evRingkas(service, ev);
  return (
    <div className="p-6 md:p-8 text-xs space-y-4 fc-print-area">
      <ReportKop title={`Evaluasi Perkembangan — ${T.judul}`} code={`${EVX.kode}-${service}`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-black/20 p-2">
        <span>Nama: <b>{child.full_name}</b></span>
        <span>JK: <b>{child.gender === "L" ? "Laki-laki" : "Perempuan"}</b></span>
        <span>Tgl lahir: <b>{fmtDateLong(child.dob)}</b></span>
        <span>Usia: <b>{fmtAge(ageMonths(child.dob, String(row.report_date)))}</b></span>
        <span>No. RM: <b>{child.rm_number}</b></span>
        <span>Evaluasi ke-<b>{per}</b> · {fmtDateLong(String(row.report_date))}</span>
        <span>Frekuensi: <b>{ev.frek || "-"}</b></span>
        <span>Setting: <b>{ev.setting.join(", ") || "-"}</b></span>
        <span className="col-span-2">Kondisi: <b>{[...ev.kondisi, ev.kondisiLain].filter(Boolean).join(", ") || "-"}</b></span>
        <span className="col-span-2">Sekolah: <b>{ev.sekolah || "-"}</b></span>
      </div>
      {ev.riwayat && <p><b>Riwayat:</b> {ev.riwayat}</p>}
      {ev.penunjang && <p><b>Pemeriksaan penunjang:</b> {ev.penunjang}</p>}

      {T.aspek.map((a) => (
        <table key={a.k} className="w-full border border-black/20 break-inside-avoid">
          <thead>
            <tr className="bg-primary/10">
              <th colSpan={4 + cols.length} className="text-left p-1.5">{a.k}. {a.nama}</th>
            </tr>
            <tr className="text-left">
              <th className="border border-black/20 p-1 w-10">No</th>
              <th className="border border-black/20 p-1">Indikator</th>
              <th className="border border-black/20 p-1 w-12">Awal</th>
              {cols.map((c) => <th key={c.label} className="border border-black/20 p-1 w-12">{c.label}</th>)}
              <th className="border border-black/20 p-1 w-12">Status</th>
            </tr>
          </thead>
          <tbody>
            {a.ind.map(([kode, ind]) => (
              <tr key={kode}>
                <td className="border border-black/20 p-1 font-semibold">{kode}</td>
                <td className="border border-black/20 p-1">
                  {ind}
                  {ev.cat[kode] && <div className="text-text-secondary italic">{ev.cat[kode]}</div>}
                </td>
                <td className="border border-black/20 p-1 text-center">{evSkorTxt(ev.awal[kode])}</td>
                {cols.map((c) => <td key={c.label} className="border border-black/20 p-1 text-center">{evSkorTxt(c.skor[kode])}</td>)}
                <td className="border border-black/20 p-1 text-center"><StatusTag v={ev.skor[kode]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      <p className="text-[10px] text-text-secondary">{EVX.legend}</p>

      {service === "BT" && ev.pm.filter((p) => p.on).length > 0 && (
        <table className="w-full border border-black/20 break-inside-avoid">
          <thead>
            <tr className="text-left bg-primary/10">
              <th className="border border-black/20 p-1">Perilaku menantang</th>
              <th className="border border-black/20 p-1">Definisi</th>
              <th className="border border-black/20 p-1">Fungsi</th>
              <th className="border border-black/20 p-1">Baseline</th>
              <th className="border border-black/20 p-1">Eval {per}</th>
              <th className="border border-black/20 p-1">Target & pengganti</th>
            </tr>
          </thead>
          <tbody>
            {ev.pm.filter((p) => p.on).map((p) => (
              <tr key={p.nama}>
                <td className="border border-black/20 p-1 font-semibold">{p.nama}</td>
                <td className="border border-black/20 p-1">{p.def}</td>
                <td className="border border-black/20 p-1">{p.fungsi.join(", ")}</td>
                <td className="border border-black/20 p-1">{p.base}</td>
                <td className="border border-black/20 p-1">{p.nilai}</td>
                <td className="border border-black/20 p-1">{p.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="break-inside-avoid">
        <p className="font-bold mb-1">Ringkasan hasil per aspek</p>
        <SummaryTable service={service} ev={ev} />
        <p className="mt-1">Total lulus: <b>{sum.t.pct == null ? "—" : sum.t.pct + "%"}</b> ({sum.t.L} dari {sum.t.n} indikator dinilai)</p>
      </div>
      {ev.kekuatan && <p><b>Kekuatan anak:</b> {ev.kekuatan}</p>}
      {ev.hambatan && <p><b>Hambatan / area prioritas:</b> {ev.hambatan}</p>}
      <div>
        <b>Keputusan program:</b>
        <div className="mt-1">
          {EVX.keputusan.map((k, i) => (
            <div key={k}>
              <Tick on={ev.keputusan.includes(k)} label={k} />
              {i === 2 && ev.frekUbah.length > 0 && <span className="text-text-secondary">({ev.frekUbah.join(", ")})</span>}
              {i === 4 && ev.rujuk && <span className="text-text-secondary">— {ev.rujuk}</span>}
            </div>
          ))}
        </div>
      </div>
      {row.home_program ? <p className="whitespace-pre-line"><b>Program rumah & sekolah:</b> {String(row.home_program)}</p> : null}
      <SignatureBlock date={String(row.report_date)} authorId={String(row.author_id)} author={author} pj={pj} />
    </div>
  );
}

function SummaryTable({ service, ev, onCat }: { service: EvalService; ev: EvPayload; onCat?: (k: string, v: string) => void }) {
  const { rows, t } = evRingkas(service, ev);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-black/10">
        <thead className="bg-background text-left">
          <tr>
            <th className="p-1.5">Aspek</th><th className="p-1.5">Σ</th><th className="p-1.5">Dinilai</th><th className="p-1.5">Lulus</th>
            <th className="p-1.5">Proses</th><th className="p-1.5">Belum</th><th className="p-1.5">% Lulus</th><th className="p-1.5">Catatan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((x) => (
            <tr key={x.k}>
              <td className="p-1.5">
                {x.k}. {x.nama}{" "}
                {isTercapai(x) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Tercapai</span>}
              </td>
              <td className="p-1.5">{x.total}</td><td className="p-1.5">{x.n}</td><td className="p-1.5">{x.L}</td>
              <td className="p-1.5">{x.P}</td><td className="p-1.5">{x.B}</td>
              <td className="p-1.5 font-semibold">{x.pct == null ? "—" : x.pct + "%"}</td>
              <td className="p-1.5">{onCat ? <input value={x.cat} onChange={(e) => onCat(x.k, e.target.value)} className="input" /> : x.cat}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="p-1.5">TOTAL</td><td className="p-1.5">{t.total}</td><td className="p-1.5">{t.n}</td><td className="p-1.5">{t.L}</td>
            <td className="p-1.5">{t.P}</td><td className="p-1.5">{t.B}</td><td className="p-1.5">{t.pct == null ? "—" : t.pct + "%"}</td><td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StatusTag({ v }: { v: unknown }) {
  const s = evStatus(v);
  if (!s) return <span className="text-text-secondary">—</span>;
  const cls = s === "L" ? "bg-green-100 text-green-700" : s === "P" ? "bg-yellow/10 text-yellow-700" : "bg-red/10 text-red";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cls}`}>{s}</span>;
}

// ======================= GRAFIK PERKEMBANGAN (portal orang tua) =======================

const SEQ = ["#F6D7AE", "#EFAE5C", "#D9801A", "#9C5409", "#6E3A05"];
const ST_COLOR = { L: "#0ca30c", P: "#fab219", B: "#ec835a" };

/** Skor rata-rata per aspek Awal → Eval 1 → Eval 2…, status L/P/B evaluasi terakhir, % lulus. */
export function EvalProgressChart({ evaluations, onOpen }: { evaluations: AnyReport[]; onOpen?: (r: AnyReport) => void }) {
  const services = [...new Set(evaluations.map((r) => r.service as EvalService))].filter((s) => EVT[s]);
  if (!services.length)
    return <p className="text-sm text-text-secondary">Grafik muncul setelah ada Laporan Evaluasi Perkembangan yang terbit.</p>;
  return (
    <div className="space-y-5">
      {services.map((svc) => {
        const T = EVT[svc];
        const evs = evaluations.filter((r) => r.service === svc).sort((a, b) => Number(a.period) - Number(b.period));
        const last = evs[evs.length - 1];
        const lastEv = { ...emptyEv(), ...((last.payload as EvPayload) ?? {}) };
        let per = [{ label: "Awal", skor: lastEv.awal, tgl: "" }, ...evs.map((r) => ({ label: `Eval ${r.period}`, skor: ((r.payload as EvPayload)?.skor ?? {}) as Record<string, string>, tgl: String(r.report_date) }))];
        if (!Object.keys(per[0].skor).length) per = per.slice(1);
        per = per.slice(-5);
        const col = (i: number) => SEQ[Math.round((i * (SEQ.length - 1)) / Math.max(1, per.length - 1))] || SEQ[SEQ.length - 1];
        const now = evPct(lastEv.skor, svc);
        const prev = per.length > 1 ? evPct(per[per.length - 2].skor, svc) : null;
        const delta = now && prev ? now.pct - prev.pct : null;
        const rows = T.aspek.map((a) => ({ a, v: per.map((p) => evAvg(p.skor, a)) })).filter((x) => x.v.some((v) => v != null));
        const sum = evRingkas(svc, lastEv).rows;
        return (
          <div key={svc} className="bg-background rounded-2xl p-5 border border-primary/10">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-primary font-semibold">{SERVICE_NAME[svc]}</p>
                <h4 className="font-heading font-bold text-lg">Evaluasi ke-{String(last.period)}</h4>
                <p className="text-xs text-text-secondary">{fmtDateLong(String(last.report_date))}</p>
              </div>
              {now && (
                <div className="text-right">
                  <p className="text-3xl font-heading font-extrabold text-primary">{now.pct}%</p>
                  <p className="text-xs text-text-secondary">indikator sudah lulus ({now.L} dari {now.n})</p>
                  {delta != null && (
                    <p className={`text-xs font-semibold ${delta > 0 ? "text-green-700" : delta < 0 ? "text-red" : "text-text-secondary"}`}>
                      {delta === 0 ? `Sama dengan ${per[per.length - 2].label}` : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} poin dibanding ${per[per.length - 2].label}`}
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs font-semibold mb-1">Skor rata-rata per aspek <span className="font-normal text-text-secondary">(0 = belum muncul · 4 = mandiri, konsisten)</span></p>
            <div className="flex flex-wrap gap-3 text-[11px] mb-2">
              {per.map((p, i) => (
                <span key={p.label} className="inline-flex items-center gap-1">
                  <i className="w-3 h-3 rounded-full inline-block" style={{ background: col(i) }} />
                  {p.label}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {rows.map(({ a, v }) => {
                const xs = v.filter((x): x is number => x != null);
                const lo = Math.min(...xs);
                const hi = Math.max(...xs);
                return (
                  <div key={a.k} className="grid grid-cols-[minmax(0,180px)_1fr_40px] items-center gap-2 text-xs">
                    <span className="truncate" title={a.nama}>{a.k}. {a.nama}</span>
                    <div className="relative h-4" role="img" aria-label={`${a.nama}: ${per.map((p, i) => `${p.label} ${fmt1(v[i])}`).join(", ")}`}>
                      {[0, 1, 2, 3, 4].map((g) => <i key={g} className="absolute top-0 bottom-0 w-px bg-black/10" style={{ left: `${g * 25}%` }} />)}
                      {xs.length > 1 && <span className="absolute top-1.5 h-1 rounded-full bg-primary/30" style={{ left: `${lo * 25}%`, width: `${(hi - lo) * 25}%` }} />}
                      {v.map((x, i) =>
                        x == null ? null : (
                          <span
                            key={i}
                            title={`${per[i].label}: ${fmt1(x)} dari 4`}
                            className="absolute top-0.5 w-3 h-3 -ml-1.5 rounded-full border border-white"
                            style={{ left: `${x * 25}%`, background: col(i), zIndex: i + 1 }}
                          />
                        )
                      )}
                    </div>
                    <b className="text-right">{fmt1(v[v.length - 1])}</b>
                  </div>
                );
              })}
            </div>

            <p className="text-xs font-semibold mt-4 mb-1">Status indikator — evaluasi terakhir</p>
            <div className="flex flex-wrap gap-3 text-[11px] mb-2">
              <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded inline-block" style={{ background: ST_COLOR.L }} />Lulus</span>
              <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded inline-block" style={{ background: ST_COLOR.P }} />Proses</span>
              <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded inline-block" style={{ background: ST_COLOR.B }} />Belum</span>
            </div>
            <div className="space-y-1.5">
              {sum.filter((x) => x.n).map((x) => (
                <div key={x.k} className="grid grid-cols-[minmax(0,180px)_1fr_40px] items-center gap-2 text-xs">
                  <span className="truncate">{x.k}. {x.nama}</span>
                  <div className="flex h-4 rounded-full overflow-hidden text-[10px] text-white font-semibold">
                    {(["L", "P", "B"] as const).map((k) =>
                      x[k] ? (
                        <span key={k} className="flex items-center justify-center" style={{ flex: x[k], background: ST_COLOR[k] }}>{x[k]}</span>
                      ) : null
                    )}
                  </div>
                  <b className="text-right">{x.pct}%</b>
                </div>
              ))}
            </div>
            {onOpen && (
              <button onClick={() => onOpen(last)} className="mt-4 text-xs text-primary font-semibold hover:underline">
                Baca laporan evaluasi →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ======================= kecil =======================
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-heading font-bold text-base pb-1 mb-3 border-b border-primary/30 text-primary">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-sm font-medium text-text-primary mb-1.5">{label}</span>
      {children}
    </div>
  );
}
function Chips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors text-left ${
            value.includes(o) ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
          }`}
        >
          {value.includes(o) ? "✓ " : ""}{o}
        </button>
      ))}
    </div>
  );
}
