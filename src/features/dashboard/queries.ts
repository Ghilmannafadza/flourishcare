import { supabase } from "@/lib/supabase";
import type {
  Booking,
  Child,
  LeaveRequest,
  MedicalRecord,
  ProgressNote,
  SessionRow,
  StaffProfile,
} from "@/types/database";

export async function fetchDashboardKpis(_branchId: string | null) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  // Sumber data nyata: booking online/homecare (online_bookings + online_payments)
  const [patientsCount, sessionsToday, paymentsMonth] = await Promise.all([
    supabase.from("children").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("online_bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["confirmed", "awaiting_confirmation", "completed"])
      .gte("scheduled_at", startOfDayIso(today))
      .lt("scheduled_at", endOfDayIso(today)),
    supabase.from("online_payments").select("amount").eq("status", "paid").gte("paid_at", startOfMonth),
  ]);

  const revenue = (paymentsMonth.data ?? []).reduce(
    (sum, row) => sum + Number((row as { amount: number }).amount ?? 0),
    0
  );

  return {
    patients: patientsCount.count ?? 0,
    sessionsToday: sessionsToday.count ?? 0,
    revenueThisMonth: revenue,
  };
}

export async function fetchRecentBookings(limit = 20) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export type UpcomingSession = SessionRow & { code?: string; child_name?: string; mode?: string };

/** Jadwal terdekat dari booking online/homecare yang aktif. */
export async function fetchUpcomingSessions(_staffProfileId?: string, limit = 20) {
  const { data, error } = await supabase
    .from("online_bookings")
    .select("id, code, child_name, mode, scheduled_at, duration_min, status, psychologist_id")
    .gte("scheduled_at", new Date().toISOString())
    .in("status", ["confirmed", "awaiting_confirmation"])
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as UpcomingSession[];
}

/**
 * fetchChildren = SEMUA anak (termasuk yang belum punya RM, contoh: dari booking online).
 * Dipakai untuk melihat semua data anak yang pernah masuk sistem (admin cabang).
 */
export async function fetchChildren(limit = 100) {
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Child[];
}

/**
 * fetchAssessedChildren = HANYA anak yang sudah mengisi form pendaftaran (assessment)
 * dan sudah diberi Nomor RM oleh admin. Ini yang jadi "pasien resmi" klinik.
 * Dipakai oleh dashboard psikolog & terapis (Pemeriksaan, Laporan Perkembangan, Rekam Medis).
 */
export async function fetchAssessedChildren(limit = 500) {
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .is("deleted_at", null)
    .not("rm_number", "is", null)
    .order("full_name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Child[];
}

export async function fetchMedicalRecords(childId: string) {
  const { data, error } = await supabase
    .from("medical_records")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MedicalRecord[];
}

export async function fetchProgressNotes(childId: string) {
  const { data, error } = await supabase
    .from("progress_notes")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProgressNote[];
}

export async function fetchLeaveRequests(status?: string) {
  let q = supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeaveRequest[];
}

export async function fetchStaffProfiles() {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StaffProfile[];
}

function startOfDayIso(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s.toISOString();
}
function endOfDayIso(d: Date) {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e.toISOString();
}

export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
