import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

// Simpan otomatis isian laporan/formulir di perangkat (localStorage),
// dengan tawaran "Pulihkan / Buang" saat form dibuka lagi. Draft > 7 hari diabaikan.

const PREFIX = "fc_draft_";
const MAX_AGE = 7 * 24 * 3600 * 1000;

export function readDraft<T>(key: string): { t: number; v: T } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const d = JSON.parse(raw) as { t: number; v: T };
    if (!d || Date.now() - d.t > MAX_AGE) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Simpan `value` (debounce 600 ms) selama `enabled`. */
export function useAutosave<T>(key: string, value: T, enabled = true) {
  const first = useRef(true);
  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [key, value, enabled]);
}

/** Banner "Ada isian tersimpan … Pulihkan / Buang". */
export function DraftBanner<T>({ storageKey, onRestore }: { storageKey: string; onRestore: (v: T) => void }) {
  const [draft, setDraft] = useState(() => readDraft<T>(storageKey));
  if (!draft) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-yellow-800 print:hidden">
      <RotateCcw size={14} />
      <span className="flex-1">
        Ada isian tersimpan di perangkat ini ({new Date(draft.t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}).
      </span>
      <button
        type="button"
        className="text-xs px-3 py-1.5 rounded-full bg-primary text-white font-semibold"
        onClick={() => {
          onRestore(draft.v);
          setDraft(null);
        }}
      >
        Pulihkan
      </button>
      <button
        type="button"
        className="text-xs px-3 py-1.5 rounded-full border border-black/10 bg-white"
        onClick={() => {
          clearDraft(storageKey);
          setDraft(null);
        }}
      >
        Buang
      </button>
    </div>
  );
}
