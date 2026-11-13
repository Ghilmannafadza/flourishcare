import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmtDateLong } from "@/lib/dates";
import { SETTING_DEFAULTS, loadSetting, type PjSetting } from "@/lib/settings";

// Kop + blok "Jakarta, tanggal — Mengetahui" + catatan kerahasiaan,
// dipakai semua dokumen laporan (format MDxFlourishCare).

export const KOP = {
  kop1: "Mitra Diani",
  kop1b: "in partnership with",
  kop2: "FlourishCare Development Center",
  alamat: "Jl. PKP Raya No.1 Kelapa Dua Wetan, Ciracas, Jakarta Timur",
  kontak: "Kontak: +62 811 1099 060 | Mitradiani0303@gmail.com",
  footer: "Dokumen ini bersifat rahasia dan hanya digunakan untuk mendukung perkembangan anak.",
};

export type SignatureData = {
  profile_id?: string;
  display_name: string | null;
  title: string | null;
  license: string | null;
  image_data: string | null;
};

/** Kop laporan. screen=false → hanya muncul saat dicetak (sesuai pola lama). */
export function ReportKop({ title, code, screen = false }: { title: string; code?: string; screen?: boolean }) {
  return (
    <div className={`${screen ? "block" : "hidden print:block"} text-center mb-6 pb-4 border-b-2 border-black`}>
      <div className="flex justify-center gap-4 items-center mb-2">
        <img
          src="/mitra-diani-logo.png"
          alt="Mitra Diani"
          style={{ height: 56 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <img src="/logo.png" alt="FlourishCare" style={{ height: 56 }} />
      </div>
      <p className="text-xs">
        <b>{KOP.kop1}</b> <i>{KOP.kop1b}</i> <b>{KOP.kop2}</b>
      </p>
      <p className="text-[11px] text-text-secondary">{KOP.alamat}</p>
      <p className="text-[11px] text-text-secondary">{KOP.kontak}</p>
      <h1 className="text-xl font-bold mt-3 uppercase">{title}</h1>
      {code && <p className="text-[11px] text-text-secondary font-mono">{code}</p>}
    </div>
  );
}

export function useSignature(profileId: string | null | undefined) {
  const [sig, setSig] = useState<SignatureData | null>(null);
  const [pj, setPj] = useState<PjSetting>(SETTING_DEFAULTS.pj);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const [s, p] = await Promise.all([
        profileId
          ? supabase.from("staff_signatures").select("*").eq("profile_id", profileId).maybeSingle()
          : Promise.resolve({ data: null }),
        loadSetting("pj"),
      ]);
      if (cancel) return;
      setSig((s.data as SignatureData | null) ?? null);
      setPj(p);
    })();
    return () => {
      cancel = true;
    };
  }, [profileId]);
  return { sig, pj };
}

/** "Jakarta, tanggal — Mengetahui:" + tanda tangan penulis & Penanggungjawab Klinik. */
export function SignatureBlock({
  date,
  authorId,
  authorName,
  author,
  pj,
}: {
  date: string | null | undefined;
  authorId?: string | null;
  authorName?: string | null;
  /** bila diberikan (mis. portal orang tua), tidak fetch */
  author?: SignatureData | null;
  pj?: PjSetting | null;
}) {
  const fetched = useSignature(author === undefined ? authorId : null);
  const a = author === undefined ? fetched.sig : author;
  const p = pj ?? fetched.pj;
  return (
    <div className="mt-8 text-sm break-inside-avoid">
      <p className="text-right mb-1">Jakarta, {fmtDateLong(date)}</p>
      <p className="mb-3">Mengetahui:</p>
      <div className="grid grid-cols-2 gap-8 text-center">
        <SignCell jabatan={a?.title || "Penulis Laporan"} nama={a?.display_name || authorName || "-"} izin={a?.license} image={a?.image_data} />
        <SignCell jabatan={p.jabatan} nama={p.nama} izin={p.izin} image={p.image_data} />
      </div>
      <p className="mt-6 text-[11px] text-text-secondary text-center italic">{KOP.footer}</p>
    </div>
  );
}

function SignCell({ jabatan, nama, izin, image }: { jabatan: string; nama: string; izin?: string | null; image?: string | null }) {
  return (
    <div>
      <p className="font-semibold">{jabatan}</p>
      <div className="h-20 flex items-center justify-center">
        {image ? <img src={image} alt={`Tanda tangan ${nama}`} className="max-h-20 max-w-[180px] object-contain" /> : null}
      </div>
      <p className="font-semibold underline">{nama}</p>
      {izin && <p className="text-[11px] text-text-secondary">{izin}</p>}
    </div>
  );
}

/** Kotak centang gaya formulir cetak. */
export function Tick({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 mr-3">
      <span className={`inline-flex w-3.5 h-3.5 border border-black/60 items-center justify-center text-[10px] ${on ? "bg-black/5" : ""}`}>
        {on ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}
