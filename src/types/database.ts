// Tipe database Supabase , versi minimum yang dipakai frontend saat ini.
// Regenerate otomatis dengan: `supabase gen types typescript --project-id <id> > src/types/database.ts`
// setelah menjalankan migration SQL di supabase/migrations/.

export type UserRole =
  | "super_admin"
  | "admin_cabang"
  | "psikolog"
  | "terapis"
  | "karyawan";

export type ServiceType =
  | "onsite"
  | "psikolog"
  | "psikolog_online"
  | "psikotes";

export type TherapyType =
  | "SI"
  | "TW"
  | "OT"
  | "BT"
  | "konsultasi"
  | "tesIQ"
  | "kesiapan"
  | "diagnosa";

export type BookingStatus =
  | "pending_payment"
  | "awaiting_confirmation"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  must_change_password?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffProfile {
  id: string;
  profile_id: string;
  title: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  specialties: string[];
  therapy_types: TherapyType[];
  str_number: string | null;
  str_expires_at: string | null;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Profil tim / CV (migrasi 0009)
  is_bookable_online?: boolean;
  homecare_services?: string[] | null;
  role_label?: string | null;
  campus?: string | null;
  education?: string | null;
  certifications?: string | null;
  experience?: string | null;
  focus?: string | null;
  instagram?: string | null;
  employment?: string | null;
}

export interface Child {
  id: string;
  parent_id: string;
  rm_number: string;
  full_name: string;
  nickname: string | null;
  dob: string;
  gender: "L" | "P";
  primary_condition: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Parent {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  whatsapp: string;
  email: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  code: string;
  child_id: string;
  parent_id: string;
  branch_id: string;
  service: ServiceType;
  therapy_type: TherapyType | null;
  package_sessions: number | null;
  therapist_id: string | null;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  booking_id: string;
  therapist_id: string;
  child_id: string;
  scheduled_at: string;
  duration_min: number;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  id: string;
  child_id: string;
  session_id: string | null;
  author_id: string;
  visibility: "restricted" | "branch";
  title: string;
  content: string;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
}

export interface ProgressNote {
  id: string;
  child_id: string;
  author_id: string;
  session_id: string | null;
  title: string;
  summary: string;
  metrics: Record<string, unknown> | null;
  is_shared: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

// Placeholder Database type untuk supabase-js generic.
// Sisipkan tipe generated dari Supabase CLI di sini kelak.
export type Database = Record<string, unknown>;
