import { useEffect, useState } from "react";
import { Building2, UserCog, Wallet, Calendar as CalendarIcon, Loader2, Plus, Trash2, Save, UserPlus, Mail, Lock, Phone, Copy, Check, EyeOff, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import type { Branch, Profile, UserRole } from "@/types/database";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { ContactSection, BookingRulesSection, VisitTariffSection, PjSection, TimeOffSection } from "./SettingsExtras";
import { BackupSection } from "./BackupSection";

export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin_cabang: "Admin Operasional",
  psikolog: "Psikolog",
  terapis: "Terapis",
  karyawan: "Karyawan",
};

type PriceRow = { mode: string; price: number };

const PRICE_LABELS: Record<string, string> = {
  online: "Konsultasi Online (Psikolog)",
  homecare: "Homecare Visit (Umum, lama)",
  admin_fee: "Biaya Admin",
  homecare_bt: "Homecare BT — Behaviour Therapy Psikolog",
  homecare_si: "Homecare SI — Sensory Integration",
  homecare_ot: "Homecare OT — Occupational Therapy",
  homecare_tw: "Homecare TW — Terapi Wicara",
};
type Psi = { id: string; title: string; photo_url: string | null };
type Schedule = {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_duration_min: number;
  is_active: boolean;
  mode: "online" | "homecare";
};

const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export type SettingsPage = "tarif" | "booking" | "jadwal" | "tim" | "akun" | "kontak" | "pengesahan" | "backup";

