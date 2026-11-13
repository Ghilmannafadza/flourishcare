// Laporan Psikotes modular — port dari prototipe PM (konstanta PT, NB_*).
// Kerangka bersama + modul alat tes (WISC, CPM, NST, Frostig/DTVP, Sosial-emosional).
// Konversi norma (skor mentah → skor skala/IQ) SENGAJA tidak diotomatisasi (tabel norma berlisensi).

import { ageMonths } from "@/lib/dates";

export type PtLevel = "ST" | "T" | "S" | "R" | "SR";
export const PT_LV: PtLevel[] = ["ST", "T", "S", "R", "SR"];
export const PT_LVN: Record<PtLevel, string> = { ST: "Sangat Tinggi", T: "Tinggi", S: "Sedang", R: "Rendah", SR: "Sangat Rendah" };

export type PtPackage = "iq" | "kesiapan" | "custom";
export type PtModule = "wisc" | "cpm" | "nst" | "dtvp" | "se";

export const PT = {
  paket: {
    iq: { nama: "Tes IQ (WISC)", judul: "LAPORAN HASIL TES INTELEGENSI", tujuan: "Tes Kecerdasan", modul: ["wisc"] as PtModule[] },
    kesiapan: {
      nama: "Kesiapan Sekolah (CPM + NST + Frostig + Sosial-emosional)",
      judul: "LAPORAN HASIL TES KESIAPAN SEKOLAH",
      tujuan: "Tes Kesiapan Sekolah",
      modul: ["cpm", "nst", "dtvp", "se"] as PtModule[],
    },
    custom: { nama: "Pilih modul sendiri", judul: "LAPORAN HASIL PEMERIKSAAN PSIKOLOGIS", tujuan: "", modul: [] as PtModule[] },
  } as Record<PtPackage, { nama: string; judul: string; tujuan: string; modul: PtModule[] }>,
  urutan: ["wisc", "cpm", "nst", "dtvp", "se"] as PtModule[],
  modul: {
    wisc: { nama: "WISC", alat: "WISC" },
    cpm: { nama: "CPM (screening)", alat: "CPM" },
    nst: { nama: "NST", alat: "NST" },
    dtvp: { nama: "Frostig / DTVP", alat: "Frostig" },
    se: { nama: "Sosial-emosional", alat: "" },
  } as Record<PtModule, { nama: string; alat: string }>,
  // [grup, key, nama aspek, subtes, frasa awal narasi]
  wisc: [
    ["V", "info", "Pengetahuan Umum", "Information", "Pengetahuan umum"],
    ["V", "sim", "Berpikir Abstrak", "Similarities", "Kemampuan berpikir abstrak"],
    ["V", "ari", "Penalaran & Pemahaman Angka", "Arithmetic", "Kemampuan penalaran numerik"],
    ["V", "voc", "Perbendaharaan Kata", "Vocabulary", "Penguasaan kosakata"],
    ["V", "com", "Pengetahuan Praktis", "Comprehension", "Pemahaman terhadap situasi dan aturan sosial"],
    ["V", "ds", "Daya Konsentrasi & Memori Jangka Pendek", "Digit Span", "Daya konsentrasi dan memori jangka pendek"],
    ["P", "pc", "Membedakan Hal Esensial", "Picture Completion", "Kemampuan mengenali detail penting pada objek dan situasi"],
    ["P", "pa", "Antisipasi terhadap Lingkungan", "Picture Arrangement", "Kemampuan mengantisipasi dan memahami urutan sebab-akibat"],
    ["P", "bd", "Kemampuan Konstruktif", "Block Design", "Kemampuan konstruksi dan analisis bayang ruang"],
    ["P", "oa", "Analisis-Sintesis Visual", "Object Assembly", "Kemampuan menganalisis dan menyusun bagian menjadi keseluruhan"],
    ["P", "cd", "Kecepatan & Ketelitian", "Coding", "Kecepatan dan ketelitian kerja"],
  ] as [string, string, string, string, string][],
  iqTabel: [
    ["≥ 130", "Very Superior"],
    ["120 – 129", "Superior"],
    ["110 – 119", "Rata-rata Atas"],
    ["90 – 109", "Rata-rata"],
    ["80 – 89", "Rata-rata Bawah"],
    ["70 – 79", "Borderline"],
    ["≤ 69", "Disabilitas Intelektual"],
  ],
  profilBatas: 10,
  cpmGrade: { I: "Superior", II: "Di atas rata-rata", III: "Rata-rata", IV: "Di bawah rata-rata", V: "Jauh di bawah rata-rata" } as Record<string, string>,
  nst: [
    ["bentuk", "Pengamatan Bentuk & Kemampuan Membedakan", "kemampuan mengamati dan membedakan bentuk"],
    ["mh", "Motorik Halus", "kematangan motorik halus"],
    ["jumlah", "Pengertian tentang Besar, Jumlah & Perbandingan", "pemahaman konsep besar-kecil, banyak-sedikit, dan perbandingan"],
    ["tajam", "Pengamatan Tajam", "kemampuan menangkap detail dan bagian yang hilang dari gambar"],
    ["kritis", "Pengamatan Kritis", "kemampuan menemukan persamaan dan perbedaan secara teliti"],
    ["kons", "Konsentrasi", "kemampuan memusatkan perhatian"],
    ["ingat", "Daya Ingat", "kemampuan mengingat kembali informasi yang baru diterima"],
    ["objek", "Pengertian tentang Objek & Penilaian terhadap Situasi", "pemahaman fungsi benda dan penilaian situasi sehari-hari"],
    ["cerita", "Memahami Cerita", "kemampuan menangkap isi dan urutan cerita"],
    ["orang", "Menggambar Orang", "kemampuan menggambar orang dan konsep skema tubuh"],
  ] as [string, string, string][],
  kesiapan: ["Belum Siap", "Ragu-ragu", "Siap untuk Sekolah"],
  dtvp: [
    ["kmt", "Koordinasi Mata-Tangan", "Koordinasi penglihatan dengan gerakan tangan"],
    ["gl", "Membedakan Gambar & Latar", "Kemampuan memusatkan perhatian visual pada objek yang relevan"],
    ["kb", "Pengenalan Ketetapan Bentuk", "Kemampuan mengenali kesamaan bentuk walaupun ukuran, posisi, atau warna berbeda"],
    ["pr", "Persepsi Posisi dalam Ruang", "Pengenalan arah dan orientasi objek"],
    ["hs", "Hubungan Spasial (Gerak & Ruang)", "Pemahaman hubungan antarbagian dan kemampuan mencontoh pola"],
  ] as [string, string, string][],
  se: [
    ["pd", "Kepercayaan Diri"],
    ["mandiri", "Kemandirian"],
    ["inisiatif", "Inisiatif Aktivitas"],
    ["interaksi", "Interaksi & Komunikasi"],
  ] as [string, string][],
  seStatus: ["Matang", "Cukup matang", "Belum matang, perlu dikembangkan"],
  obs: [
    ["rapport", "Rapport & kooperasi", ["Mudah", "Cukup", "Sulit / perlu bujukan"]],
    ["atensi", "Atensi & fokus", ["Fokus baik", "Kadang teralihkan", "Sering teralihkan"]],
    ["motivasi", "Motivasi & ketekunan", ["Tinggi", "Sedang", "Mudah menyerah"]],
    ["bahasa", "Bahasa & komunikasi", ["Lancar & jelas", "Cukup", "Terbatas / kurang jelas"]],
    ["emosi", "Kondisi emosi", ["Tenang", "Cemas / tegang", "Gelisah / impulsif"]],
    ["gaya", "Gaya mengerjakan", ["Cepat & teliti", "Cepat, kurang teliti", "Lambat / ragu-ragu"]],
  ] as [string, string, string[]][],
  tindak: [
    "Konseling psikologis",
    "Terapi Okupasi",
    "Terapi Wicara",
    "Terapi Perilaku",
    "Asesmen lanjutan",
    "Konsultasi dokter spesialis",
    "Evaluasi ulang",
    "Tidak diperlukan tindak lanjut khusus",
  ],
  kes: {
    iq: [
      ["kapasitas", "Kapasitas Intelektual Umum"],
      ["profil", "Profil Kemampuan Verbal dan Performansi"],
      ["kekuatan", "Kekuatan yang Mendukung Proses Belajar"],
      ["area", "Area yang Perlu Dikembangkan"],
      ["akhir", "Kesimpulan"],
    ],
    kesiapan: [
      ["kapasitas", "Kapasitas Intelektual Umum"],
      ["fungsi", "Kematangan Fungsi Kesiapan Sekolah"],
      ["visual", "Kemampuan Visual-Perseptual dan Visual-Motorik"],
      ["sosial", "Kematangan Sosial-Emosional"],
      ["akhir", "Kesimpulan"],
    ],
    custom: [
      ["hasil", "Gambaran Hasil Pemeriksaan"],
      ["akhir", "Kesimpulan"],
    ],
  } as Record<PtPackage, [string, string][]>,
  saran: {
    vp: ["Verbal > Performansi (kekuatan verbal)", "Optimalkan diskusi, penjelasan lisan, dan bahan bacaan; beri waktu lebih serta contoh langkah pada tugas visual-praktik."],
    pv: ["Performansi > Verbal (kekuatan visual-praktik)", "Gunakan media visual, demonstrasi, dan praktik langsung; perkaya kosakata melalui percakapan dan membaca bersama."],
    voc: ["Kosakata / pemahaman verbal rendah", "Perbanyak membaca bersama, bercerita, dan berdiskusi; kenalkan kosakata baru dalam konteks bermakna dan minta anak menjelaskan kembali dengan kalimatnya sendiri."],
    info: ["Pengetahuan umum perlu diperluas", "Ajak anak mengamati lingkungan, berkunjung ke tempat baru, dan mengaitkan materi sekolah dengan pengalaman sehari-hari."],
    ds: ["Konsentrasi & memori kerja", "Berikan instruksi singkat bertahap, bagi tugas menjadi langkah kecil, dan latih permainan mengingat (urutan angka, kartu memori)."],
    pa: ["Pemahaman urutan & sebab-akibat", "Latih menyusun cerita bergambar, menjelaskan tahapan aktivitas, dan mendiskusikan alasan serta konsekuensi suatu peristiwa."],
    pd: ["Kepercayaan diri", "Apresiasi keberanian mencoba dan usaha anak, bukan hanya ketepatan jawaban; beri waktu tunggu yang cukup sebelum membantu."],
    mandiri: ["Kemandirian", "Berikan tanggung jawab kecil yang rutin dan sesuai usia; kurangi bantuan secara bertahap."],
    inisiatif: ["Inisiatif aktivitas", "Beri pilihan terbatas dalam kegiatan sehari-hari agar anak terlatih memutuskan dan memulai sendiri; puji setiap inisiatif."],
    interaksi: ["Interaksi & komunikasi", "Latih anak menyampaikan keinginan dan keberatan melalui permainan peran; fasilitasi bermain dalam kelompok kecil."],
    mh: ["Motorik halus & orientasi arah", "Perbanyak aktivitas jari dan tangan (meronce, menggunting, menjepit, playdough), latihan pra-menulis, dan permainan konsep arah."],
    kuat: ["Pengembangan kekuatan", "Berikan kegiatan yang menantang sesuai kekuatan anak sebagai jembatan untuk membangun rasa percaya diri."],
    minat: ["Pengembangan minat & bakat", "Fasilitasi kegiatan sesuai ketertarikan anak (mis. menari, menggambar, eksperimen sederhana) sebagai wadah penyaluran potensi."],
  } as Record<string, [string, string]>,
};

