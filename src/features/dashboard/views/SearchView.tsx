import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Users, Video, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatWaDisplay, toWaNumber, waLink } from "@/lib/wa";
import { EmptyState } from "@/features/dashboard/common";

// Pencarian global (Admin): nama anak, kode booking, No. RM, nomor WhatsApp.

type Hit = { type: "pasien" | "booking" | "pendaftaran"; id: string; title: string; sub: string; wa?: string | null; tag?: string };

export function SearchView({ onOpen }: { onOpen?: (tab: "patients" | "online_bookings" | "registrations") => void }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const like = `%${term.replace(/[%_,()]/g, " ")}%`;
      const digits = term.replace(/\D/g, "");
      const waVariants = digits.length >= 4 ? [digits, toWaNumber(digits), digits.replace(/^62/, "0")] : [];
      const waOr = waVariants.map((w) => `parent_whatsapp.ilike.%${w}%`).join(",");

      const [kids, parents, bookings, regs] = await Promise.all([
        supabase.from("children").select("id, full_name, rm_number, dob, parent_id").or(`full_name.ilike.${like},rm_number.ilike.${like},nickname.ilike.${like}`).limit(20),
        waVariants.length
          ? supabase.from("parents").select("id, full_name, whatsapp").or(waVariants.map((w) => `whatsapp.ilike.%${w}%`).join(",")).limit(20)
          : Promise.resolve({ data: [] }),
        supabase
          .from("online_bookings")
          .select("id, code, child_name, parent_name, parent_whatsapp, scheduled_at, status")
          .or(`code.ilike.${like},child_name.ilike.${like},parent_name.ilike.${like}${waOr ? "," + waOr : ""}`)
          .order("scheduled_at", { ascending: false })
          .limit(20),
        supabase
          .from("patient_registrations")
          .select("id, code, patient_name, rm_number, contact_whatsapp, status")
          .or(`code.ilike.${like},patient_name.ilike.${like},rm_number.ilike.${like}`)
          .limit(20),
      ]);

      const out: Hit[] = [];
      const parentIds = new Set(((parents.data ?? []) as { id: string }[]).map((p) => p.id));
      let kidRows = (kids.data ?? []) as { id: string; full_name: string; rm_number: string; dob: string; parent_id: string }[];
      if (parentIds.size) {
        const { data: more } = await supabase.from("children").select("id, full_name, rm_number, dob, parent_id").in("parent_id", [...parentIds]);
        kidRows = [...kidRows, ...((more ?? []) as typeof kidRows)].filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
      }
      const parentMap = Object.fromEntries(((parents.data ?? []) as { id: string; whatsapp: string }[]).map((p) => [p.id, p.whatsapp]));
      kidRows.forEach((c) =>
        out.push({ type: "pasien", id: c.id, title: c.full_name, sub: `RM ${c.rm_number} · lahir ${new Date(c.dob).toLocaleDateString("id-ID")}`, wa: parentMap[c.parent_id] ?? null })
      );
      ((bookings.data ?? []) as { id: string; code: string; child_name: string; parent_name: string; parent_whatsapp: string; scheduled_at: string; status: string }[]).forEach((b) =>
        out.push({
          type: "booking",
          id: b.id,
          title: `${b.code} · ${b.child_name}`,
          sub: `${b.parent_name} · ${new Date(b.scheduled_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
          wa: b.parent_whatsapp,
          tag: b.status.replace(/_/g, " "),
        })
      );
      ((regs.data ?? []) as { id: string; code: string; patient_name: string; rm_number: string | null; contact_whatsapp: string | null; status: string }[]).forEach((r) =>
        out.push({ type: "pendaftaran", id: r.id, title: `${r.code} · ${r.patient_name}`, sub: r.rm_number ? `RM ${r.rm_number}` : "Menunggu RM", wa: r.contact_whatsapp, tag: r.status === "pending_rm" ? "baru" : undefined })
      );
      setHits(out);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const ICON = { pasien: Users, booking: Video, pendaftaran: ClipboardList };
  const TAB = { pasien: "patients", booking: "online_bookings", pendaftaran: "registrations" } as const;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama anak, kode booking, No. RM, atau nomor WhatsApp"
          className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-primary/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {loading ? (
        <div className="text-sm text-text-secondary flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Mencari…</div>
      ) : q.trim().length >= 2 && hits.length === 0 ? (
        <EmptyState title="Tidak ditemukan" description="Coba kata kunci lain (minimal 2 huruf, atau 4 digit nomor WA)." icon={Search} />
      ) : (
        <ul className="space-y-2">
          {hits.map((h) => {
            const Icon = ICON[h.type];
            return (
              <li key={h.type + h.id} className="bg-white rounded-2xl border border-black/5 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon size={16} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{h.title}</p>
                  <p className="text-xs text-text-secondary">
                    <span className="capitalize">{h.type}</span> · {h.sub}
                    {h.wa ? <> · <a href={waLink(h.wa)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{formatWaDisplay(h.wa)}</a></> : null}
                  </p>
                </div>
                {h.tag && <span className="text-xs px-2.5 py-0.5 rounded-full bg-background border border-black/10 capitalize">{h.tag}</span>}
                {onOpen && (
                  <button onClick={() => onOpen(TAB[h.type])} className="text-xs text-primary font-semibold hover:underline">Buka</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
