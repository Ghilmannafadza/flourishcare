import { useEffect, useState } from "react";
import { Video, Home, Phone, Loader2, Link2, Check, X, Pencil, ExternalLink, CalendarClock, Trash2, Search } from "lucide-react";
import { BookingMoneyPanel, RescheduleModal, type BookingMoney, type PaymentRow } from "./BookingAdminPanels";
import { supabase } from "@/lib/supabase";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";
import { formatRupiah } from "@/features/dashboard/queries";
import { waLink, formatWaDisplay } from "@/lib/wa";
import { useAuth } from "@/providers/AuthProvider";

type Row = {
  id: string;
  code: string;
  parent_name: string;
  parent_whatsapp: string;
  child_name: string;
  child_dob: string;
  mode: "online" | "homecare";
  psychologist_id: string;
  scheduled_at: string;
  amount: number;
  status: string;
  consultation_topic: string;
  homecare_address: string | null;
  homecare_service: "bt" | "si" | "ot" | "tw" | null;
  meeting_url: string | null;
  created_at: string;
  psychologist_name?: string | null;
} & BookingMoney;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending_payment: { text: "Menunggu Bayar", cls: "bg-yellow/10 text-yellow-700" },
  awaiting_confirmation: { text: "Menunggu Konfirmasi", cls: "bg-secondary/10 text-secondary" },
  confirmed: { text: "Dikonfirmasi", cls: "bg-green-100 text-green-700" },
  completed: { text: "Selesai", cls: "bg-primary/10 text-primary" },
  cancelled: { text: "Batal", cls: "bg-red/10 text-red" },
  expired: { text: "Kadaluarsa", cls: "bg-gray-100 text-gray-600" },
};

