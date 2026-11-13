import { useEffect, useMemo, useState } from "react";
import { Brain, Printer, Sparkles, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { printWithTitle, isoDate } from "@/lib/print";
import { fmtAge, fmtDateLong, isoLocal } from "@/lib/dates";
import { loadSetting, type PjSetting } from "@/lib/settings";
import type { Child } from "@/types/database";
import { PatientReportShell, ReportModal, SaveBar } from "./PatientReportShell";
import { ReportKop, SignatureBlock, Tick, type SignatureData } from "./ReportPrint";
import { DraftBanner, clearDraft, useAutosave } from "./autosave";
import {
  PT, PT_LV, PT_LVN, iqKlas, nbSaran, ptAlat, ptDerive, ptDraftKes, ptInit, ptMods, ptNama, ptNarasi, ptSuggestSaran, ssLevel,
  type NarrativeBank, type PtLevel, type PtModule, type PtPackage, type PtPayload,
} from "./psikotes";
import { REPORT_META, type AnyReport } from "./reportKinds";

export function useNarrativeBank() {
  const [bank, setBank] = useState<NarrativeBank>({});
  useEffect(() => {
    void loadSetting("narasi").then((v) => setBank(v as NarrativeBank));
  }, []);
  return bank;
}

export function PsychotestView() {
  const { role } = useAuth();
  return (
    <PatientReportShell
      kind="psikotes"
      icon={Brain}
      canWrite={role === "psikolog" || role === "super_admin"}
      summary={(r) => {
        const pt = r.payload as PtPayload;
        return (
          <span>
            {PT.paket[(r.package as PtPackage) ?? "iq"]?.nama}
            {pt?.wisc?.iqT ? ` · IQ ${pt.wisc.iqT} (${iqKlas(pt.wisc.iqT)})` : ""}
            {pt?.nst?.keputusan ? ` · ${pt.nst.keputusan}` : ""}
          </span>
        );
      }}
      renderForm={(p) => <PtForm {...p} />}
      renderDetail={({ child, row, onClose }) => <PtDetail child={child} row={row} onClose={onClose} />}
    />
  );
}

function PtDetail({ child, row, onClose }: { child: Child; row: AnyReport; onClose: () => void }) {
  const [full, setFull] = useState(true);
  const pt = row.payload as PtPayload;
  return (
    <ReportModal
      wide
      title="Laporan Psikotes"
      subtitle={`${child.full_name} · RM ${child.rm_number}`}
      onClose={onClose}
      actions={
        <>
          {pt?.sembunyi && (
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setFull((v) => !v)}>
              {full ? "Lihat versi orang tua" : "Lihat versi lengkap"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-2"
            onClick={() => printWithTitle(`PSIKOTES_${child.rm_number}_${child.full_name.replace(/\s+/g, "-")}_${isoDate(String(row.report_date))}${full ? "" : "_ortu"}`)}
          >
            <Printer size={14} className="mr-1" /> Print / PDF
          </Button>
        </>
      }
    >
      <PsychotestDocument row={row} child={child} full={full} />
    </ReportModal>
  );
}

// ======================= FORM =======================

function PtForm({ child, initial, onClose, onSaved }: { child: Child; initial?: AnyReport; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const bank = useNarrativeBank();
  const isEdit = Boolean(initial?.id);
  const [date, setDate] = useState(String(initial?.report_date ?? isoLocal()));
  const [pt, setPt] = useState<PtPayload>(() => ({ ...ptInit(child.dob), ...((initial?.payload as PtPayload) ?? {}) }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const draftKey = `pt_${child.id}_${initial?.id ?? "new"}`;
  useAutosave(draftKey, { date, pt });

  const nama = ptNama(child.full_name, child.nickname);
  const mods = ptMods(pt);
  const d = useMemo(() => ptDerive(pt, child.dob, date), [pt, child.dob, date]);
  const patch = (p: Partial<PtPayload>) => setPt((s) => ({ ...s, ...p }));

  // Isi keterangan otomatis dari skor bila kolom keterangan masih kosong / masih teks otomatis
  function autoKet<T extends { ket: Record<string, string> }>(obj: T, kind: string, key: string, val: string, prevVal: string): T {
    const sug = ptNarasi(bank, kind, key, val, nama);
    const prevSug = ptNarasi(bank, kind, key, prevVal, nama);
    const cur = obj.ket[key] ?? "";
    if (!cur.trim() || cur === prevSug) return { ...obj, ket: { ...obj.ket, [key]: sug } };
    return obj;
  }

  async function save(status: "draft" | "terbit") {
    if (!profile) return;
    if (status === "terbit" && !pt.kes.akhir?.trim()) {
      setErr("Bagian Kesimpulan wajib diisi sebelum diterbitkan.");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload = { report_date: date, package: pt.paket, payload: pt, status };
    const res = isEdit
      ? await supabase.from("psychotest_reports").update(payload).eq("id", initial!.id)
      : await supabase.from("psychotest_reports").insert({ ...payload, child_id: child.id, author_id: profile.id });
    setSaving(false);
    if (res.error) return setErr(res.error.message);
    clearDraft(draftKey);
    onSaved();
  }

  const suggest = ptSuggestSaran(bank, pt, child.dob, date);

  return (
    <ReportModal wide title={`${isEdit ? "Edit" : "Buat"} Laporan Psikotes`} subtitle={`${child.full_name} · RM ${child.rm_number}`} onClose={onClose}>
      <div className="p-6 space-y-5 text-sm">
        <DraftBanner<{ date: string; pt: PtPayload }> storageKey={draftKey} onRestore={(v) => { setDate(v.date); setPt({ ...ptInit(child.dob), ...v.pt }); }} />
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 text-xs">
          Laporan psikotes disusun dari <b>kerangka bersama</b> (identitas, observasi, kesimpulan, saran, tindak lanjut) + <b>modul alat tes</b>. Narasi keterangan terisi otomatis dari skor dan tetap bisa disunting. Konversi skor mentah → skor skala/IQ tetap dilakukan manual (tabel norma berlisensi).
        </div>

        <Sec title="Paket pemeriksaan">
          <Radio options={Object.entries(PT.paket).map(([k, v]) => [k, v.nama])} value={pt.paket} onChange={(v) => patch({ paket: v as PtPackage })} />
          {pt.paket === "custom" && (
            <Chips
              options={PT.urutan.map((k) => [k, PT.modul[k].nama])}
              value={pt.modul}
              onToggle={(k) => patch({ modul: pt.modul.includes(k as PtModule) ? pt.modul.filter((x) => x !== k) : [...pt.modul, k as PtModule] })}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Tanggal pemeriksaan"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
            <Field label="Tujuan pemeriksaan"><input value={pt.tujuan || PT.paket[pt.paket].tujuan} onChange={(e) => patch({ tujuan: e.target.value })} className="input" /></Field>
            <Field label="Alat tes · usia saat pemeriksaan"><p className="text-xs bg-background rounded-xl px-3 py-2.5"><b>{ptAlat(pt) || "—"}</b> · {fmtAge(d.um)}</p></Field>
          </div>
        </Sec>

        <Sec title="II. Observasi selama pemeriksaan">
          {PT.obs.map(([k, l, opts]) => (
            <Field key={k} label={l}><Radio options={opts.map((o) => [o, o])} value={pt.obs[k] ?? ""} onChange={(v) => patch({ obs: { ...pt.obs, [k]: v } })} /></Field>
          ))}
          <Field label="Kondisi saat tes">
            <div className="flex flex-wrap gap-2 items-center">
              <Radio options={[["Prima", "Prima"], ["Kurang prima", "Kurang prima"]]} value={pt.obs.kondisi ?? ""} onChange={(v) => patch({ obs: { ...pt.obs, kondisi: v } })} />
              <input value={pt.obs.kondisiKet ?? ""} onChange={(e) => patch({ obs: { ...pt.obs, kondisiKet: e.target.value } })} className="input max-w-xs" placeholder="keterangan bila kurang prima" />
            </div>
          </Field>
          <Field label="Validitas hasil">
            <div className="flex flex-wrap gap-2 items-center">
              <Radio options={[["Valid, dapat diinterpretasikan", "Valid, dapat diinterpretasikan"], ["Interpretasi hati-hati", "Interpretasi hati-hati"]]} value={pt.obs.valid ?? ""} onChange={(v) => patch({ obs: { ...pt.obs, valid: v } })} />
              <input value={pt.obs.validKet ?? ""} onChange={(e) => patch({ obs: { ...pt.obs, validKet: e.target.value } })} className="input max-w-xs" placeholder="karena …" />
            </div>
          </Field>
          <Field label="Catatan perilaku lain"><textarea rows={2} value={pt.obs.catatan ?? ""} onChange={(e) => patch({ obs: { ...pt.obs, catatan: e.target.value } })} className="input" /></Field>
        </Sec>

        {mods.includes("wisc") && (
          <Sec title="Modul WISC — psikogram intelegensi">
            <p className="text-xs text-text-secondary">Isi <b>skor skala</b>. Level dihitung otomatis: ≥16 ST · 13–15 T · 8–12 S · 5–7 R · ≤4 SR.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-text-secondary"><tr><th className="p-1">Aspek (subtes)</th><th className="p-1 w-20">Skor skala</th><th className="p-1 w-14">Level</th><th className="p-1">Keterangan</th></tr></thead>
                <tbody className="divide-y divide-black/5">
                  {PT.wisc.map(([g, k, n, sub], i) => (
                    <tr key={k}>
                      <td className="p-1">
                        {(i === 0 || PT.wisc[i - 1][0] !== g) && <p className="font-bold text-primary mt-1">{g === "V" ? "A. SKALA VERBAL" : "B. SKALA PERFORMANSI"}</p>}
                        <b>{n}</b><div className="text-text-secondary">Subtes: {sub}</div>
                      </td>
                      <td className="p-1">
                        <input
                          inputMode="numeric"
                          maxLength={2}
                          value={pt.wisc.ss[k] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const prev = pt.wisc.ss[k] ?? "";
                            const w = autoKet({ ...pt.wisc, ss: { ...pt.wisc.ss, [k]: val } }, "wisc", k, val, prev);
                            patch({ wisc: w });
                          }}
                          className="input"
                        />
                      </td>
                      <td className="p-1"><LvTag lv={ssLevel(pt.wisc.ss[k])} /></td>
                      <td className="p-1"><textarea rows={2} value={pt.wisc.ket[k] ?? ""} onChange={(e) => patch({ wisc: { ...pt.wisc, ket: { ...pt.wisc.ket, [k]: e.target.value } } })} className="input" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([["jv", "Jumlah skor skala Verbal"], ["iqV", "IQ Verbal"], ["jp", "Jumlah skor skala Performansi"], ["iqP", "IQ Performansi"], ["jt", "Jumlah skor skala Total"], ["iqT", "IQ Total *"], ["pot", "Potensi maksimal (IQ, opsional)"]] as const).map(([k, l]) => (
                <Field key={k} label={l}>
                  <input inputMode="numeric" value={(pt.wisc as Record<string, unknown>)[k] as string ?? ""} onChange={(e) => patch({ wisc: { ...pt.wisc, [k]: e.target.value.replace(/\D/g, "") } })} className="input" />
                </Field>
              ))}
              <Field label="Otomatis">
                <p className="text-xs">
                  {pt.wisc.iqV && <>IQ V: <b>{iqKlas(pt.wisc.iqV)}</b><br /></>}
                  {pt.wisc.iqP && <>IQ P: <b>{iqKlas(pt.wisc.iqP)}</b><br /></>}
                  {pt.wisc.iqT && <>IQ Total: <b>{iqKlas(pt.wisc.iqT)}</b><br /></>}
                  {d.profil && <>Profil: <b>{d.profil}</b></>}
                  {!pt.wisc.iqT && !pt.wisc.iqV && "—"}
                </p>
              </Field>
            </div>
            <p className="text-[11px] text-text-secondary">Kecenderungan profil otomatis bila selisih IQ Verbal–Performansi ≥ {PT.profilBatas} poin.</p>
          </Sec>
        )}

        {mods.includes("cpm") && (
          <Sec title="Modul CPM — screening inteligensi">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Skor mentah"><input value={pt.cpm.mentah ?? ""} onChange={(e) => patch({ cpm: { ...pt.cpm, mentah: e.target.value } })} className="input" /></Field>
              <Field label="Grade">
                <select
                  value={pt.cpm.grade ?? ""}
                  onChange={(e) => {
                    const g = e.target.value;
                    const sug = ptNarasi(bank, "cpm", "grade", g, nama);
                    const prevSug = ptNarasi(bank, "cpm", "grade", pt.cpm.grade ?? "", nama);
                    const ket = !pt.cpm.ket?.trim() || pt.cpm.ket === prevSug ? sug : pt.cpm.ket;
                    patch({ cpm: { ...pt.cpm, grade: g, ket } });
                  }}
                  className="input"
                >
                  <option value=""></option>
                  {Object.keys(PT.cpmGrade).map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Klasifikasi (otomatis)"><p className="text-xs font-semibold pt-2">{PT.cpmGrade[pt.cpm.grade ?? ""] || "—"}</p></Field>
              <Field label="Estimasi taraf IQ"><input value={pt.cpm.estimasi ?? ""} onChange={(e) => patch({ cpm: { ...pt.cpm, estimasi: e.target.value } })} className="input" placeholder="mis. 111 – 120" /></Field>
            </div>
            <Field label="Keterangan"><textarea rows={2} value={pt.cpm.ket ?? ""} onChange={(e) => patch({ cpm: { ...pt.cpm, ket: e.target.value } })} className="input" /></Field>
          </Sec>
        )}

        {mods.includes("nst") && (
          <Sec title="Modul NST — psikogram kesiapan sekolah">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-text-secondary"><tr><th className="p-1">Aspek</th><th className="p-1 w-56">Level</th><th className="p-1">Keterangan</th></tr></thead>
                <tbody className="divide-y divide-black/5">
                  {PT.nst.map(([k, l]) => (
                    <tr key={k}>
                      <td className="p-1 font-semibold">{l}</td>
                      <td className="p-1">
                        <div className="flex gap-1">
                          {PT_LV.map((v) => (
                            <button
                              key={v}
                              type="button"
                              title={PT_LVN[v]}
                              onClick={() => {
                                const prev = pt.nst.lv[k] ?? "";
                                const n = autoKet({ ...pt.nst, lv: { ...pt.nst.lv, [k]: v } }, "nst", k, v, prev);
                                patch({ nst: n });
                              }}
                              className={`text-xs w-9 py-1 rounded-full border font-semibold ${pt.nst.lv[k] === v ? "bg-primary/10 border-primary text-primary" : "border-black/10 text-text-secondary"}`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-1"><textarea rows={2} value={pt.nst.ket[k] ?? ""} onChange={(e) => patch({ nst: { ...pt.nst, ket: { ...pt.nst.ket, [k]: e.target.value } } })} className="input" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Field label="Kesiapan sekolah *"><Radio options={PT.kesiapan.map((v) => [v, v])} value={pt.nst.keputusan ?? ""} onChange={(v) => patch({ nst: { ...pt.nst, keputusan: v } })} /></Field>
          </Sec>
        )}

        {mods.includes("dtvp") && (
          <Sec title="Modul Frostig / DTVP — visual-perseptual & visual-motorik">
            <p className="text-xs text-text-secondary">Isi usia mental per aspek. Dibanding otomatis dengan usia kronologis ({fmtAge(d.um)}); selisih ≥ 3 bulan = di atas/di bawah.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-text-secondary"><tr><th className="p-1">Aspek</th><th className="p-1 w-44">Usia mental</th><th className="p-1 w-36">Dibanding usia</th><th className="p-1">Keterangan</th></tr></thead>
                <tbody className="divide-y divide-black/5">
                  {PT.dtvp.map(([k, l]) => {
                    const setAge = (th: string, bl: string) => {
                      const nextPt = { ...pt, dtvp: { ...pt.dtvp, th: { ...pt.dtvp.th, [k]: th }, bl: { ...pt.dtvp.bl, [k]: bl } } };
                      const prevBand = d.dtvp.find((x) => x.k === k)?.banding ?? "";
                      const band = ptDerive(nextPt, child.dob, date).dtvp.find((x) => x.k === k)?.banding ?? "";
                      patch({ dtvp: autoKet(nextPt.dtvp, "dtvp", k, band, prevBand) });
                    };
                    return (
                      <tr key={k}>
                        <td className="p-1 font-semibold">{l}</td>
                        <td className="p-1">
                          <div className="flex gap-1">
                            <select value={pt.dtvp.th[k] ?? ""} onChange={(e) => setAge(e.target.value, pt.dtvp.bl[k] ?? "0")} className="input">
                              <option value=""></option>
                              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => <option key={t} value={t}>{t} th</option>)}
                            </select>
                            <select value={pt.dtvp.bl[k] ?? "0"} onChange={(e) => setAge(pt.dtvp.th[k] ?? "", e.target.value)} className="input">
                              {[...Array(12).keys()].map((b) => <option key={b} value={b}>{b} bln</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="p-1">{d.dtvp.find((x) => x.k === k)?.banding || "—"}</td>
                        <td className="p-1"><textarea rows={2} value={pt.dtvp.ket[k] ?? ""} onChange={(e) => patch({ dtvp: { ...pt.dtvp, ket: { ...pt.dtvp.ket, [k]: e.target.value } } })} className="input" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Sec>
        )}

        {mods.includes("se") && (
          <Sec title="Modul sosial-emosional">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-black/5">
                  {PT.se.map(([k, l]) => (
                    <tr key={k}>
                      <td className="p-1 font-semibold w-44">{l}</td>
                      <td className="p-1 w-60">
                        <select
                          value={pt.se.st[k] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            patch({ se: autoKet({ ...pt.se, st: { ...pt.se.st, [k]: v } }, "se", k, v, pt.se.st[k] ?? "") });
                          }}
                          className="input"
                        >
                          <option value=""></option>
                          {PT.seStatus.map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td className="p-1"><textarea rows={2} value={pt.se.ket[k] ?? ""} onChange={(e) => patch({ se: { ...pt.se, ket: { ...pt.se.ket, [k]: e.target.value } } })} className="input" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Field label="Catatan sosial-emosional"><textarea rows={2} value={pt.se.catatan ?? ""} onChange={(e) => patch({ se: { ...pt.se, catatan: e.target.value } })} className="input" /></Field>
          </Sec>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Aspek terkuat (otomatis, bisa diubah)"><input value={pt.kuat} onChange={(e) => patch({ kuat: e.target.value })} className="input" placeholder={d.terkuat} /></Field>
          <Field label="Aspek perlu perhatian"><input value={pt.perhatian} onChange={(e) => patch({ perhatian: e.target.value })} className="input" placeholder={d.perhatian} /></Field>
        </div>

        <Sec title="Kesimpulan *">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              const draft = ptDraftKes(bank, pt, nama, child.dob, date);
              const kes = { ...pt.kes };
              Object.entries(draft).forEach(([k, v]) => { if (!kes[k]?.trim()) kes[k] = v; });
              patch({ kes });
            }}
          >
            <Sparkles size={14} className="mr-1" /> Isi draf awal dari skor (bagian yang masih kosong)
          </Button>
          {PT.kes[pt.paket].map(([k, l], i) => (
            <Field key={k} label={`${i + 1}. ${l}`}>
              <textarea rows={k === "akhir" ? 5 : 4} value={pt.kes[k] ?? ""} onChange={(e) => patch({ kes: { ...pt.kes, [k]: e.target.value } })} className="input" />
            </Field>
          ))}
        </Sec>

        <Sec title="Saran">
          {pt.saran.map((s, i) => {
            const setS = (p: Partial<typeof s>) => patch({ saran: pt.saran.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <div key={i} className="border border-black/5 rounded-2xl p-3 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <input value={s.judul} onChange={(e) => setS({ judul: e.target.value })} className="input flex-1 font-semibold" />
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={s.sekolah} onChange={(e) => setS({ sekolah: e.target.checked })} /> Sekolah</label>
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={s.rumah} onChange={(e) => setS({ rumah: e.target.checked })} /> Rumah</label>
                  <button type="button" onClick={() => patch({ saran: pt.saran.filter((_, j) => j !== i) })} className="p-2 text-red hover:bg-red/10 rounded-full" aria-label="Hapus saran"><Trash2 size={14} /></button>
                </div>
                <textarea rows={2} value={s.isi} onChange={(e) => setS({ isi: e.target.value })} className="input" />
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-text-secondary">Disarankan dari hasil:</span>
            {[...suggest, ""].map((k) => {
              const [judul, isi] = k ? nbSaran(bank, k) : ["Saran lain", ""];
              return (
                <button
                  key={k || "lain"}
                  type="button"
                  onClick={() => patch({ saran: [...pt.saran, { key: k, judul: k ? judul : "", isi, sekolah: true, rumah: true }] })}
                  className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:border-primary/40 inline-flex items-center gap-1"
                >
                  <Plus size={12} /> {judul}
                </button>
              );
            })}
          </div>
        </Sec>

        <Sec title="Tindak lanjut">
          <Chips options={PT.tindak.map((t) => [t, t])} value={pt.tindak} onToggle={(t) => patch({ tindak: pt.tindak.includes(t) ? pt.tindak.filter((x) => x !== t) : [...pt.tindak, t] })} />
          {pt.tindak.includes("Evaluasi ulang") && (
            <input value={pt.evalBln} onChange={(e) => patch({ evalBln: e.target.value })} className="input max-w-[220px]" placeholder="evaluasi ulang … bulan" />
          )}
        </Sec>

        <Sec title="Tampilan laporan">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pt.ringkas} onChange={(e) => patch({ ringkas: e.target.checked })} /> Tampilkan <b>ringkasan 1 halaman</b> di awal laporan</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pt.sembunyi} onChange={(e) => patch({ sembunyi: e.target.checked })} /> Versi orang tua: tampilkan <b>kategori saja</b> (sembunyikan skor skala & angka IQ)</label>
        </Sec>
      </div>
      <SaveBar saving={saving} error={err} onSave={save} isEdit={isEdit} currentStatus={initial?.status} />
    </ReportModal>
  );
}

// ======================= DOKUMEN =======================

export function PsychotestDocument({
  row,
  child,
  full = true,
  authorName,
  author,
  pj,
}: {
  row: AnyReport;
  child: Pick<Child, "full_name" | "nickname" | "dob" | "gender" | "rm_number">;
  full?: boolean;
  authorName?: string;
  author?: SignatureData | null;
  pj?: PjSetting | null;
}) {
  const pt = { ...ptInit(child.dob), ...((row.payload as PtPayload) ?? {}) };
  const date = String(row.report_date);
  const d = ptDerive(pt, child.dob, date);
  const mods = ptMods(pt);
  const hide = !full && pt.sembunyi;
  const w = pt.wisc;
  const nm = ptNama(child.full_name, child.nickname);
  let n = 2;
  const H = (t: string) => <p className="font-bold mt-4 mb-1">{["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n++]}. {t}</p>;
  const ringkas: [string, string][] = [];
  if (mods.includes("wisc") && w.iqT) ringkas.push(["Kapasitas intelektual", hide ? iqKlas(w.iqT) : `IQ ${w.iqT} — ${iqKlas(w.iqT)}`]);
  if (mods.includes("cpm") && pt.cpm.grade) ringkas.push(["Penalaran nonverbal (CPM)", PT.cpmGrade[pt.cpm.grade]]);
  if (mods.includes("nst") && pt.nst.keputusan) ringkas.push(["Kesiapan sekolah", pt.nst.keputusan]);
  ringkas.push(
    ["Aspek terkuat", pt.kuat || d.terkuat || "-"],
    ["Perlu perhatian", pt.perhatian || d.perhatian || "-"],
    ["Tindak lanjut", pt.tindak.map((t) => (t === "Evaluasi ulang" && pt.evalBln ? `Evaluasi ulang ${pt.evalBln} bulan` : t)).join(", ") || "-"]
  );
  const td = "border border-black/20 p-1";
  return (
    <div className="p-6 md:p-8 text-xs space-y-2 fc-print-area">
      <ReportKop title={PT.paket[pt.paket].judul} code={REPORT_META.psikotes.code} />
      <p className="font-bold">I. IDENTITAS DIRI</p>
      <table className="w-full border border-black/20">
        <tbody>
          <tr><td className={td}><b>Nama</b></td><td className={td}>{child.full_name}{child.nickname ? ` (${child.nickname})` : ""}</td><td className={td}><b>Tanggal Pemeriksaan</b></td><td className={td}>{fmtDateLong(date)}</td></tr>
          <tr><td className={td}><b>Jenis Kelamin</b></td><td className={td}>{child.gender === "L" ? "Laki-laki" : "Perempuan"}</td><td className={td}><b>Tujuan</b></td><td className={td}>{pt.tujuan || PT.paket[pt.paket].tujuan}</td></tr>
          <tr><td className={td}><b>Tanggal Lahir</b></td><td className={td}>{fmtDateLong(child.dob)}</td><td className={td}><b>Alat Tes</b></td><td className={td}>{ptAlat(pt)}</td></tr>
          <tr><td className={td}><b>Usia</b></td><td className={td}>{fmtAge(d.um)}</td><td className={td}><b>Pemeriksa</b></td><td className={td}>{author?.display_name || authorName || ""}</td></tr>
        </tbody>
      </table>
      {pt.ringkas !== false && (
        <div className="border-2 border-primary/40 rounded-lg p-3 my-3 break-inside-avoid">
          <p className="font-bold text-primary mb-1">Ringkasan hasil</p>
          {ringkas.map(([a, b]) => <p key={a}><span className="text-text-secondary">{a}:</span> <b>{b}</b></p>)}
        </div>
      )}
      <p className="font-bold">II. OBSERVASI SELAMA PEMERIKSAAN</p>
      <table className="w-full border border-black/20">
        <tbody>
          {PT.obs.map(([k, l, opts]) => (
            <tr key={k}><td className={`${td} w-1/4`}><b>{l}</b></td>{opts.map((o) => <td key={o} className={td}><Tick on={pt.obs[k] === o} label={o} /></td>)}</tr>
          ))}
          <tr><td className={td}><b>Kondisi saat tes</b></td><td className={td} colSpan={3}><Tick on={pt.obs.kondisi === "Prima"} label="Prima" /><Tick on={pt.obs.kondisi === "Kurang prima"} label={`Kurang prima${pt.obs.kondisiKet ? ": " + pt.obs.kondisiKet : ""}`} /></td></tr>
          {pt.obs.catatan && <tr><td className={td}><b>Catatan perilaku lain</b></td><td className={td} colSpan={3}>{pt.obs.catatan}</td></tr>}
          {pt.obs.valid && <tr><td className={td}><b>Validitas hasil</b></td><td className={td} colSpan={3}>{pt.obs.valid}{pt.obs.validKet ? " — " + pt.obs.validKet : ""}</td></tr>}
        </tbody>
      </table>

      {mods.includes("wisc") && (
        <>
          {H("PSIKOGRAM INTELEGENSI")}
          <table className="w-full border border-black/20">
            <thead><tr><th className={td}>No</th><th className={td}>Aspek Inteligensi (Subtes WISC)</th>{!hide && <th className={td}>Skor Skala</th>}{PT_LV.map((v) => <th key={v} className={td}>{v}</th>)}<th className={td}>Keterangan</th></tr></thead>
            <tbody>
              {PT.wisc.map(([g, k, nn, sub], i) => (
                <tr key={k}>
                  <td className={td}>{i + 1}</td>
                  <td className={td}>{(i === 0 || PT.wisc[i - 1][0] !== g) && <b className="block text-primary">{g === "V" ? "A. SKALA VERBAL" : "B. SKALA PERFORMANSI"}</b>}<b>{nn}</b><br /><i>Subtes: {sub}</i></td>
                  {!hide && <td className={`${td} text-center`}>{w.ss[k] ?? ""}</td>}
                  {PT_LV.map((v) => <td key={v} className={`${td} text-center`}>{ssLevel(w.ss[k]) === v ? "✓" : ""}</td>)}
                  <td className={td}>{w.ket[k] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-text-secondary">{PT_LV.map((v) => `${v} = ${PT_LVN[v]}`).join(" · ")} · Skor skala: ≥16 ST, 13–15 T, 8–12 S, 5–7 R, ≤4 SR</p>
          {H("HASIL IQ")}
          <table className="w-full border border-black/20">
            <thead><tr><th className={td}>Skala</th>{!hide && <><th className={td}>Jumlah Skor Skala</th><th className={td}>Skor IQ</th></>}<th className={td}>Klasifikasi</th></tr></thead>
            <tbody>
              {([["IQ Verbal", w.jv, w.iqV], ["IQ Performansi", w.jp, w.iqP], ["IQ Total", w.jt, w.iqT]] as const).map(([a, j, q]) => (
                <tr key={a}><td className={td}>{a}</td>{!hide && <><td className={`${td} text-center`}>{j ?? ""}</td><td className={`${td} text-center font-bold`}>{q ?? ""}</td></>}<td className={`${td} text-center`}>{iqKlas(q)}</td></tr>
              ))}
              {w.pot && <tr><td className={td}>Potensi kecerdasan maksimal jika perkembangan dioptimalkan</td>{!hide && <><td className={`${td} text-center`}>—</td><td className={`${td} text-center font-bold`}>IQ {w.pot}</td></>}<td className={`${td} text-center`}>{iqKlas(w.pot)}</td></tr>}
              <tr><td className={td}><b>Kecenderungan profil</b></td><td className={td} colSpan={hide ? 1 : 3}>{["Verbal > Performansi", "Performansi > Verbal", "Seimbang"].map((x) => <Tick key={x} on={d.profil === x} label={x} />)}</td></tr>
            </tbody>
          </table>
          <table className="w-full border border-black/20 text-[10px]">
            <tbody>
              <tr>{PT.iqTabel.map(([a]) => <th key={a} className={td}>{a}</th>)}</tr>
              <tr>{PT.iqTabel.map(([a, b]) => <td key={a} className={`${td} text-center`}>{b}</td>)}</tr>
            </tbody>
          </table>
        </>
      )}

      {mods.includes("cpm") && (
        <>
          {H("HASIL TES INTELIGENSI (SCREENING)")}
          <table className="w-full border border-black/20">
            <thead><tr><th className={td}>Alat Tes</th>{!hide && <th className={td}>Skor Mentah</th>}<th className={td}>Grade</th><th className={td}>Klasifikasi</th>{!hide && <th className={td}>Estimasi Taraf IQ</th>}</tr></thead>
            <tbody>
              <tr><td className={td}>Coloured Progressive Matrices (CPM – Raven)</td>{!hide && <td className={`${td} text-center`}>{pt.cpm.mentah}</td>}<td className={`${td} text-center`}>{pt.cpm.grade ? "Grade " + pt.cpm.grade : ""}</td><td className={`${td} text-center`}>{PT.cpmGrade[pt.cpm.grade ?? ""] ?? ""}</td>{!hide && <td className={`${td} text-center`}>{pt.cpm.estimasi}</td>}</tr>
              <tr><td className={td}><b>Keterangan</b></td><td className={td} colSpan={hide ? 3 : 4}>{pt.cpm.ket}</td></tr>
            </tbody>
          </table>
        </>
      )}

      {mods.includes("nst") && (
        <>
          {H("PSIKOGRAM KESIAPAN SEKOLAH (NST)")}
          <table className="w-full border border-black/20">
            <thead><tr><th className={td}>No</th><th className={td}>Aspek Kesiapan Sekolah</th>{PT_LV.map((v) => <th key={v} className={td}>{v}</th>)}<th className={td}>Keterangan</th></tr></thead>
            <tbody>
              {PT.nst.map(([k, l], i) => (
                <tr key={k}><td className={td}>{i + 1}</td><td className={td}><b>{l}</b></td>{PT_LV.map((v) => <td key={v} className={`${td} text-center`}>{pt.nst.lv[k] === v ? "✓" : ""}</td>)}<td className={td}>{pt.nst.ket[k] ?? ""}</td></tr>
              ))}
              <tr><td className={td} colSpan={2}><b>Kesiapan Sekolah</b></td><td className={td} colSpan={6}>{PT.kesiapan.map((v) => <Tick key={v} on={pt.nst.keputusan === v} label={v} />)}</td></tr>
            </tbody>
          </table>
        </>
      )}

      {mods.includes("dtvp") && (
        <>
          {H("PENILAIAN VISUAL-PERSEPTUAL & VISUAL-MOTORIK (DTVP / FROSTIG)")}
          <table className="w-full border border-black/20">
            <thead><tr><th className={td}>No</th><th className={td}>Aspek Pengukuran</th><th className={td}>Usia Mental</th><th className={td}>Keterangan</th></tr></thead>
            <tbody>
              {PT.dtvp.map(([k, l], i) => {
                const x = d.dtvp.find((z) => z.k === k)!;
                return <tr key={k}><td className={td}>{i + 1}</td><td className={td}><b>{l}</b></td><td className={`${td} text-center`}>{x.m != null ? fmtAge(x.m) : ""}</td><td className={td}>{pt.dtvp.ket[k] ?? ""}</td></tr>;
              })}
              <tr><td className={td} colSpan={2}><b>Usia kronologis</b></td><td className={`${td} text-center font-bold`}>{fmtAge(d.um)}</td><td className={td} /></tr>
            </tbody>
          </table>
        </>
      )}

      {mods.includes("se") && (
        <>
          {H("CATATAN KEMATANGAN SOSIAL-EMOSIONAL")}
          <table className="w-full border border-black/20">
            <thead><tr><th className={td}>No</th><th className={td}>Aspek</th><th className={td}>Status</th><th className={td}>Keterangan</th></tr></thead>
            <tbody>
              {PT.se.map(([k, l], i) => <tr key={k}><td className={td}>{i + 1}</td><td className={td}><b>{l}</b></td><td className={td}>{pt.se.st[k] ?? ""}</td><td className={td}>{pt.se.ket[k] ?? ""}</td></tr>)}
              {pt.se.catatan && <tr><td className={td} colSpan={2}><b>Catatan</b></td><td className={td} colSpan={2}>{pt.se.catatan}</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {H("KESIMPULAN")}
      {PT.kes[pt.paket].filter(([k]) => pt.kes[k]).map(([k, l], i) => (
        <div key={k} className="break-inside-avoid">
          <p><b>{i + 1}. {l}</b></p>
          <p className="whitespace-pre-wrap text-justify">{pt.kes[k]}</p>
        </div>
      ))}

      {pt.saran.length > 0 && (
        <>
          {H("SARAN")}
          <p>Berdasarkan hasil tes yang diperoleh {nm}, berikut saran terintegrasi untuk mengoptimalkan perkembangan dan mengasah potensinya:</p>
          <table className="w-full border border-black/20">
            <tbody>
              {pt.saran.map((s, i) => (
                <tr key={i}>
                  <td className={td}>
                    <b>{i + 1}. {s.judul}</b> <span className="ml-2"><Tick on={s.sekolah} label="Sekolah" /><Tick on={s.rumah} label="Rumah" /></span>
                    <p>{s.isi}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <table className="w-full border border-black/20 mt-2">
        <tbody>
          <tr>
            <td className={td}>
              <b>Tindak lanjut</b>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {PT.tindak.map((t) => <Tick key={t} on={pt.tindak.includes(t)} label={t === "Evaluasi ulang" ? `Evaluasi ulang ${pt.evalBln || "…"} bulan` : t} />)}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <SignatureBlock date={date} authorId={String(row.author_id)} authorName={authorName} author={author} pj={pj} />
    </div>
  );
}

// ======================= kecil =======================
function LvTag({ lv }: { lv: PtLevel | "" }) {
  if (!lv) return <span className="text-text-secondary">—</span>;
  const cls = lv === "ST" || lv === "T" ? "bg-green-100 text-green-700" : lv === "S" ? "bg-primary/10 text-primary" : "bg-red/10 text-red";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cls}`}>{lv}</span>;
}
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
function Radio({ options, value, onChange }: { options: (readonly [string, string] | string[])[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            value === v ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
function Chips({ options, value, onToggle }: { options: (readonly [string, string] | string[])[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onToggle(v)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            value.includes(v) ? "bg-primary/10 border-primary text-primary" : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
          }`}
        >
          {value.includes(v) ? "✓ " : ""}{l}
        </button>
      ))}
    </div>
  );
}
