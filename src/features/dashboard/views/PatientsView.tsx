import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Search, KeyRound, Unlock, Trash2, Loader2, ChevronDown, ChevronUp, Copy, Check, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchChildren } from "@/features/dashboard/queries";
import type { Child } from "@/types/database";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { waLink } from "@/lib/wa";
import { fmtDateTime } from "@/lib/dates";
import { SERVICE_NAME } from "@/features/reports/evaluation";

// Data Pasien: kode akses portal orang tua, buka kunci login, tim terapis per layanan
// (terapis utama), hapus pasien (konfirmasi No. RM).

type ChildRow = Child & { access_code_set_at?: string | null };
type Team = { child_id: string; service: string; staff_id: string };
type StaffOpt = { profile_id: string; title: string; services: string[] };

const SERVICES = ["PSI", "BT", "SI", "OT", "TW"];

export function PatientsView() {
  const { role } = useAuth();
  const isAdmin = role === "super_admin" || role === "admin_cabang";
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [parents, setParents] = useState<Record<string, { full_name: string; whatsapp: string }>>({});
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kids, t, sp, pr] = await Promise.all([
        fetchChildren(500),
        supabase.from("child_care_team").select("child_id, service, staff_id"),
        supabase.from("staff_profiles").select("profile_id, title, homecare_services, therapy_types").not("profile_id", "is", null),
        supabase.from("parents").select("id, full_name, whatsapp"),
      ]);
      setChildren(kids as ChildRow[]);
      setTeam((t.data as Team[]) ?? []);
      setStaff(
        ((sp.data ?? []) as { profile_id: string; title: string; homecare_services: string[] | null; therapy_types: string[] | null }[]).map((s) => ({
          profile_id: s.profile_id,
          title: s.title,
          services: [
            ...(s.homecare_services ?? []).map((x) => x.toUpperCase()),
            ...((s.therapy_types ?? []).includes("konsultasi") ? ["PSI"] : []),
            ...(s.therapy_types ?? []).filter((x) => ["BT", "SI", "OT", "TW"].includes(x)),
          ],
        }))
      );
      setParents(Object.fromEntries(((pr.data ?? []) as { id: string; full_name: string; whatsapp: string }[]).map((p) => [p.id, p])));
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return children;
    return children.filter((c) => c.full_name.toLowerCase().includes(s) || c.rm_number.toLowerCase().includes(s));
  }, [children, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          placeholder="Cari nama atau RM"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-primary/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada pasien" description="Data pasien akan muncul di sini setelah ditambahkan oleh admin." icon={Users} />
      ) : (
        <div className="bg-white rounded-2xl border border-primary/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background text-text-secondary text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">RM</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Tgl Lahir</th>
                  <th className="px-4 py-3 font-medium">Tim</th>
                  <th className="px-4 py-3 font-medium">Kondisi</th>
                  {isAdmin && <th className="px-4 py-3 font-medium text-right">Kelola</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {filtered.map((c) => {
                  const t = team.filter((x) => x.child_id === c.id);
                  return [
                    <tr key={c.id} className="hover:bg-background/60">
                      <td className="px-4 py-3 font-mono text-xs">{c.rm_number}</td>
                      <td className="px-4 py-3 font-semibold">{c.full_name}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {new Date(c.dob).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.length === 0 ? (
                          <span className="text-text-secondary">-</span>
                        ) : (
                          t.map((x) => (
                            <span key={x.service} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {x.service}: {staff.find((s) => s.profile_id === x.staff_id)?.title.split(",")[0] ?? "?"}
                            </span>
                          ))
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{c.primary_condition ?? "-"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setOpen(open === c.id ? null : c.id)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1">
                            Kelola {open === c.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </td>
                      )}
                    </tr>,
                    open === c.id && isAdmin ? (
                      <tr key={c.id + "-panel"}>
                        <td colSpan={6} className="bg-background px-4 py-4">
                          <PatientPanel child={c} team={t} staff={staff} parent={parents[c.parent_id]} onChanged={load} />
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientPanel({
  child,
  team,
  staff,
  parent,
  onChanged,
}: {
  child: ChildRow;
  team: Team[];
  staff: StaffOpt[];
  parent?: { full_name: string; whatsapp: string };
  onChanged: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lock, setLock] = useState<{ failures: number; locked_until: string | null } | null>(null);
  const [draftTeam, setDraftTeam] = useState<Record<string, string>>(Object.fromEntries(team.map((t) => [t.service, t.staff_id])));
  const [copied, setCopied] = useState(false);
  const [rmConfirm, setRmConfirm] = useState("");

  useEffect(() => {
    void supabase.rpc("admin_parent_lock_status", { p_rm: child.rm_number }).then(({ data }) => setLock((data as typeof lock) ?? null));
  }, [child.rm_number]);

  async function genCode() {
    if (child.access_code_set_at && !confirm("Buat kode akses baru? Kode lama langsung tidak berlaku.")) return;
    setBusy("code");
    setMsg(null);
    const { data, error } = await supabase.rpc("admin_set_access_code", { p_child_id: child.id });
    setBusy(null);
    if (error) return setMsg(`Error: ${error.message}`);
    setCode(String(data));
    onChanged();
  }

  async function unlock() {
    setBusy("unlock");
    const { error } = await supabase.rpc("admin_unlock_parent", { p_rm: child.rm_number });
    setBusy(null);
    if (error) return setMsg(`Error: ${error.message}`);
    setLock(null);
    setMsg("Login orang tua sudah dibuka kembali.");
  }

  async function saveTeam() {
    setBusy("team");
    setMsg(null);
    const del = SERVICES.filter((s) => !draftTeam[s] && team.some((t) => t.service === s));
    const ups = SERVICES.filter((s) => draftTeam[s]).map((s) => ({ child_id: child.id, service: s, staff_id: draftTeam[s] }));
    const r1 = del.length ? await supabase.from("child_care_team").delete().eq("child_id", child.id).in("service", del) : { error: null };
    const r2 = ups.length ? await supabase.from("child_care_team").upsert(ups, { onConflict: "child_id,service" }) : { error: null };
    setBusy(null);
    const err = r1.error || r2.error;
    if (err) return setMsg(`Error: ${err.message}`);
    setMsg("Tim terapis tersimpan.");
    onChanged();
  }

  async function del() {
    setBusy("del");
    const { error } = await supabase.rpc("admin_delete_patient", { p_child_id: child.id, p_rm_confirm: rmConfirm });
    setBusy(null);
    if (error) return setMsg(`Error: ${error.message}`);
    onChanged();
  }

  const loginUrl = `${window.location.origin}/progress`;
  const waMsg = code
    ? `Halo ${parent?.full_name ?? "Bapak/Ibu"}, berikut akses Portal Laporan FlourishCare untuk ${child.full_name}:\n\nNo. RM: ${child.rm_number}\nNama depan anak: ${child.full_name.split(" ")[0]}\nKode akses: ${code}\n\nBuka: ${loginUrl}\nMohon simpan kode ini dan jangan dibagikan.`
    : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="font-semibold flex items-center gap-2 mb-1"><KeyRound size={14} className="text-primary" /> Akses portal orang tua</p>
        <p className="text-xs text-text-secondary mb-3">
          Login di <span className="font-mono">/progress</span> dengan No. RM + nama depan anak + kode akses 6 karakter.
          {child.access_code_set_at ? ` Kode dibuat ${fmtDateTime(child.access_code_set_at)}.` : " Belum ada kode."}
        </p>
        {code && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-green-800 mb-1">Kode akses (hanya tampil sekali):</p>
            <p className="font-mono text-2xl font-bold tracking-[0.3em] text-green-800">{code}</p>
            <div className="flex gap-2 mt-2">
              <button
                className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                onClick={async () => {
                  await navigator.clipboard.writeText(waMsg).catch(() => undefined);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />} Salin pesan
              </button>
              {parent?.whatsapp && (
                <a href={waLink(parent.whatsapp, waMsg)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  Kirim via WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={genCode} disabled={busy === "code"} className="rounded-full">
            {busy === "code" ? <Loader2 size={14} className="animate-spin" /> : child.access_code_set_at ? "Buat ulang kode" : "Buat kode akses"}
          </Button>
          {lock && (lock.failures > 0 || (lock.locked_until && new Date(lock.locked_until) > new Date())) && (
            <Button size="sm" variant="outline" onClick={unlock} disabled={busy === "unlock"} className="rounded-full border-2">
              <Unlock size={14} className="mr-1" /> Buka kunci
            </Button>
          )}
        </div>
        {lock?.locked_until && new Date(lock.locked_until) > new Date() && (
          <p className="text-xs text-red mt-2">Terkunci sampai {fmtDateTime(lock.locked_until)} (5× salah).</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="font-semibold mb-1">Tim terapis (terapis utama per layanan)</p>
        <p className="text-xs text-text-secondary mb-3">Terapis lain dengan bidang sama tetap bisa menulis laporan sebagai pengganti.</p>
        <div className="space-y-2">
          {SERVICES.map((s) => {
            const opts = staff.filter((x) => x.services.includes(s));
            return (
              <label key={s} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 font-semibold">{SERVICE_NAME[s]}</span>
                <select value={draftTeam[s] ?? ""} onChange={(e) => setDraftTeam({ ...draftTeam, [s]: e.target.value })} className="input">
                  <option value="">—</option>
                  {(opts.length ? opts : staff).map((o) => <option key={o.profile_id} value={o.profile_id}>{o.title}</option>)}
                </select>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={saveTeam} disabled={busy === "team"} className="rounded-full">
            {busy === "team" ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="mr-1" /> Simpan tim</>}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-red/20 p-4">
        <p className="font-semibold text-red flex items-center gap-2 mb-1"><Trash2 size={14} /> Hapus pasien</p>
        <p className="text-xs text-text-secondary mb-3">
          Menghapus data anak beserta seluruh laporannya. Tidak bisa dibatalkan. Ketik No. RM <span className="font-mono font-semibold">{child.rm_number}</span> untuk konfirmasi.
        </p>
        <input value={rmConfirm} onChange={(e) => setRmConfirm(e.target.value)} className="input mb-2 font-mono" placeholder={child.rm_number} />
        <Button
          size="sm"
          variant="outline"
          onClick={del}
          disabled={busy === "del" || rmConfirm.trim().toUpperCase() !== child.rm_number.toUpperCase()}
          className="rounded-full border-2 text-red border-red/30 hover:bg-red/10"
        >
          {busy === "del" ? <Loader2 size={14} className="animate-spin" /> : "Hapus permanen"}
        </Button>
      </div>
      {msg && <p className={`text-xs lg:col-span-3 ${msg.startsWith("Error") ? "text-red" : "text-green-700"}`}>{msg}</p>}
    </div>
  );
}