export const NB_DTVP = ["di atas usia kronologis", "sesuai usia kronologis", "di bawah usia kronologis"];
export const NB_SARAN_KOND: Record<string, string> = {
  vp: "IQ Verbal ≥ 10 poin di atas IQ Performansi",
  pv: "IQ Performansi ≥ 10 poin di atas IQ Verbal",
  voc: "Skor skala Perbendaharaan Kata ≤ 7",
  info: "Skor skala Pengetahuan Umum ≤ 7",
  ds: "Skor skala Digit Span ≤ 7",
  pa: "Skor skala Picture Arrangement ≤ 7",
  pd: 'Kepercayaan Diri "belum matang", atau observasi mudah menyerah / cemas',
  mandiri: 'Kemandirian "belum matang"',
  inisiatif: 'Inisiatif Aktivitas "belum matang"',
  interaksi: 'Interaksi & Komunikasi "belum matang"',
  mh: "NST Motorik Halus R/SR, atau koordinasi mata-tangan di bawah usia",
  kuat: "Selalu ditawarkan",
  minat: "Selalu ditawarkan",
};
export const NB_KES_DEF: Record<PtPackage, Record<string, string>> = {
  iq: {
    kapasitas: "Berdasarkan hasil pemeriksaan menggunakan Wechsler Intelligence Scale for Children (WISC), {nama} memperoleh IQ total sebesar {iqT} yang berada pada kategori {klasT}.",
    profil: "Pada aspek verbal, {nama} memperoleh IQ verbal sebesar {iqV} ({klasV}), sedangkan pada aspek performansi memperoleh IQ sebesar {iqP} ({klasP}). Kecenderungan profil: {profil}.",
    kekuatan: "Kekuatan {nama} terutama terlihat pada {terkuat}.",
    area: "Area pengembangan utama {nama} mencakup {perhatian}.",
    akhir: "",
  },
  kesiapan: {
    kapasitas: "Berdasarkan hasil pemeriksaan menggunakan Coloured Progressive Matrices (CPM), {nama} memperoleh skor {cpmSkor} yang berada pada Grade {grade} dengan klasifikasi {klasCPM} (estimasi taraf kecerdasan {estimasi}).",
    fungsi: "Hasil Nijmeegse Schoolbekwaamheids Test (NST) menunjukkan bahwa {nama} berada pada zona {kesiapan}. Aspek yang paling menonjol adalah {terkuat}.",
    visual: "Pada pemeriksaan visual-perseptual dan visual-motorik (Frostig), {frostig}.",
    sosial: "",
    akhir: "",
  },
  custom: { hasil: "", akhir: "" },
};
export const NB_VARS: Record<PtPackage, string> = {
  iq: "{nama} {iqT} {klasT} {iqV} {klasV} {iqP} {klasP} {profil} {terkuat} {perhatian}",
  kesiapan: "{nama} {cpmSkor} {grade} {klasCPM} {estimasi} {kesiapan} {terkuat} {perhatian} {frostig}",
  custom: "{nama} {terkuat} {perhatian}",
};
const PT_FR: Record<PtLevel, string> = {
  ST: "berada pada taraf sangat tinggi, jauh melampaui anak seusianya.",
  T: "berada pada taraf tinggi, di atas rata-rata anak seusianya.",
  S: "berada pada taraf rata-rata, sesuai dengan anak seusianya.",
  R: "masih berada di bawah rata-rata anak seusianya dan perlu distimulasi.",
  SR: "masih sangat terbatas dibandingkan anak seusianya dan memerlukan perhatian khusus.",
};

