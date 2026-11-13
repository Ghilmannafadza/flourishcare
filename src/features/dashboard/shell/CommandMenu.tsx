import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Users, Video, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";
import { pathOf, type NavProduct } from "./nav";

// Menu perintah (Ctrl/⌘ + K), seperti Supabase Studio:
// lompat ke halaman mana pun, dan (admin) cari pasien / kode booking langsung.

type Item = { id: string; label: string; hint: string; icon: LucideIcon; go: () => void };

export function CommandMenu({ open, onClose, nav, role }: { open: boolean; onClose: () => void; nav: NavProduct[]; role: UserRole | null }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [hits, setHits] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === "super_admin" || role === "admin_cabang";
  const canSeePatients = role !== "karyawan" && role !== null;

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setHits([]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const pages = useMemo<Item[]>(
    () =>
      nav.flatMap((p) =>
        p.pages.map((pg) => ({
          id: pg.key,
          label: pg.label,
          hint: p.label === pg.label ? "Halaman" : p.label,
          icon: pg.icon,
          go: () => navigate(pathOf(p, pg)),
        }))
      ),
    [nav, navigate]
  );

  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2 || !canSeePatients) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const like = `%${term.replace(/[%_,()]/g, " ")}%`;
      const [kids, bks] = await Promise.all([
        supabase.from("children").select("id, full_name, rm_number").or(`full_name.ilike.${like},rm_number.ilike.${like}`).limit(5),
        isAdmin
          ? supabase.from("online_bookings").select("id, code, child_name").or(`code.ilike.${like},child_name.ilike.${like}`).order("scheduled_at", { ascending: false }).limit(5)
          : Promise.resolve({ data: [] }),
      ]);
      const out: Item[] = [];
      ((kids.data ?? []) as { id: string; full_name: string; rm_number: string }[]).forEach((c) =>
        out.push({ id: "c" + c.id, label: c.full_name, hint: `Pasien · ${c.rm_number}`, icon: Users, go: () => navigate(`/dashboard/pasien?q=${encodeURIComponent(c.rm_number)}`) })
      );
      ((bks.data ?? []) as { id: string; code: string; child_name: string }[]).forEach((b) =>
        out.push({ id: "b" + b.id, label: `${b.code} · ${b.child_name}`, hint: "Booking", icon: Video, go: () => navigate(`/dashboard/booking/online?q=${encodeURIComponent(b.code)}`) })
      );
      setHits(out);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, isAdmin, canSeePatients, navigate]);

  const filteredPages = pages.filter((p) => !q.trim() || (p.label + " " + p.hint).toLowerCase().includes(q.trim().toLowerCase()));
  const items = [...filteredPages, ...hits];

  if (!open) return null;

  function run(i: number) {
    const it = items[i];
    if (!it) return;
    it.go();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-start justify-center p-4 pt-[12vh]" onMouseDown={onClose}>
      <div className="bg-white w-full max-w-xl rounded-xl shadow-warm-lg border border-black/10 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-black/10">
          <Search size={16} className="text-text-secondary" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(items.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter") run(idx);
            }}
            placeholder={canSeePatients ? "Ketik nama menu, nama anak, No. RM, atau kode booking…" : "Ketik nama menu…"}
            className="flex-1 h-12 bg-transparent text-sm focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-black/10 text-text-secondary">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {items.length === 0 && <li className="px-4 py-6 text-sm text-text-secondary text-center">Tidak ada hasil untuk “{q}”.</li>}
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                onMouseEnter={() => setIdx(i)}
                onClick={() => run(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${i === idx ? "bg-primary/10" : ""}`}
              >
                <it.icon size={16} className={i === idx ? "text-primary" : "text-text-secondary"} />
                <span className="flex-1 truncate">{it.label}</span>
                <span className="text-xs text-text-secondary">{it.hint}</span>
                {i === idx && <CornerDownLeft size={13} className="text-text-secondary" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
