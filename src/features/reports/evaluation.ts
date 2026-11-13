import { EVT, type EvalService } from "./evalTemplates";
import type { AnyReport } from "./reportKinds";

// Logika Laporan Evaluasi Perkembangan — port dari prototipe (EVX, evStatus, evRingkas, evInit).

export const EVX = {
  kode: "MDxFlourishCare-EVL",
  kondisi: ["Perkembangan tipikal", "Down syndrome", "Autism spectrum disorder", "ADHD", "Speech delay / gangguan bahasa", "Keterlambatan perkembangan global"],
  domain: ["Bahasa reseptif", "Bahasa ekspresif", "Motorik kasar", "Motorik halus", "Kemandirian (ADL)", "Sosial-emosi", "Kognitif / pra-akademik"],
  setting: ["Ruang terapi", "Rumah", "Sekolah"],
  pm: [
    "Tantrum / menangis berkepanjangan",
    "Agresi (memukul, menggigit, mencakar)",
    "Melukai diri",
    "Kabur / meninggalkan area",
    "Merusak / melempar barang",
    "Stereotipi / perilaku berulang yang mengganggu belajar",
    "Berteriak / vokalisasi mengganggu",
  ],
  fungsi: ["atensi", "melarikan diri/menghindar", "akses benda", "sensori"],
  keputusan: [
    "Lanjutkan program dengan target yang sama",
    "Revisi target (naikkan level / turunkan level / ganti strategi)",
    "Ubah frekuensi terapi",
    "Lulus program terapi ini (memenuhi kriteria di bawah)",
    "Rujuk / konsultasi lanjutan",
  ],
  frek: ["ditingkatkan", "diturunkan (step-down)", "pemantauan berkala"],
  skala: [
    ["0", "Belum muncul", "Keterampilan belum muncul meskipun diberi bantuan penuh."],
    ["1", "Bantuan penuh", "Muncul hanya dengan bantuan fisik/model penuh."],
    ["2", "Bantuan sebagian", "Muncul dengan isyarat/bantuan sebagian (verbal, gestur, visual)."],
    ["3", "Mandiri, belum konsisten", "Muncul mandiri tetapi <80% kesempatan atau hanya di satu setting/orang."],
    ["4", "Mandiri, konsisten (tercapai)", "Muncul mandiri ≥80% kesempatan pada ≥3 sesi berturut-turut dan di ≥2 setting/orang."],
    ["NA", "Tidak relevan", "Belum sesuai tahap perkembangan atau tidak dapat dinilai."],
  ] as [string, string, string][],
  legend:
    "Skor: 0 = belum muncul • 1 = bantuan penuh • 2 = bantuan sebagian • 3 = mandiri, belum konsisten • 4 = mandiri, konsisten, tergeneralisasi (tercapai) • N/A = belum relevan. Status: L = Lulus • P = Proses • B = Belum muncul. Acuan usia = usia perkembangan, bukan usia kronologis.",
  pmCatat:
    "Cara mencatat: tulis frekuensi per sesi/hari, durasi, dan intensitas (ringan/sedang/berat) pada kolom baseline dan evaluasi. Pastikan tiap perilaku memiliki perilaku pengganti fungsional.",
};

export const SERVICE_NAME: Record<string, string> = {
  BT: "Behavioral Therapy",
  SI: "Sensori Integrasi",
  OT: "Okupasi Terapi",
  TW: "Terapi Wicara",
  PSI: "Psikolog",
};

export type EvPm = { nama: string; on: boolean; def: string; fungsi: string[]; base: string; nilai: string; target: string };
export type EvPayload = {
  frek: string;
  setting: string[];
  sekolah: string;
  kondisi: string[];
  kondisiLain: string;
  riwayat: string;
  penunjang: string;
  profil: Record<string, { usia?: string; dasar?: string; cat?: string }>;
  skor: Record<string, string>;
  awal: Record<string, string>;
  cat: Record<string, string>;
  aspekCat: Record<string, string>;
  pm: EvPm[];
  kekuatan: string;
  hambatan: string;
  keputusan: string[];
  frekUbah: string[];
  rujuk: string;
};