// ---------- Tipe data payload ----------
export type PtSaran = { key: string; judul: string; isi: string; sekolah: boolean; rumah: boolean };
export type PtPayload = {
  paket: PtPackage;
  modul: PtModule[];
  tujuan: string;
  obs: Record<string, string>;
  wisc: { ss: Record<string, string>; ket: Record<string, string>; jv?: string; jp?: string; jt?: string; iqV?: string; iqP?: string; iqT?: string; pot?: string };
  cpm: { mentah?: string; grade?: string; estimasi?: string; ket?: string };
  nst: { lv: Record<string, PtLevel>; ket: Record<string, string>; keputusan?: string };
  dtvp: { th: Record<string, string>; bl: Record<string, string>; ket: Record<string, string> };
  se: { st: Record<string, string>; ket: Record<string, string>; catatan?: string };
  kes: Record<string, string>;
  saran: PtSaran[];
  tindak: string[];
  evalBln: string;
  kuat: string;
  perhatian: string;
  ringkas: boolean;
  sembunyi: boolean;
};

/** Bank narasi (clinic_settings.narasi) — override kalimat bawaan. */
export type NarrativeBank = {
  wisc?: Record<string, Record<string, string>>;
  nst?: Record<string, Record<string, string>>;
  dtvp?: Record<string, Record<string, string>>;
  se?: Record<string, Record<string, string>>;
  cpm?: Record<string, Record<string, string>>;
  saran?: Record<string, { judul?: string; isi?: string }>;
  saranCustom?: Array<{ key: string; judul: string; isi: string }>;
  kes?: Record<string, Record<string, string>>;
};

