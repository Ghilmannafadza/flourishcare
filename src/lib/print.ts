/**
 * Print utility yang mengganti document.title sementara agar
 * default nama file "Save as PDF" jadi rapi (bukan judul halaman).
 *
 * Contoh: printWithTitle("FRM-005-Aisha-2026-08-13")
 */
export function printWithTitle(fileTitle: string) {
  const originalTitle = document.title;
  const safe = (fileTitle || "dokumen").replace(/[\\/:*?"<>|]/g, "-").trim();
  document.title = safe;
  // Hanya area .fc-print-area yang dicetak (lihat index.css) bila ada di halaman
  const hasArea = !!document.querySelector(".fc-print-area");
  if (hasArea) document.body.classList.add("fc-print-doc");
  // Delay kecil agar browser sempat baca title baru sebelum dialog print terbuka
  setTimeout(() => {
    window.print();
    // Restore title setelah dialog print ditutup / setelah delay
    setTimeout(() => {
      document.title = originalTitle;
      document.body.classList.remove("fc-print-doc");
    }, 1000);
  }, 50);
}

/** Format tanggal untuk nama file: YYYY-MM-DD */
export function isoDate(d: Date | string | null | undefined) {
  if (!d) return new Date().toISOString().slice(0, 10);
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