export function emptyEv(): EvPayload {
  return {
    frek: "", setting: [], sekolah: "", kondisi: [], kondisiLain: "", riwayat: "", penunjang: "",
    profil: {}, skor: {}, awal: {}, cat: {}, aspekCat: {}, pm: [], kekuatan: "", hambatan: "",
    keputusan: [], frekUbah: [], rujuk: "",
  };
}

export const evSkorTxt = (v: unknown) => (v === "NA" ? "N/A" : v == null ? "" : String(v));
export function evStatus(v: unknown): "L" | "P" | "B" | "" {
  const s = String(v ?? "");
  return s === "4" ? "L" : ["1", "2", "3"].includes(s) ? "P" : s === "0" ? "B" : "";
}
export function evAllInd(service: EvalService) {
  return (EVT[service]?.aspek ?? []).flatMap((a) => a.ind.map((i) => ({ k: a.k, kode: i[0], ind: i[1], usia: i[2], target: i[3] })));
}

export function evRingkas(service: EvalService, ev: Pick<EvPayload, "skor" | "aspekCat">) {
  const sk = ev.skor || {};
  const rows = (EVT[service]?.aspek ?? []).map((a) => {
    let n = 0, L = 0, P = 0, B = 0;
    a.ind.forEach((i) => {
      const s = evStatus(sk[i[0]]);
      if (!s) return;
      n++;
      if (s === "L") L++;
      else if (s === "P") P++;
      else B++;
    });
    return { k: a.k, nama: a.nama, total: a.ind.length, n, L, P, B, pct: n ? Math.round((L / n) * 100) : null, cat: ev.aspekCat?.[a.k] || "" };
  });
  const t = rows.reduce((o, x) => ({ total: o.total + x.total, n: o.n + x.n, L: o.L + x.L, P: o.P + x.P, B: o.B + x.B }), { total: 0, n: 0, L: 0, P: 0, B: 0 });
  return { rows, t: { ...t, pct: t.n ? Math.round((t.L / t.n) * 100) : null } };
}

export function isTercapai(x: { pct: number | null; n: number; total: number }) {
  return x.pct != null && x.pct >= 80 && (x.n >= 3 || x.n === x.total);
}

/** Evaluasi berikutnya: identitas, profil, perilaku menantang & skor awal diambil dari evaluasi sebelumnya. */
export function evInit(prev: AnyReport[]): { period: number; ev: EvPayload } {
  const sorted = [...prev].sort((a, b) => Number(a.period ?? 0) - Number(b.period ?? 0));
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  const ev = emptyEv();
  if (last) {
    const L = (last.payload ?? {}) as Partial<EvPayload>;
    Object.assign(ev, {
      frek: L.frek || "",
      setting: [...(L.setting || [])],
      sekolah: L.sekolah || "",
      kondisi: [...(L.kondisi || [])],
      kondisiLain: L.kondisiLain || "",
      riwayat: L.riwayat || "",
      penunjang: L.penunjang || "",
      profil: JSON.parse(JSON.stringify(L.profil || {})),
      pm: (L.pm || []).map((p) => ({ ...p, nilai: "" })),
    });
  }
  ev.awal = { ...(((first?.payload ?? {}) as Partial<EvPayload>).awal || {}) };
  return { period: last ? Number(last.period || sorted.length) + 1 : 1, ev };
}

export function evAvg(skor: Record<string, string>, aspect: { ind: [string, string, string, string][] }) {
  const v = aspect.ind.map((i) => String(skor?.[i[0]] ?? "")).filter((x) => /^[0-4]$/.test(x)).map(Number);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
export function evPct(skor: Record<string, string>, service: EvalService) {
  let n = 0, L = 0;
  evAllInd(service).forEach((x) => {
    const st = evStatus(skor?.[x.kode]);
    if (!st) return;
    n++;
    if (st === "L") L++;
  });
  return n ? { pct: Math.round((L / n) * 100), n, L } : null;
}
export const fmt1 = (v: number | null) => (v == null ? "—" : (Math.round(v * 10) / 10).toString().replace(".", ","));