export function ptInit(dob?: string | null): PtPayload {
  const um = ageMonths(dob ?? null);
  return {
    paket: um != null && um < 84 ? "kesiapan" : "iq",
    modul: [],
    tujuan: "",
    obs: { kondisi: "Prima" },
    wisc: { ss: {}, ket: {} },
    cpm: {},
    nst: { lv: {}, ket: {} },
    dtvp: { th: {}, bl: {}, ket: {} },
    se: { st: {}, ket: {} },
    kes: {},
    saran: [],
    tindak: [],
    evalBln: "",
    kuat: "",
    perhatian: "",
    ringkas: true,
    sembunyi: false,
  };
}

export function ptMods(pt: PtPayload): PtModule[] {
  return pt.paket === "custom" ? PT.urutan.filter((k) => (pt.modul || []).includes(k)) : PT.paket[pt.paket].modul;
}
export function ptAlat(pt: PtPayload): string {
  if (pt.paket === "kesiapan") return "CPM, Frostig, NST";
  return ptMods(pt).map((k) => PT.modul[k].alat).filter(Boolean).join(", ");
}

export function ssLevel(v: string | number | null | undefined): PtLevel | "" {
  if (v === "" || v == null) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n >= 16 ? "ST" : n >= 13 ? "T" : n >= 8 ? "S" : n >= 5 ? "R" : "SR";
}
export function iqKlas(v: string | number | null | undefined): string {
  const n = Number(v);
  if (!n) return "";
  return n >= 130 ? "Very Superior" : n >= 120 ? "Superior" : n >= 110 ? "Rata-rata Atas" : n >= 90 ? "Rata-rata" : n >= 80 ? "Rata-rata Bawah" : n >= 70 ? "Borderline" : "Disabilitas Intelektual";
}