export function OnlineBookingsView() {
  const { role } = useAuth();
  const canEditLink = role === "super_admin" || role === "admin_cabang";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<string>("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [staff, setStaff] = useState<Array<{ id: string; title: string }>>([]);
  const [resched, setResched] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    // Booking online yang lewat batas bayar 10 menit otomatis kedaluwarsa
    await supabase.rpc("expire_unpaid_bookings");
    const { data } = await supabase
      .from("online_bookings")
      .select("*, staff_profiles!online_bookings_psychologist_id_fkey(title)")
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []).map((r: Record<string, unknown>) => {
      const sp = r.staff_profiles as { title?: string } | null;
      return { ...r, psychologist_name: sp?.title ?? null };
    });
    setRows(rows as Row[]);
    const ids = (rows as Row[]).map((r) => r.id);
    const [pay, st] = await Promise.all([
      ids.length ? supabase.from("online_payments").select("*").in("booking_id", ids).order("created_at") : Promise.resolve({ data: [] }),
      supabase.from("staff_profiles").select("id,title").order("display_order"),
    ]);
    setPayments((pay.data as PaymentRow[]) ?? []);
    setStaff((st.data as Array<{ id: string; title: string }>) ?? []);
    setLoading(false);
  }

  async function complete(id: string) {
    setUpdating(id);
    await supabase.from("online_bookings").update({ status: "completed" }).eq("id", id);
    setUpdating(null);
    void load();
  }

  async function remove(b: Row) {
    if (!confirm(`Hapus booking ${b.code} (${b.child_name})? Riwayat pembayarannya ikut terhapus. Tidak bisa dibatalkan.`)) return;
    setUpdating(b.id);
    const { error } = await supabase.from("online_bookings").delete().eq("id", b.id);
    setUpdating(null);
    if (error) alert("Gagal hapus: " + error.message);
    void load();
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirm(id: string) {
    setUpdating(id);
    await supabase.from("online_bookings").update({ status: "confirmed" }).eq("id", id);
    setUpdating(null);
    void load();
  }

  async function cancel(id: string) {
    if (!confirm("Batalkan booking ini?")) return;
    setUpdating(id);
    await supabase
      .from("online_bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    setUpdating(null);
    void load();
  }

  function openEditLink(b: Row) {
    setLinkDraft(b.meeting_url ?? "");
    setLinkErr(null);
    setEditingLinkId(b.id);
  }

  async function saveMeetingLink(id: string) {
    setLinkErr(null);
    const trimmed = linkDraft.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setLinkErr("Link harus dimulai dengan http:// atau https://");
      return;
    }
    setLinkSaving(true);
    const { error } = await supabase
      .from("online_bookings")
      .update({ meeting_url: trimmed || null })
      .eq("id", id);
    setLinkSaving(false);
    if (error) {
      setLinkErr(error.message);
      return;
    }
    setEditingLinkId(null);
    void load();
  }

  if (loading) return <LoadingBlock />;
  if (rows.length === 0)
    return (
      <EmptyState
        title="Belum ada booking online"
        description="Booking dari subdomain book.flourishcare.id akan tampil di sini."
        icon={Video}
      />
    );

  const visibleRows = rows.filter((b) => {
    if (statusFilter === "active" && ["cancelled", "expired", "completed"].includes(b.status)) return false;
    if (statusFilter !== "active" && statusFilter !== "all" && b.status !== statusFilter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return [b.code, b.child_name, b.parent_name, b.parent_whatsapp].some((x) => String(x ?? "").toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode, anak, orang tua, WA" className="input pl-8" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input max-w-[220px]">
          <option value="active">Aktif (belum selesai)</option>
          <option value="all">Semua</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.text}</option>)}
        </select>
      </div>
      {visibleRows.map((b) => {
        const st = STATUS_LABEL[b.status] ?? { text: b.status, cls: "bg-gray-100 text-gray-600" };
        const isPaid = ["confirmed", "awaiting_confirmation", "completed"].includes(b.status);
        return (
          <div key={b.id} className="bg-white rounded-3xl border border-black/5 p-5 shadow-warm-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs text-text-secondary">{b.code}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.cls}`}>{st.text}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium inline-flex items-center gap-1">
                    {b.mode === "homecare" ? <Home size={11} /> : <Video size={11} />}
                    {b.mode === "homecare"
                      ? `Homecare${b.homecare_service ? ` ${b.homecare_service.toUpperCase()}` : ""}`
                      : "Online"}
                  </span>
                </div>
                <p className="font-semibold text-base">{b.child_name}</p>
                <p className="text-xs text-text-secondary">
                  Orang tua: {b.parent_name} · {b.consultation_topic.replace(/_/g, " ")}
                </p>
                {b.psychologist_name && (
                  <p className="text-xs text-primary mt-0.5 font-medium">
                    Psikolog: {b.psychologist_name}
                  </p>
                )}
              </div>
              <p className="font-heading font-bold text-primary text-lg whitespace-nowrap">
                {formatRupiah(Number(b.amount))}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-text-secondary bg-background rounded-2xl p-3">
              <div>
                <p className="uppercase tracking-wider text-[10px]">Jadwal</p>
                <p className="font-semibold text-text-primary">
                  {new Date(b.scheduled_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                </p>
                <p>{new Date(b.scheduled_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[10px]">WhatsApp</p>
                <a
                  href={waLink(
                    b.parent_whatsapp,
                    `Halo ${b.parent_name}, ini admin FlourishCare. Kami ingin mengonfirmasi booking Anda (${b.code}).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  title="Klik untuk chat via WhatsApp Web/App"
                >
                  <Phone size={11} /> {formatWaDisplay(b.parent_whatsapp)}
                </a>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[10px]">DOB Anak</p>
                <p className="font-semibold text-text-primary">
                  {new Date(b.child_dob).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[10px]">Dibuat</p>
                <p className="font-semibold text-text-primary">
                  {new Date(b.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                </p>
              </div>
            </div>

            {b.mode === "homecare" && b.homecare_address && (
              <p className="text-xs text-text-secondary mt-3">
                <span className="font-semibold text-text-primary">Alamat:</span> {b.homecare_address}
              </p>
            )}

            {/* Meeting link section — hanya untuk mode online & booking sudah dibayar */}
            {b.mode === "online" && isPaid && (
              <div className="mt-3 pt-3 border-t border-black/5">
                {editingLinkId === b.id ? (
                  <div className="bg-primary/5 rounded-2xl p-3 border border-primary/20">
                    <label className="block text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                      <Link2 size={12} /> Link Konsultasi Online (Zoom / Google Meet / dll)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={linkDraft}
                        onChange={(e) => setLinkDraft(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxx-xxx"
                        className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveMeetingLink(b.id)}
                          disabled={linkSaving}
                          className="text-xs px-3 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1"
                        >
                          {linkSaving ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                          Simpan
                        </button>
                        <button
                          onClick={() => setEditingLinkId(null)}
                          className="text-xs px-3 py-2 rounded-full border border-black/10 hover:bg-black/5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    {linkErr && <p className="text-xs text-red mt-1">{linkErr}</p>}
                    <p className="text-[11px] text-text-secondary mt-1.5">
                      Contoh: link Google Meet, Zoom, WhatsApp Video, Microsoft Teams. Psikolog akan melihat link ini di dashboard mereka.
                    </p>
                  </div>
                ) : b.meeting_url ? (
                  <div className="flex items-center justify-between gap-3 bg-green-50 rounded-2xl p-3 border border-green-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 size={16} className="text-green-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-green-700 font-semibold">Link Konsultasi</p>
                        <a
                          href={b.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline font-medium truncate block"
                          title={b.meeting_url}
                        >
                          {b.meeting_url}
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={b.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> Buka
                      </a>
                      {canEditLink && (
                        <button
                          onClick={() => openEditLink(b)}
                          className="text-xs px-3 py-2 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1"
                          title="Ubah link"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : canEditLink ? (
                  <button
                    onClick={() => openEditLink(b)}
                    className="w-full text-left bg-yellow-50 hover:bg-yellow-100 rounded-2xl p-3 border border-yellow-200 border-dashed flex items-center gap-2 text-sm text-yellow-800 font-medium transition-colors"
                  >
                    <Link2 size={16} /> Belum ada link konsultasi. Klik untuk tambahkan link Zoom/Meet.
                  </button>
                ) : (
                  <div className="bg-yellow-50 rounded-2xl p-3 border border-yellow-200 text-xs text-yellow-800 flex items-center gap-2">
                    <Link2 size={14} /> Menunggu admin memasukkan link konsultasi online.
                  </div>
                )}
              </div>
            )}

            {canEditLink && <BookingMoneyPanel b={b} payments={payments.filter((p) => p.booking_id === b.id)} canEdit={canEditLink} onChanged={load} />}

            {canEditLink && (
              <div className="flex flex-wrap gap-2 mt-3">
                {!["cancelled", "expired", "completed"].includes(b.status) && (
                  <button onClick={() => setResched(b)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1">
                    <CalendarClock size={12} /> Ubah jadwal
                  </button>
                )}
                {b.status === "confirmed" && (
                  <button onClick={() => complete(b.id)} disabled={updating === b.id} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5">
                    Tandai selesai
                  </button>
                )}
                <button onClick={() => remove(b)} disabled={updating === b.id} className="text-xs px-3 py-1.5 rounded-full border border-red/30 text-red hover:bg-red/10 inline-flex items-center gap-1">
                  <Trash2 size={12} /> Hapus booking
                </button>
              </div>
            )}

            {b.status === "awaiting_confirmation" && canEditLink && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-black/5">
                <button
                  onClick={() => confirm(b.id)}
                  disabled={updating === b.id}
                  className="text-xs px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1"
                >
                  {updating === b.id ? <Loader2 className="animate-spin" size={12} /> : null}
                  Konfirmasi
                </button>
                <button
                  onClick={() => cancel(b.id)}
                  disabled={updating === b.id}
                  className="text-xs px-4 py-2 rounded-full border-2 border-red text-red font-semibold hover:bg-red/10 disabled:opacity-50"
                >
                  Batalkan
                </button>
              </div>
            )}
          </div>
        );
      })}
      {visibleRows.length === 0 && <p className="text-sm text-text-secondary text-center py-8">Tidak ada booking pada filter ini.</p>}
      {resched && (
        <RescheduleModal
          b={resched}
          staff={staff}
          onClose={() => setResched(null)}
          onSaved={() => {
            setResched(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