/** Pengaturan dipecah per halaman (menu produk "Pengaturan"), pola Supabase Studio. */
export function SettingsView({ page = "tarif" }: { page?: SettingsPage }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [br, us] = await Promise.all([
        supabase.from("branches").select("*").order("created_at"),
        supabase.from("profiles").select("*").order("created_at"),
      ]);
      if (!cancelled) {
        setBranches((br.data as Branch[]) ?? []);
        setUsers((us.data as Profile[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading && (page === "akun" || page === "pengesahan")) return <LoadingBlock />;
  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div className="space-y-6">
      {page === "tarif" && (
        <>
          <PricingSection />
          <VisitTariffSection />
        </>
      )}
      {page === "booking" && <BookingRulesSection />}
      {page === "jadwal" && (
        <>
          <SchedulesSection />
          <TimeOffSection />
        </>
      )}
      {page === "tim" && <BookableStaffSection />}
      {page === "akun" && (
        <>
          <CreateStaffSection branches={branches} onCreated={reload} />
          <UsersSection users={users} onReload={reload} />
        </>
      )}
      {page === "kontak" && <ContactSection />}
      {page === "pengesahan" && (
        <>
          <PjSection />
          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-primary" /> Cabang
            </h3>
            {branches.length === 0 ? (
              <EmptyState title="Belum ada cabang" description="Jalankan seed atau tambahkan cabang melalui Supabase." icon={Building2} />
            ) : (
              <ul className="divide-y divide-black/5">
                {branches.map((b) => (
                  <li key={b.id} className="py-3">
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-text-secondary">{b.address}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {page === "backup" && <BackupSection />}
    </div>
  );
}

// ============ Harga Booking ============

function PricingSection() {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("online_booking_prices").select("*").order("mode");
    const rows = (data as PriceRow[]) ?? [];
    setPrices(rows);
    const d: Record<string, string> = {};
    rows.forEach((r) => { d[r.mode] = String(r.price); });
    setDraft(d);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function save(mode: string) {
    setSaving(mode);
    setMsg(null);
    const newPrice = Number(draft[mode]);
    if (isNaN(newPrice) || newPrice <= 0) {
      setMsg("Harga harus angka positif.");
      setSaving(null);
      return;
    }
    const { error } = await supabase
      .from("online_booking_prices")
      .update({ price: newPrice })
      .eq("mode", mode);
    setSaving(null);
    if (error) setMsg(`Error: ${error.message}`);
    else {
      setMsg(`Harga ${mode} berhasil diupdate ke Rp ${newPrice.toLocaleString("id-ID")}.`);
      void load();
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <Wallet size={18} className="text-primary" /> Harga Booking Online
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Harga yang tampil di halaman <span className="font-mono">flourishcare.id/book</span>.
      </p>

      {loading ? (
        <div className="text-sm text-text-secondary flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Memuat harga…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prices.map((p) => (
            <div key={p.mode} className="bg-background rounded-2xl p-4 border border-black/5">
              <p className="text-xs uppercase tracking-wider text-text-secondary font-semibold mb-2">
                {PRICE_LABELS[p.mode] ?? p.mode}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Rp</span>
                <input
                  type="number"
                  value={draft[p.mode] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [p.mode]: e.target.value })}
                  min={0}
                  step={1000}
                  className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button size="sm" onClick={() => save(p.mode)} disabled={saving === p.mode} className="rounded-full">
                  {saving === p.mode ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                </Button>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Saat ini: <span className="font-semibold">Rp {p.price.toLocaleString("id-ID")}</span>
              </p>
            </div>
          ))}
        </div>
      )}
      {msg && (
        <p className={`text-xs mt-3 ${msg.startsWith("Error") ? "text-red" : "text-green-700"}`}>{msg}</p>
      )}
    </section>
  );
}

// ============ Jadwal Psikolog ============

function SchedulesSection() {
  const { role } = useAuth();
  const canEdit = role === "super_admin";
  const [psis, setPsis] = useState<Psi[]>([]);
  const [selectedPsi, setSelectedPsi] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingPsi, setLoadingPsi] = useState(true);
  const [loadingSched, setLoadingSched] = useState(false);

  // Form input untuk tambah schedule baru
  const [newDay, setNewDay] = useState<number>(1);
  const [newStart, setNewStart] = useState<string>("19:00");
  const [newEnd, setNewEnd] = useState<string>("20:30");
  const [newDuration, setNewDuration] = useState<number>(60);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Tab mode: online atau homecare
  const [scheduleMode, setScheduleMode] = useState<"online" | "homecare">("online");

  useEffect(() => {
    (async () => {
      setLoadingPsi(true);
      const { data } = await supabase
        .from("staff_profiles")
        .select("id,title,photo_url")
        .eq("is_visible", true)
        .order("display_order");
      const list = (data as Psi[]) ?? [];
      setPsis(list);
      if (list[0]) setSelectedPsi(list[0].id);
      setLoadingPsi(false);
    })();
  }, []);

  async function loadSchedules() {
    if (!selectedPsi) return;
    setLoadingSched(true);
    const { data } = await supabase
      .from("psychologist_schedules")
      .select("*")
      .eq("staff_id", selectedPsi)
      .order("day_of_week")
      .order("start_time");
    setSchedules((data as Schedule[]) ?? []);
    setLoadingSched(false);
  }

  useEffect(() => { void loadSchedules(); }, [selectedPsi]);

  async function addSchedule() {
    if (!selectedPsi) return;
    if (newStart >= newEnd) {
      setMsg("Waktu mulai harus sebelum waktu selesai.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("psychologist_schedules").insert({
      staff_id: selectedPsi,
      day_of_week: newDay,
      start_time: newStart,
      end_time: newEnd,
      session_duration_min: newDuration,
      is_active: true,
      mode: scheduleMode,
    });
    setSaving(false);
    if (error) setMsg(`Error: ${error.message}`);
    else {
      setMsg("Jadwal berhasil ditambahkan.");
      void loadSchedules();
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Hapus jadwal ini?")) return;
    await supabase.from("psychologist_schedules").delete().eq("id", id);
    void loadSchedules();
  }

  async function toggleActive(s: Schedule) {
    await supabase
      .from("psychologist_schedules")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    void loadSchedules();
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <CalendarIcon size={18} className="text-primary" /> Jadwal Psikolog
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Kelola jadwal sesi <span className="font-semibold">Online</span> dan <span className="font-semibold">Homecare Visit</span> terpisah.
        Perubahan langsung mempengaruhi slot di halaman booking publik.
      </p>

      {loadingPsi ? (
        <div className="text-sm text-text-secondary flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Memuat…
        </div>
      ) : (
        <>
          {/* Pilih psikolog */}
          <div className="mb-4">
            <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider mb-2">Pilih Psikolog</label>
            <div className="flex flex-wrap gap-2">
              {psis.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPsi(p.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedPsi === p.id
                      ? "bg-primary text-white"
                      : "bg-background border border-black/10 text-text-secondary hover:border-primary/40"
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Mode: Online vs Homecare */}
          <div className="flex gap-2 mb-3 border-b border-black/5">
            {(["online", "homecare"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setScheduleMode(m)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  scheduleMode === m
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-primary"
                }`}
              >
                {m === "online" ? "🎥 Konsultasi Online" : "🏠 Homecare Visit"}
              </button>
            ))}
          </div>

          {/* Daftar jadwal existing — filter by mode */}
          <div className="bg-background rounded-2xl border border-black/5 divide-y divide-black/5 mb-5">
            {loadingSched ? (
              <div className="p-4 text-sm text-text-secondary">Memuat jadwal…</div>
            ) : schedules.filter((s) => s.mode === scheduleMode).length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">
                Belum ada jadwal <span className="font-semibold">{scheduleMode === "online" ? "online" : "homecare"}</span> untuk psikolog ini.
                Tambahkan di form di bawah.
              </div>
            ) : (
              schedules.filter((s) => s.mode === scheduleMode).map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-14 text-center">
                      <p className="text-xs text-text-secondary uppercase">{DAY_LABELS[s.day_of_week].slice(0, 3)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-text-secondary">Durasi sesi {s.session_duration_min} menit</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          s.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {s.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                      <button
                        onClick={() => deleteSchedule(s.id)}
                        className="p-2 text-red hover:bg-red/10 rounded-full"
                        aria-label="Hapus jadwal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Form tambah jadwal */}
          {canEdit && (
            <div className="bg-background rounded-2xl border border-black/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Tambah Jadwal {scheduleMode === "online" ? "Online" : "Homecare"} Baru
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-xs text-text-secondary">Hari</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(Number(e.target.value))}
                    className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm mt-1"
                  >
                    {DAY_LABELS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Mulai</label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Selesai</label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Durasi (menit)</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm mt-1"
                  />
                </div>
                <Button
                  onClick={addSchedule}
                  disabled={saving}
                  size="sm"
                  className="rounded-full h-10"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <><Plus size={14} className="mr-1" /> Tambah</>}
                </Button>
              </div>
              {msg && (
                <p className={`text-xs mt-3 ${msg.startsWith("Error") ? "text-red" : "text-green-700"}`}>{msg}</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ============ Buat Akun Staf ============

function CreateStaffSection({ branches, onCreated }: { branches: Branch[]; onCreated: () => void }) {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [staffRole, setStaffRole] = useState<UserRole>("psikolog");
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  if (!isSuperAdmin) return null;

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pw);
  }

  async function copyCredentials() {
    const text = `Email: ${email}\nPassword: ${password}\nRole: ${staffRole}\n\nLogin di: https://flourishcare.id/login`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("create_staff_user", {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role: staffRole,
          branch_id: branchId || null,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setMsg({
        text: `Akun ${email} berhasil dibuat sebagai ${ROLE_LABEL[staffRole] ?? staffRole}. Salin credentials di bawah dan kirim ke yang bersangkutan.`,
        kind: "success",
      });
      onCreated();
    } catch (err) {
      setMsg({ text: (err as Error).message ?? "Gagal membuat akun.", kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <UserPlus size={18} className="text-primary" /> Buat Akun Staf Klinik
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Akun staf hanya dibuat oleh Super Admin (tanpa pendaftaran mandiri). Kata sandi sementara wajib diganti saat login pertama. Login di{" "}
        <span className="font-mono">flourishcare.id/login</span>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Sarah Putri"
              className="w-full rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@flourishcare.id"
                className="w-full rounded-xl border border-black/10 bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password Sementara</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-xl border border-black/10 bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={generatePassword} className="rounded-full whitespace-nowrap border-2">
                Generate
              </Button>
            </div>
            <p className="text-xs text-text-secondary mt-1">Kirim ke staf, minta ganti setelah login pertama.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Nomor WhatsApp (opsional)</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full rounded-xl border border-black/10 bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <select
              required
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as UserRole)}
              className="w-full rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="admin_cabang">Admin Operasional</option>
              <option value="psikolog">Psikolog</option>
              <option value="terapis">Terapis</option>
              <option value="karyawan">Karyawan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Cabang</label>
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {branches.length === 0 ? (
                <option value="">Belum ada cabang</option>
              ) : (
                branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
              )}
            </select>
          </div>
        </div>

        {msg && (
          <div
            className={`text-sm px-4 py-3 rounded-2xl border ${
              msg.kind === "success"
                ? "text-green-800 bg-green-50 border-green-200"
                : "text-red bg-red/10 border-red/20"
            }`}
          >
            {msg.text}
            {msg.kind === "success" && (
              <div className="mt-3 pt-3 border-t border-green-200 bg-white rounded-xl p-3 font-mono text-xs space-y-0.5">
                <p><span className="text-text-secondary">Email:</span> <span className="font-semibold">{email}</span></p>
                <p><span className="text-text-secondary">Password:</span> <span className="font-semibold">{password}</span></p>
                <p><span className="text-text-secondary">Role:</span> <span className="font-semibold">{staffRole}</span></p>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {copied ? <><Check size={12} /> Tersalin</> : <><Copy size={12} /> Salin credentials</>}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !branchId} className="rounded-full shadow-warm">
            {submitting ? (
              <><Loader2 className="animate-spin mr-2" size={14} /> Membuat…</>
            ) : (
              <><UserPlus size={14} className="mr-2" /> Buat Akun</>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

// ============ Kelola Psikolog yang muncul di Booking Online ============

type BookableStaff = {
  id: string;
  title: string;
  slug: string | null;
  photo_url: string | null;
  is_visible: boolean;
  is_bookable_online: boolean;
  display_order: number | null;
  homecare_services: string[] | null;
  bio: string | null;
  specialties: string[] | null;
  role_label: string | null;
  campus: string | null;
  education: string | null;
  certifications: string | null;
  experience: string | null;
  focus: string | null;
  instagram: string | null;
  employment: string | null;
  str_number: string | null;
};

type Cv = {
  bio: string; specialties: string; role_label: string; campus: string; education: string; certifications: string;
  experience: string; focus: string; instagram: string; employment: string; str_number: string; is_visible: boolean; display_order: string;
};

const HOMECARE_SVC_OPTIONS = [
  { key: "bt", label: "BT Psikolog" },
  { key: "si", label: "SI" },
  { key: "ot", label: "OT" },
  { key: "tw", label: "TW" },
];

function BookableStaffSection() {
  const { role } = useAuth();
  const canEdit = role === "super_admin";
  const [staff, setStaff] = useState<BookableStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editServices, setEditServices] = useState<string[]>([]);
  const [cv, setCv] = useState<Cv | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("staff_profiles")
      .select("*")
      .order("display_order", { ascending: true });
    setStaff((data as BookableStaff[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function openEdit(s: BookableStaff) {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditPhotoUrl(s.photo_url ?? "");
    setEditServices(s.homecare_services ?? []);
    setCv({
      bio: s.bio ?? "", specialties: (s.specialties ?? []).join(", "), role_label: s.role_label ?? "", campus: s.campus ?? "",
      education: s.education ?? "", certifications: s.certifications ?? "", experience: s.experience ?? "", focus: s.focus ?? "",
      instagram: s.instagram ?? "", employment: s.employment ?? "tetap", str_number: s.str_number ?? "",
      is_visible: s.is_visible, display_order: String(s.display_order ?? ""),
    });
  }

  function toggleEditService(key: string) {
    setEditServices((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handlePhotoUpload(file: File) {
    if (!editingId) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg("Error: ukuran foto maksimal 5 MB.");
      return;
    }
    setUploading(true);
    setMsg(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${editingId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("staff-avatars")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setMsg(`Error upload: ${upErr.message}`);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("staff-avatars").getPublicUrl(path);
    setEditPhotoUrl(pub.publicUrl);
    setUploading(false);
    setMsg("Foto ter-upload, klik Simpan untuk menerapkan.");
  }

  async function saveEdit() {
    if (!editingId) return;
    setEditSaving(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("staff_profiles")
      .update({
        title: editTitle.trim(),
        photo_url: editPhotoUrl || null,
        homecare_services: editServices,
        ...(cv
          ? {
              bio: cv.bio.trim() || null,
              specialties: cv.specialties.split(",").map((x) => x.trim()).filter(Boolean),
              role_label: cv.role_label.trim() || null,
              campus: cv.campus.trim() || null,
              education: cv.education.trim() || null,
              certifications: cv.certifications.trim() || null,
              experience: cv.experience.trim() || null,
              focus: cv.focus.trim() || null,
              instagram: cv.instagram.trim().replace(/^@/, "") || null,
              employment: cv.employment,
              str_number: cv.str_number.trim() || null,
              is_visible: cv.is_visible,
              display_order: cv.display_order ? Number(cv.display_order) : 999,
            }
          : {}),
      })
      .eq("id", editingId)
      .select("id")
      .maybeSingle();
    setEditSaving(false);
    if (error) {
      setMsg(`Error: ${error.message}`);
      return;
    }
    if (!data) {
      setMsg(
        "Error: perubahan tidak tersimpan (kemungkinan permission). " +
        "Jalankan SQL policy staff_profiles_admin_write di Supabase."
      );
      return;
    }
    setEditingId(null);
    setMsg("Detail psikolog tersimpan permanen.");
    void load();
  }

  async function toggleBookable(id: string, next: boolean) {
    setSavingId(id);
    setMsg(null);
    // Update + return actual updated row (bukan optimistic — kita mau lihat DB yg sebenarnya berubah)
    const { data, error } = await supabase
      .from("staff_profiles")
      .update({ is_bookable_online: next })
      .eq("id", id)
      .select("id, is_bookable_online")
      .maybeSingle();
    setSavingId(null);
    if (error) {
      setMsg(`Error: ${error.message}`);
      return;
    }
    if (!data) {
      // Update tidak menyentuh row apapun — RLS block. Beri error jelas.
      setMsg(
        "Error: perubahan tidak tersimpan (kemungkinan permission). " +
        "Jalankan SQL policy staff_profiles_admin_write di Supabase, lalu coba lagi."
      );
      return;
    }
    // DB confirm — update local state sesuai hasil DB
    const actualValue = (data as { is_bookable_online: boolean }).is_bookable_online;
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, is_bookable_online: actualValue } : s)));
    setMsg(
      actualValue === next
        ? `Tersimpan permanen. Halaman booking akan menampilkan perubahan setelah reload.`
        : `Warning: DB return nilai berbeda (${String(actualValue)}). Cek policy RLS.`
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <UserCog size={18} className="text-primary" /> Kelola Psikolog di Booking Online
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Atur siapa yang muncul di halaman <span className="font-mono">flourishcare.id/book</span>.
        Nonaktifkan toggle untuk menyembunyikan psikolog dari daftar booking (tanpa menghapus data mereka).
      </p>

      {!canEdit && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mb-3">
          Hanya super admin yang bisa mengubah pengaturan ini.
        </p>
      )}

      {loading ? (
        <div className="text-sm text-text-secondary flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Memuat data psikolog…
        </div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-text-secondary italic">Belum ada data psikolog.</p>
      ) : (
        <ul className="divide-y divide-black/5">
          {staff.map((s) => (
            <li key={s.id} className="py-3 flex items-center gap-3">
              {s.photo_url ? (
                <img src={s.photo_url} alt={s.title} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  {s.title.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{s.title}</p>
                <p className="text-xs text-text-secondary">
                  {s.is_visible ? "Tampil di publik" : "Disembunyikan dari halaman /team"}
                  {" · "}
                  {s.is_bookable_online ? (
                    <span className="text-green-700 font-medium">Aktif di booking online</span>
                  ) : (
                    <span className="text-red font-medium">Tidak aktif di booking online</span>
                  )}
                </p>
                {s.homecare_services && s.homecare_services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] text-text-secondary">Homecare:</span>
                    {s.homecare_services.map((h) => (
                      <span key={h} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {h.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 font-medium"
                    title="Edit foto & nama"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canEdit || savingId === s.id}
                  onClick={() => toggleBookable(s.id, !s.is_bookable_online)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50 ${
                    s.is_bookable_online
                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      : "bg-red/10 text-red border-red/20 hover:bg-red/20"
                  }`}
                >
                  {savingId === s.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : s.is_bookable_online ? (
                    <>
                      <Eye size={12} /> Aktif
                    </>
                  ) : (
                    <>
                      <EyeOff size={12} /> Nonaktif
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {msg && (
        <p className={`text-xs mt-3 ${msg.startsWith("Error") ? "text-red" : "text-green-700"}`}>{msg}</p>
      )}

      {/* Modal Edit foto & detail psikolog */}
      {editingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-warm-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-heading font-bold text-lg">Edit Profil Tim (halaman Tim Kami)</h4>
              <button onClick={() => setEditingId(null)} className="p-1 hover:bg-black/5 rounded-full">✕</button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {editPhotoUrl ? (
                  <img src={editPhotoUrl} alt="preview" className="w-20 h-20 rounded-full object-cover border-2 border-primary/20" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {editTitle.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold cursor-pointer border ${uploading ? "opacity-50 cursor-not-allowed" : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"}`}>
                    {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <>📷 Upload Foto Baru</>}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                    />
                  </label>
                  <p className="text-[11px] text-text-secondary mt-1">JPG/PNG/WEBP, maks. 5 MB. Kotak (1:1) hasilnya paling rapi.</p>
                </div>
              </div>

              <label className="block">
                <span className="block text-xs font-semibold text-text-secondary mb-1">Nama Lengkap + Gelar</span>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Achla Himmah M.Psi., Psikolog"
                  className="input"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-text-secondary mb-1">Atau, URL Foto (opsional)</span>
                <input
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="input font-mono text-xs"
                />
              </label>

              <div>
                <p className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Layanan Homecare yang di-handle
                </p>
                <div className="flex flex-wrap gap-2">
                  {HOMECARE_SVC_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleEditService(s.key)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                        editServices.includes(s.key)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-white border-black/10 text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {editServices.includes(s.key) ? "✓ " : ""}{s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-text-secondary mt-1">
                  Contoh: Psikolog centang <span className="font-mono">BT Psikolog</span>. Terapis centang <span className="font-mono">SI/OT/TW</span> sesuai keahlian.
                </p>
              </div>

              {cv && (
                <div className="space-y-3 pt-3 border-t border-black/5">
                  <p className="text-xs font-semibold text-text-secondary">Profil & CV (pop-up “Lihat profil” di halaman Tim Kami)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Peran (mis. Psikolog Anak)</span><input value={cv.role_label} onChange={(e) => setCv({ ...cv, role_label: e.target.value })} className="input" /></label>
                    <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Lulusan (kampus)</span><input value={cv.campus} onChange={(e) => setCv({ ...cv, campus: e.target.value })} className="input" /></label>
                    <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Instagram</span><input value={cv.instagram} onChange={(e) => setCv({ ...cv, instagram: e.target.value })} className="input" placeholder="@username" /></label>
                    <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">No. STR / SIPP</span><input value={cv.str_number} onChange={(e) => setCv({ ...cv, str_number: e.target.value })} className="input" /></label>
                    <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Status kerja</span>
                      <select value={cv.employment} onChange={(e) => setCv({ ...cv, employment: e.target.value })} className="input"><option value="tetap">Tetap</option><option value="part_time">Part-time</option></select>
                    </label>
                    <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Urutan tampil</span><input inputMode="numeric" value={cv.display_order} onChange={(e) => setCv({ ...cv, display_order: e.target.value.replace(/\D/g, "") })} className="input" /></label>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cv.is_visible} onChange={(e) => setCv({ ...cv, is_visible: e.target.checked })} /> Tampilkan di halaman Tim Kami</label>
                  <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Bio singkat</span><textarea rows={2} value={cv.bio} onChange={(e) => setCv({ ...cv, bio: e.target.value })} className="input" /></label>
                  <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Tag keahlian (pisahkan dengan koma)</span><input value={cv.specialties} onChange={(e) => setCv({ ...cv, specialties: e.target.value })} className="input" /></label>
                  <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Pendidikan (satu per baris)</span><textarea rows={2} value={cv.education} onChange={(e) => setCv({ ...cv, education: e.target.value })} className="input" /></label>
                  <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Sertifikasi (satu per baris)</span><textarea rows={2} value={cv.certifications} onChange={(e) => setCv({ ...cv, certifications: e.target.value })} className="input" /></label>
                  <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Pengalaman (satu per baris)</span><textarea rows={2} value={cv.experience} onChange={(e) => setCv({ ...cv, experience: e.target.value })} className="input" /></label>
                  <label className="block"><span className="block text-xs font-semibold text-text-secondary mb-1">Fokus layanan</span><textarea rows={2} value={cv.focus} onChange={(e) => setCv({ ...cv, focus: e.target.value })} className="input" /></label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingId(null)} className="rounded-full">Batal</Button>
                <Button onClick={saveEdit} disabled={editSaving || !editTitle.trim()} className="rounded-full">
                  {editSaving ? <><Loader2 size={14} className="animate-spin mr-1" /> Menyimpan…</> : "Simpan"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ============ Pengguna & Role (dengan tombol Hapus untuk super_admin) ============

function UsersSection({ users, onReload }: { users: Profile[]; onReload: () => void }) {
  const { role, session } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tempPw, setTempPw] = useState<{ name: string; pw: string } | null>(null);

  async function manage(u: Profile, body: Record<string, unknown>) {
    setDeletingId(u.id);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke("manage_staff_user", { body: { user_id: u.id, ...body } });
    setDeletingId(null);
    const e = error?.message ?? (data as { error?: string })?.error;
    if (e) return setMsg(`Error: ${e}`);
    return data as { password?: string; active?: boolean };
  }
  async function resetPw(u: Profile) {
    if (!confirm(`Reset kata sandi ${u.full_name}? Kata sandi sementara baru dibuat dan wajib diganti saat login.`)) return;
    const r = await manage(u, { action: "reset_password" });
    if (r?.password) setTempPw({ name: u.full_name, pw: r.password });
  }
  async function toggleActive(u: Profile) {
    if (!confirm(`${u.is_active ? "Nonaktifkan" : "Aktifkan kembali"} akun ${u.full_name}?`)) return;
    const r = await manage(u, { action: "set_active", active: !u.is_active });
    if (r) onReload();
  }

  async function handleDelete(u: Profile) {
    if (u.id === session?.user.id) {
      setMsg("Error: tidak bisa hapus akun sendiri.");
      return;
    }
    if (!confirm(`HAPUS PERMANEN akun "${u.full_name}"?\n\nAkun auth + profile + jadwal semua terhapus. Aksi tidak bisa di-undo.`)) return;
    setDeletingId(u.id);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke("delete_staff_user", {
      body: { user_id: u.id },
    });
    setDeletingId(null);
    if (error) {
      setMsg(`Error: ${error.message}`);
      return;
    }
    if ((data as { error?: string })?.error) {
      setMsg(`Error: ${(data as { error: string }).error}`);
      return;
    }
    setMsg(`Akun ${u.full_name} berhasil dihapus.`);
    onReload();
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <h3 className="font-heading font-bold flex items-center gap-2 mb-1">
        <UserCog size={18} className="text-primary" /> Pengguna & Role
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Daftar semua akun yang punya profile. Super admin bisa hapus akun.
      </p>

      {users.length === 0 ? (
        <EmptyState title="Belum ada pengguna" icon={UserCog} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-secondary">
              <tr>
                <th className="px-4 py-2 font-medium">Nama</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {isSuperAdmin && <th className="px-4 py-2 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {u.full_name}
                    {u.id === session?.user.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-2">Anda</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{u.role.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        u.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {u.id !== session?.user.id && (
                        <>
                          <button onClick={() => resetPw(u)} disabled={deletingId === u.id} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 mr-1">
                            Reset sandi
                          </button>
                          <button onClick={() => toggleActive(u)} disabled={deletingId === u.id} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 mr-1">
                            {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id || u.id === session?.user.id}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-red/30 text-red hover:bg-red/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.id === session?.user.id ? "Tidak bisa hapus akun sendiri" : "Hapus akun"}
                      >
                        {deletingId === u.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <Trash2 size={12} /> Hapus
                          </>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tempPw && (
        <div className="mt-3 text-sm px-4 py-3 rounded-2xl border text-green-800 bg-green-50 border-green-200">
          Kata sandi sementara untuk <b>{tempPw.name}</b>: <span className="font-mono font-semibold">{tempPw.pw}</span>
          <p className="text-xs mt-1">Kirim ke yang bersangkutan; wajib diganti saat login berikutnya.</p>
        </div>
      )}
      {msg && (
        <p className={`text-xs mt-3 ${msg.startsWith("Error") ? "text-red" : "text-green-700"}`}>{msg}</p>
      )}
    </section>
  );
}