export function ptDerive(pt: PtPayload, dob: string | null | undefined, testDate: string | null | undefined) {
  const mods = ptMods(pt);
  const ss = pt.wisc?.ss ?? {};
  const um = ageMonths(dob ?? null, testDate ?? null);
  const items: { n: string; v: number }[] = [];
  if (mods.includes("wisc")) PT.wisc.forEach(([, k, n]) => { if (ss[k] !== "" && ss[k] != null) items.push({ n, v: Number(ss[k]) }); });
  const rank = (v: string) => ({ ST: 5, T: 4, S: 3, R: 2, SR: 1 } as Record<string, number>)[v] || 0;
  if (mods.includes("nst")) PT.nst.forEach(([k, n]) => { const lv = pt.nst?.lv?.[k]; if (lv) items.push({ n, v: rank(lv) * 4 }); });
  let terkuat = "";
  let perhatian = "";
  if (items.length) {
    const mx = Math.max(...items.map((x) => x.v));
    const mn = Math.min(...items.map((x) => x.v));
    terkuat = items.filter((x) => x.v === mx).map((x) => x.n).join(", ");
    perhatian = mx === mn ? "" : items.filter((x) => x.v === mn).map((x) => x.n).join(", ");
  }
  const iqV = Number(pt.wisc?.iqV) || 0;
  const iqP = Number(pt.wisc?.iqP) || 0;
  const profil = iqV && iqP ? (iqV - iqP >= PT.profilBatas ? "Verbal > Performansi" : iqP - iqV >= PT.profilBatas ? "Performansi > Verbal" : "Seimbang") : "";
  const dtvp = PT.dtvp.map(([k, n]) => {
    const th = pt.dtvp?.th?.[k];
    const bl = pt.dtvp?.bl?.[k];
    if (th === "" || th == null) return { k, n, m: null as number | null, banding: "" };
    const m = Number(th) * 12 + (Number(bl) || 0);
    const d = um == null ? null : m - um;
    return { k, n, m, banding: d == null ? "" : d >= 3 ? "di atas usia kronologis" : d <= -3 ? "di bawah usia kronologis" : "sesuai usia kronologis" };
  });
  return { um, terkuat, perhatian, profil, dtvp };
}

