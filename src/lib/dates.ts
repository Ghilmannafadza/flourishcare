// Helper tanggal (zona waktu lokal WIB). Format tampilan Indonesia: dd/mm/yyyy.

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2026-11-13" (lokal) dari Date */
export function isoLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "13/11/2026" → "2026-11-13" (null bila tidak valid) */
export function dmyToIso(v: string | null | undefined): string | null {
  const m = String(v ?? "").trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const t = new Date(iso + "T00:00:00");
  if (Number.isNaN(t.getTime()) || t.getDate() !== Number(d) || t.getMonth() + 1 !== Number(mo)) return null;
  return iso;
}

/** "2026-11-13" → "13/11/2026" */
export function isoToDmy(v: string | null | undefined): string {
  const m = String(v ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Ketik bebas → otomatis beri "/" (dd/mm/yyyy) */
export function maskDmy(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** 13 November 2026 */
export function fmtDateLong(v: string | Date | null | undefined): string {
  if (!v) return "-";
  const d = typeof v === "string" ? new Date(v.length === 10 ? v + "T00:00:00" : v) : v;
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return "-";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Usia dalam bulan pada tanggal acuan */
export function ageMonths(dob: string | null | undefined, ref?: string | null): number | null {
  if (!dob) return null;
  const b = new Date(dob + "T00:00:00");
  const n = ref ? new Date(ref + "T00:00:00") : new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) m--;
  return m;
}

export function fmtAge(m: number | null): string {
  if (m == null || m < 0) return "-";
  return `${Math.floor(m / 12)} tahun${m % 12 ? ` ${m % 12} bulan` : ""}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}