export function nbDefault(kind: string, key: string, val: string): string {
  if (kind === "wisc") {
    const it = PT.wisc.find((x) => x[1] === key);
    return it && PT_FR[val as PtLevel] ? `${it[4]} {nama} ${PT_FR[val as PtLevel]}` : "";
  }
  if (kind === "nst") {
    const it = PT.nst.find((x) => x[0] === key);
    const f = ({
      ST: "sangat matang, jauh di atas anak seusianya",
      T: "berkembang baik, di atas kematangan rata-rata anak seusianya",
      S: "sudah matang, sesuai dengan anak seusianya",
      R: "belum sepenuhnya matang dan perlu distimulasi sebelum masuk sekolah",
      SR: "belum matang dan memerlukan stimulasi intensif",
    } as Record<string, string>)[val];
    return it && f ? `${it[2][0].toUpperCase() + it[2].slice(1)} {nama} ${f}.` : "";
  }
  if (kind === "dtvp") {
    const it = PT.dtvp.find((x) => x[0] === key);
    return it ? `${it[2]} {nama} ${val}.` : "";
  }
  if (kind === "se") {
    const it = PT.se.find((x) => x[0] === key);
    if (!it) return "";
    return /Belum/.test(val)
      ? `${it[1]} {nama} belum matang dan masih perlu dikembangkan melalui pendampingan orang tua dan guru.`
      : val === "Cukup matang"
        ? `${it[1]} {nama} cukup matang, namun masih perlu penguatan dalam situasi baru.`
        : `${it[1]} {nama} sudah matang sesuai tahap usianya.`;
  }
  if (kind === "cpm") {
    return `Kemampuan penalaran nonverbal {nama}, yaitu mengamati pola, menemukan keteraturan, dan menarik kesimpulan dari informasi visual, berada pada taraf ${String(PT.cpmGrade[val] || "").toLowerCase()} dibandingkan anak seusianya.`;
  }
  return "";
}

export function nbGet(bank: NarrativeBank, kind: string, key: string, val: string): string {
  const o = ((bank as Record<string, Record<string, Record<string, string>>>)[kind]?.[key] ?? {})[val];
  return o ? o : nbDefault(kind, key, val);
}
export function nbSaran(bank: NarrativeBank, k: string): [string, string] {
  const cust = (bank.saranCustom || []).find((x) => x.key === k);
  if (cust) return [cust.judul, cust.isi];
  const o = bank.saran?.[k] ?? {};
  const def = PT.saran[k] ?? ["", ""];
  return [o.judul || def[0], o.isi || def[1]];
}
export function nbKes(bank: NarrativeBank, paket: PtPackage, key: string): string {
  const o = bank.kes?.[paket]?.[key];
  return o != null ? o : NB_KES_DEF[paket]?.[key] ?? "";
}
export function nbFill(tpl: string, vars: Record<string, string | number | undefined | null>): string {
  let miss = false;
  const out = String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => {
    const v = vars[k];
    if (v == null || v === "") {
      miss = true;
      return m;
    }
    return String(v);
  });
  return miss || !out.trim() ? "" : out;
}

export function ptNama(full: string, nick?: string | null) {
  return "Ananda " + (nick || String(full || "").split(" ")[0] || "");
}

/** Narasi keterangan otomatis per skor (mengisi kolom keterangan bila masih kosong). */
export function ptNarasi(bank: NarrativeBank, kind: string, key: string, val: string, nama: string): string {
  let v = val;
  if (kind === "wisc") v = ssLevel(val);
  if (!v) return "";
  return nbGet(bank, kind, key, v).replace(/\{nama\}/g, nama);
}

/** Draf kesimpulan dari skor (bagian yang masih kosong). */
export function ptDraftKes(bank: NarrativeBank, pt: PtPayload, nama: string, dob: string | null | undefined, date: string | null | undefined) {
  const d = ptDerive(pt, dob, date);
  const w = pt.wisc || { ss: {}, ket: {} };
  const lc = (x: unknown) => String(x || "").toLowerCase();
  const dv = d.dtvp.filter((x) => x.m != null);
  const vars = {
    nama,
    iqT: w.iqT,
    klasT: lc(iqKlas(w.iqT)),
    iqV: w.iqV,
    klasV: lc(iqKlas(w.iqV)),
    iqP: w.iqP,
    klasP: lc(iqKlas(w.iqP)),
    profil: lc(d.profil),
    terkuat: lc(pt.kuat || d.terkuat),
    perhatian: lc(pt.perhatian || d.perhatian),
    cpmSkor: pt.cpm?.mentah,
    grade: pt.cpm?.grade,
    klasCPM: lc(PT.cpmGrade[pt.cpm?.grade ?? ""]),
    estimasi: pt.cpm?.estimasi,
    kesiapan: lc(pt.nst?.keputusan),
    frostig: dv.length ? dv.map((x) => lc(x.n) + " " + x.banding).join("; ") : "",
  };
  const o: Record<string, string> = {};
  PT.kes[pt.paket].forEach(([k]) => {
    const t = nbFill(nbKes(bank, pt.paket, k), vars);
    if (t) o[k] = t;
  });
  return o;
}

/** Saran yang disarankan dari hasil (chip). */
export function ptSuggestSaran(bank: NarrativeBank, pt: PtPayload, dob: string | null | undefined, date: string | null | undefined): string[] {
  const mods = ptMods(pt);
  const d = ptDerive(pt, dob, date);
  const ss = pt.wisc?.ss ?? {};
  const out: string[] = [];
  const low = (k: string) => ss[k] !== "" && ss[k] != null && Number(ss[k]) <= 7;
  if (mods.includes("wisc")) {
    if (d.profil === "Verbal > Performansi") out.push("vp");
    if (d.profil === "Performansi > Verbal") out.push("pv");
    (["voc", "info", "ds", "pa"] as const).forEach((k) => low(k) && out.push(k));
  }
  if (mods.includes("se")) PT.se.forEach(([k]) => { if (/Belum/.test(pt.se?.st?.[k] || "")) out.push(k); });
  if ((pt.obs?.motivasi === "Mudah menyerah" || pt.obs?.emosi === "Cemas / tegang") && !out.includes("pd")) out.push("pd");
  if ((mods.includes("nst") && ["R", "SR"].includes(pt.nst?.lv?.mh ?? "")) || (mods.includes("dtvp") && /di bawah/.test(d.dtvp.find((x) => x.k === "kmt")?.banding || ""))) out.push("mh");
  out.push("kuat", "minat", ...(bank.saranCustom || []).map((c) => c.key));
  return [...new Set(out)].filter((k) => !(pt.saran || []).some((s) => s.key === k));
}
