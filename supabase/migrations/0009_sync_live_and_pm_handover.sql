-- =====================================================================
-- FlourishCare — Migration 0009
-- 1) Menyamakan repo dengan database live (kolom/objek yang dibuat manual)
-- 2) Perbaikan keamanan (RLS kebocoran data pasien, harga dihitung server, dsb.)
-- 3) Fitur serah-terima prototipe PM (Adit, 13 Nov 2026):
--    - siklus laporan draft/terbit, tarik, hapus ke Sampah 30 hari, riwayat
--    - laporan baru: Evaluasi Perkembangan (12 sesi) & Psikotes modular
--    - login orang tua (No. RM + nama depan + kode akses) + kunci 5x/15 menit
--    - tim terapis per layanan (terapis utama + pengganti)
--    - tanda tangan staf + penanggung jawab klinik
--    - pengaturan klinik (kontak WA, aturan booking, tarif visit, bank narasi, backup)
--    - pembayaran: biaya admin, transport/radius, DP 50% visit, batas 10 menit,
--      pembayaran manual (tunai/transfer)
--    - libur/cuti psikolog per tanggal
--
-- AMAN dijalankan berulang (idempotent). Jalankan di Supabase → SQL Editor
-- SETELAH 0001–0008 (+ fix_rls_recursion.sql). Satu kali Run untuk seluruh file.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 0. HELPER ROLE (security definer → bebas rekursi RLS)
-- ---------------------------------------------------------------------
-- Akun yang dinonaktifkan (profiles.is_active = false) otomatis kehilangan semua hak.
create or replace function public.current_role_val()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;
revoke all on function public.current_role_val() from public;
grant execute on function public.current_role_val() to anon, authenticated;

create or replace function public.is_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_val() = 'super_admin', false) $$;

-- "Admin" = Super Admin + Admin Operasional (role admin_cabang)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_val() in ('super_admin','admin_cabang'), false) $$;

create or replace function public.is_clinical() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_val() in ('super_admin','psikolog','terapis'), false) $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_val() in ('super_admin','admin_cabang','psikolog','terapis'), false) $$;

grant execute on function public.is_super(), public.is_admin(), public.is_clinical(), public.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. SINKRON DENGAN DATABASE LIVE (kolom yang dipakai frontend)
-- ---------------------------------------------------------------------
alter table public.psychologist_schedules add column if not exists mode text not null default 'online';
alter table public.staff_profiles add column if not exists is_bookable_online boolean not null default true;
alter table public.staff_profiles add column if not exists homecare_services text[] not null default '{}';

alter table public.online_bookings add column if not exists homecare_service text;
alter table public.online_bookings add column if not exists meeting_url text;

alter table public.development_reports add column if not exists session_number int;
alter table public.development_reports add column if not exists total_sessions int;
alter table public.development_reports add column if not exists therapist_name text;
alter table public.development_reports add column if not exists notes text;
alter table public.development_reports add column if not exists therapy_type text;

-- Profil tim (CV di halaman Tim Kami)
alter table public.staff_profiles add column if not exists role_label text;
alter table public.staff_profiles add column if not exists campus text;
alter table public.staff_profiles add column if not exists education text;
alter table public.staff_profiles add column if not exists certifications text;
alter table public.staff_profiles add column if not exists experience text;
alter table public.staff_profiles add column if not exists focus text;
alter table public.staff_profiles add column if not exists instagram text;
alter table public.staff_profiles add column if not exists employment text not null default 'tetap';

-- Akun staf: wajib ganti sandi saat login pertama
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- Pendaftaran: layanan yang dibutuhkan, WA orang tua, sumber
alter table public.patient_registrations add column if not exists requested_service text;
alter table public.patient_registrations add column if not exists contact_whatsapp text;
alter table public.patient_registrations add column if not exists source text not null default 'web';

-- ---------------------------------------------------------------------
-- 2. PENGATURAN KLINIK (key → JSON)
-- ---------------------------------------------------------------------
create table if not exists public.clinic_settings (
  key         text primary key,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id)
);
alter table public.clinic_settings enable row level security;

drop policy if exists clinic_settings_public_read on public.clinic_settings;
create policy clinic_settings_public_read on public.clinic_settings
  for select to anon, authenticated
  using (key in ('booking','contact','tarif_visit') or is_staff());

drop policy if exists clinic_settings_super_write on public.clinic_settings;
create policy clinic_settings_super_write on public.clinic_settings
  for all to authenticated using (is_super()) with check (is_super());

-- Bank Narasi psikotes: psikolog juga boleh menyunting (PM)
drop policy if exists clinic_settings_narasi_write on public.clinic_settings;
create policy clinic_settings_narasi_write on public.clinic_settings
  for update to authenticated
  using (key = 'narasi' and current_role_val() = 'psikolog')
  with check (key = 'narasi' and current_role_val() = 'psikolog');

insert into public.clinic_settings (key, value) values
  ('booking',     '{"lead":"h1","horizon_days":30,"payment_minutes":10}'),
  ('contact',     '{"wa":"6285887031855","greeting":"Halo Admin FlourishCare, saya ingin bertanya"}'),
  ('tarif_visit', '{"radius_km":10,"transport_base":50000,"per_km":5000,"dp_percent":50}'),
  ('pj',          '{"jabatan":"Penanggungjawab Klinik","nama":"dr. Amanda Ismoetia","izin":"SIP: 3-B.15a/31.75.09.1003.35.K-3/4/TM.09.74/e/2026","image_data":null}'),
  ('narasi',      '{}'),
  ('backup_log',  '[]')
on conflict (key) do nothing;

create or replace function public.setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from clinic_settings where key = p_key), '{}'::jsonb) $$;

-- ---------------------------------------------------------------------
-- 3. LIBUR / CUTI PSIKOLOG-TERAPIS PER TANGGAL
-- ---------------------------------------------------------------------
create table if not exists public.staff_time_off (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff_profiles(id) on delete cascade,
  off_date    date not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (staff_id, off_date)
);
alter table public.staff_time_off enable row level security;
drop policy if exists time_off_read on public.staff_time_off;
create policy time_off_read on public.staff_time_off for select to anon, authenticated using (true);
drop policy if exists time_off_write on public.staff_time_off;
create policy time_off_write on public.staff_time_off for all to authenticated using (is_super()) with check (is_super());

-- ---------------------------------------------------------------------
-- 4. RLS — TUTUP KEBOCORAN DATA (dulu: semua akun login bisa baca semua pasien)
-- ---------------------------------------------------------------------
-- Tim terapis per anak & layanan (terapis utama). Terapis lain dengan bidang
-- yang sama tetap boleh menulis sebagai pengganti.
create table if not exists public.child_care_team (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  service     text not null check (service in ('BT','SI','OT','TW','PSI')),
  staff_id    uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (child_id, service)
);
alter table public.child_care_team enable row level security;

create or replace function public.my_services() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct upper(s)), '{}')
  from (
    select unnest(coalesce(sp.homecare_services, '{}')) s from staff_profiles sp where sp.profile_id = auth.uid()
    union all
    select unnest(coalesce(sp.therapy_types::text[], '{}')) from staff_profiles sp where sp.profile_id = auth.uid()
    union all
    select ct.service from child_care_team ct where ct.staff_id = auth.uid()
  ) x
$$;

create or replace function public.can_access_child(p_child uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when current_role_val() in ('super_admin','admin_cabang','psikolog') then true
    when current_role_val() = 'terapis' then
      not exists (select 1 from child_care_team t where t.child_id = p_child)          -- belum ada tim: semua terapis
      or exists (select 1 from child_care_team t where t.child_id = p_child
                   and (t.staff_id = auth.uid() or t.service = any (my_services())))   -- utama / pengganti bidang sama
    else false end
$$;

create or replace function public.is_parent_of(p_child uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from children c join parents p on p.id = c.parent_id
                 where c.id = p_child and p.auth_user_id = auth.uid())
$$;
grant execute on function public.my_services(), public.can_access_child(uuid), public.is_parent_of(uuid) to authenticated;

drop policy if exists team_read on public.child_care_team;
create policy team_read on public.child_care_team for select to authenticated using (is_staff());
drop policy if exists team_write on public.child_care_team;
create policy team_write on public.child_care_team for all to authenticated using (is_admin()) with check (is_admin());

-- children
drop policy if exists internal_read_children on public.children;
drop policy if exists children_patient_read on public.children;
drop policy if exists children_read on public.children;
create policy children_read on public.children for select to authenticated
  using (can_access_child(id) or is_parent_of(id));

-- parents
drop policy if exists internal_read_parents on public.parents;
drop policy if exists parents_self_read on public.parents;
drop policy if exists parents_read on public.parents;
create policy parents_read on public.parents for select to authenticated
  using (is_staff() or auth_user_id = auth.uid());

-- bookings / sessions (tabel lama klinik)
drop policy if exists internal_read_bookings on public.bookings;
create policy internal_read_bookings on public.bookings for select to authenticated using (is_staff());
drop policy if exists internal_read_sessions on public.sessions;
create policy internal_read_sessions on public.sessions for select to authenticated using (is_staff());

-- progress_notes
drop policy if exists progress_notes_read on public.progress_notes;
create policy progress_notes_read on public.progress_notes for select to authenticated using (is_staff());

-- pendaftaran: hanya staf (pengirim tetap boleh lihat miliknya)
drop policy if exists registrations_owner_read on public.patient_registrations;
create policy registrations_owner_read on public.patient_registrations for select to authenticated
  using (submitter_user_id = auth.uid() or is_staff());
drop policy if exists registrations_admin_update on public.patient_registrations;
create policy registrations_admin_update on public.patient_registrations for update to authenticated
  using (is_admin()) with check (is_admin());

-- staff_profiles: tulis hanya Super Admin
drop policy if exists staff_profiles_super_write on public.staff_profiles;
create policy staff_profiles_super_write on public.staff_profiles for all to authenticated
  using (is_super()) with check (is_super());
drop policy if exists staff_profiles_staff_read on public.staff_profiles;
create policy staff_profiles_staff_read on public.staff_profiles for select to authenticated using (is_staff());

-- jadwal psikolog: tulis hanya Super Admin (PM: jadwal = menu Super Admin)
drop policy if exists psi_schedules_admin on public.psychologist_schedules;
create policy psi_schedules_admin on public.psychologist_schedules for all to authenticated
  using (is_super()) with check (is_super());
drop policy if exists psi_schedules_staff_read on public.psychologist_schedules;
create policy psi_schedules_staff_read on public.psychologist_schedules for select to authenticated using (is_staff());

-- tarif: tulis hanya Super Admin
drop policy if exists online_prices_admin on public.online_booking_prices;
create policy online_prices_admin on public.online_booking_prices for update to authenticated
  using (is_super()) with check (is_super());

-- profiles: Admin Operasional boleh melihat daftar staf (untuk kalender & filter)
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select
  using (id = auth.uid() or is_staff());

create or replace function public.mark_password_changed() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid() $$;
grant execute on function public.mark_password_changed() to authenticated;

-- ---------------------------------------------------------------------
-- 5. BOOKING ONLINE — harga dihitung server, batas bayar, DP visit
-- ---------------------------------------------------------------------
alter table public.online_bookings add column if not exists child_id uuid references children(id) on delete set null;
alter table public.online_bookings add column if not exists service_fee numeric(12,2);
alter table public.online_bookings add column if not exists admin_fee numeric(12,2) not null default 0;
alter table public.online_bookings add column if not exists transport_fee numeric(12,2) not null default 0;
alter table public.online_bookings add column if not exists distance_km numeric(6,1);
alter table public.online_bookings add column if not exists dp_percent int;
alter table public.online_bookings add column if not exists total_paid numeric(12,2) not null default 0;
alter table public.online_bookings add column if not exists payment_expires_at timestamptz;
alter table public.online_bookings add column if not exists policy_accepted_at timestamptz;
alter table public.online_bookings add column if not exists admin_notes text;
alter table public.online_bookings add column if not exists history jsonb not null default '[]';

alter table public.online_payments add column if not exists note text;
alter table public.online_payments add column if not exists recorded_by uuid references profiles(id);

-- Slot tersedia: zona waktu WIB, cek bentrok lintas mode (online+homecare),
-- libur per tanggal, batas 30 hari, aturan "paling cepat booking", dan
-- booking yang belum dibayar melewati batas waktu dianggap kosong lagi.
drop function if exists public.online_available_slots(uuid, date);
drop function if exists public.online_available_slots(uuid, date, text);
do $$ begin
  execute 'drop function if exists public.online_available_slots(uuid, date, online_booking_mode)';
exception when others then null; end $$;

create or replace function public.online_available_slots(p_staff_id uuid, p_date date, p_mode text default 'online')
returns table(slot_time time, is_available boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_set jsonb := setting('booking');
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_horizon int := coalesce((v_set->>'horizon_days')::int, 30);
  v_lead text := coalesce(v_set->>'lead', 'h1');
  v_min_start timestamptz;
begin
  if p_date < v_today or p_date > v_today + v_horizon then return; end if;
  if exists (select 1 from staff_time_off o where o.staff_id = p_staff_id and o.off_date = p_date) then return; end if;

  v_min_start := case v_lead
    when 'today' then now() + interval '1 hour'
    when 'h2' then ((v_today + 2)::timestamp at time zone 'Asia/Jakarta')
    when 'h3' then ((v_today + 3)::timestamp at time zone 'Asia/Jakarta')
    else ((v_today + 1)::timestamp at time zone 'Asia/Jakarta') end;

  return query
  with slots as (
    select distinct
      (s.start_time + (interval '1 minute' * s.session_duration_min * gs.n))::time as t,
      s.session_duration_min as dur
    from psychologist_schedules s
    cross join generate_series(0, 23) as gs(n)
    where s.staff_id = p_staff_id
      and s.day_of_week = extract(dow from p_date)
      and s.is_active
      and coalesce(s.mode::text, 'online') = coalesce(p_mode, 'online')
      -- hitung dalam menit (aritmetika tipe time berputar lewat tengah malam)
      and (extract(epoch from s.start_time) / 60 + s.session_duration_min * (gs.n + 1)) <= extract(epoch from s.end_time) / 60
  )
  select sl.t,
    ((p_date + sl.t) at time zone 'Asia/Jakarta') >= v_min_start
    and not exists (
      select 1 from online_bookings b
      where b.psychologist_id = p_staff_id
        and b.status not in ('cancelled','expired')
        and not (b.status = 'pending_payment' and b.payment_expires_at is not null and b.payment_expires_at < now())
        and b.scheduled_at < ((p_date + sl.t) at time zone 'Asia/Jakarta') + (sl.dur * interval '1 minute')
        and b.scheduled_at + (b.duration_min * interval '1 minute') > ((p_date + sl.t) at time zone 'Asia/Jakarta')
    )
  from slots sl
  order by sl.t;
end $$;
revoke all on function public.online_available_slots(uuid, date, text) from public;
grant execute on function public.online_available_slots(uuid, date, text) to anon, authenticated;

-- Harga per booking (dipakai trigger + bisa dipanggil frontend untuk pratinjau)
create or replace function public.booking_quote(p_mode text, p_homecare_service text, p_distance_km numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_t jsonb := setting('tarif_visit');
  v_service numeric; v_admin numeric; v_transport numeric := 0; v_dp int := null;
begin
  if p_mode = 'homecare' then
    select price into v_service from online_booking_prices where mode::text = 'homecare_' || lower(coalesce(p_homecare_service,''));
    if v_service is null then select price into v_service from online_booking_prices where mode::text = 'homecare'; end if;
    v_transport := coalesce((v_t->>'transport_base')::numeric, 0)
      + greatest(0, ceil(coalesce(p_distance_km, 0) - coalesce((v_t->>'radius_km')::numeric, 10)))
        * coalesce((v_t->>'per_km')::numeric, 0);
    v_dp := coalesce((v_t->>'dp_percent')::int, 50);
  else
    select price into v_service from online_booking_prices where mode::text = 'online';
  end if;
  select price into v_admin from online_booking_prices where mode::text = 'admin_fee';
  v_service := coalesce(v_service, 0); v_admin := coalesce(v_admin, 0);
  return jsonb_build_object(
    'service_fee', v_service, 'admin_fee', v_admin, 'transport_fee', v_transport,
    'total', v_service + v_admin + v_transport, 'dp_percent', v_dp,
    'due_now', case when v_dp is null then v_service + v_admin + v_transport
                    else round((v_service + v_admin + v_transport) * v_dp / 100.0) end,
    'radius_km', coalesce((v_t->>'radius_km')::numeric, 10),
    'outside_radius', coalesce(p_distance_km, 0) > coalesce((v_t->>'radius_km')::numeric, 10));
end $$;
grant execute on function public.booking_quote(text, text, numeric) to anon, authenticated;

create or replace function public.online_booking_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local timestamp; v_q jsonb; v_set jsonb := setting('booking');
  v_c record;
begin
  if tg_op = 'INSERT' then
    -- Admin boleh membuat booking manual (mis. pasien datang langsung); validasi slot tetap jalan.
    if not is_admin() then
      new.user_id := auth.uid();
    end if;
    new.status := 'pending_payment';
    new.total_paid := 0;
    new.history := jsonb_build_array(jsonb_build_object('at', now(), 'event', 'dibuat'));

    v_local := new.scheduled_at at time zone 'Asia/Jakarta';
    if not exists (
      select 1 from online_available_slots(new.psychologist_id, v_local::date, new.mode::text) s
      where s.slot_time = v_local::time and s.is_available
    ) then
      raise exception 'Jadwal % pukul % sudah tidak tersedia. Silakan pilih jam lain.',
        to_char(v_local, 'DD/MM/YYYY'), to_char(v_local, 'HH24:MI');
    end if;

    -- Pasien lama: data anak & orang tua diambil dari rekam medis (bukan dari input pengunjung)
    if new.child_id is not null then
      select c.full_name, c.dob, c.gender, p.full_name as parent_name, p.whatsapp, p.email
        into v_c
        from children c left join parents p on p.id = c.parent_id
       where c.id = new.child_id;
      if found then
        new.child_name := v_c.full_name;
        new.child_dob := v_c.dob;
        new.child_gender := v_c.gender;
        new.parent_name := coalesce(nullif(new.parent_name, ''), v_c.parent_name, 'Orang tua');
        new.parent_whatsapp := coalesce(nullif(new.parent_whatsapp, ''), v_c.whatsapp, '');
        new.parent_email := coalesce(nullif(new.parent_email, ''), v_c.email::text, '');
      else
        new.child_id := null;
      end if;
    end if;

    v_q := booking_quote(new.mode::text, new.homecare_service, new.distance_km);
    new.service_fee := (v_q->>'service_fee')::numeric;
    new.admin_fee := (v_q->>'admin_fee')::numeric;
    new.transport_fee := (v_q->>'transport_fee')::numeric;
    new.amount := (v_q->>'total')::numeric;
    new.dp_percent := (v_q->>'dp_percent')::int;
    new.payment_type := case when new.mode::text = 'homecare' then 'dp_50' else 'full' end;
    new.payment_expires_at := case when new.mode::text = 'online'
      then now() + make_interval(mins => coalesce((v_set->>'payment_minutes')::int, 10)) else null end;
    return new;
  end if;

  -- UPDATE: hanya admin yang boleh mengubah nominal / jadwal (RLS sudah membatasi),
  -- reschedule dicatat di riwayat.
  if new.scheduled_at is distinct from old.scheduled_at then
    new.history := coalesce(old.history, '[]') || jsonb_build_array(jsonb_build_object(
      'at', now(), 'by', (select full_name from profiles where id = auth.uid()),
      'event', 'jadwal diubah', 'from', old.scheduled_at, 'to', new.scheduled_at));
  end if;
  if new.status is distinct from old.status then
    new.history := coalesce(new.history, '[]') || jsonb_build_array(jsonb_build_object(
      'at', now(), 'by', (select full_name from profiles where id = auth.uid()),
      'event', 'status: ' || old.status || ' → ' || new.status));
    if new.status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists t_online_booking_guard on public.online_bookings;
create trigger t_online_booking_guard before insert or update on public.online_bookings
  for each row execute function public.online_booking_guard();

-- Kebijakan RLS booking online
drop policy if exists online_bookings_insert on public.online_bookings;
create policy online_bookings_insert on public.online_bookings for insert to authenticated
  with check ((user_id = auth.uid() or is_admin()) and status = 'pending_payment');

drop policy if exists online_bookings_admin_update on public.online_bookings;
create policy online_bookings_admin_update on public.online_bookings for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists online_bookings_admin_delete on public.online_bookings;
create policy online_bookings_admin_delete on public.online_bookings for delete to authenticated using (is_admin());

-- Pembayaran: admin boleh mencatat/mengubah/menghapus (tunai/transfer)
drop policy if exists online_payments_admin_write on public.online_payments;
create policy online_payments_admin_write on public.online_payments for all to authenticated
  using (is_admin()) with check (is_admin());

-- Rekap terbayar + status booking dari tabel pembayaran
create or replace function public.recalc_booking_payment(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_b online_bookings%rowtype; v_paid numeric; v_need numeric;
begin
  select * into v_b from online_bookings where id = p_booking;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into v_paid from online_payments where booking_id = p_booking and status = 'paid';
  v_need := case when v_b.mode::text = 'homecare' then round(v_b.amount * coalesce(v_b.dp_percent, 50) / 100.0) else v_b.amount end;
  update online_bookings
     set total_paid = v_paid,
         status = case when status in ('pending_payment','expired') and v_paid >= v_need and v_need > 0
                       then 'awaiting_confirmation'::online_booking_status else status end
   where id = p_booking;
end $$;

create or replace function public.online_payment_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform recalc_booking_payment(coalesce(new.booking_id, old.booking_id));
  return null;
end $$;

drop trigger if exists t_online_payment_sync on public.online_payments;
drop trigger if exists t_online_payment_recalc on public.online_payments;
create trigger t_online_payment_recalc after insert or update or delete on public.online_payments
  for each row execute function public.online_payment_after_change();

-- Kedaluwarsa otomatis
create or replace function public.expire_unpaid_bookings() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update online_bookings set status = 'expired'
   where status = 'pending_payment'
     and ((mode::text = 'online' and payment_expires_at is not null and payment_expires_at < now())
       or (mode::text = 'homecare' and (scheduled_at at time zone 'Asia/Jakarta')::date <= (now() at time zone 'Asia/Jakarta')::date));
  get diagnostics n = row_count;
  update online_payments op set status = 'expired'
    from online_bookings b
   where b.id = op.booking_id and b.status = 'expired' and op.status = 'pending';
  return n;
end $$;
grant execute on function public.expire_unpaid_bookings() to anon, authenticated;

-- Pasien lama: cocokkan No. RM + nama depan (dibatasi 5 percobaan / 15 menit)
create table if not exists public.parent_login_attempts (
  rm            text primary key,
  failures      int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.parent_login_attempts enable row level security;

create or replace function public.fc_first_name(p text) returns text
language sql immutable as $$ select lower(split_part(regexp_replace(trim(coalesce(p,'')), '\s+', ' ', 'g'), ' ', 1)) $$;

create or replace function public.fc_register_failure(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_f int;
begin
  insert into parent_login_attempts (rm, failures, updated_at) values (p_key, 1, now())
  on conflict (rm) do update set failures = parent_login_attempts.failures + 1, updated_at = now()
  returning failures into v_f;
  if v_f >= 5 then
    update parent_login_attempts set failures = 0, locked_until = now() + interval '15 minutes' where rm = p_key;
    return jsonb_build_object('ok', false, 'error', 'locked', 'until', now() + interval '15 minutes');
  end if;
  return jsonb_build_object('ok', false, 'error', 'invalid', 'remaining', 5 - v_f);
end $$;

create or replace function public.booking_find_patient(p_rm text, p_first_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_key text := 'BOOK:' || upper(trim(p_rm)); v_lock timestamptz; v_child uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select locked_until into v_lock from parent_login_attempts where rm = v_key;
  if v_lock is not null and v_lock > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'until', v_lock);
  end if;
  select c.id into v_child from children c
   where upper(c.rm_number) = upper(trim(p_rm)) and c.deleted_at is null
     and (fc_first_name(c.full_name) = fc_first_name(p_first_name)
          or fc_first_name(c.nickname) = fc_first_name(p_first_name));
  if v_child is null then return fc_register_failure(v_key); end if;
  delete from parent_login_attempts where rm = v_key;
  return jsonb_build_object('ok', true, 'child_id', v_child);
end $$;
grant execute on function public.booking_find_patient(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. SIKLUS LAPORAN (draft/terbit, tarik, Sampah 30 hari, riwayat)
-- ---------------------------------------------------------------------
create table if not exists public.evaluation_reports (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  author_id     uuid not null references profiles(id),
  service       text not null check (service in ('BT','SI','OT','TW')),
  report_date   date not null default current_date,
  period        int not null default 1,
  payload       jsonb not null default '{}',
  home_program  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists eval_child_idx on public.evaluation_reports(child_id, service, period);

create table if not exists public.psychotest_reports (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  author_id     uuid not null references profiles(id),
  report_date   date not null default current_date,
  package       text not null default 'iq' check (package in ('iq','kesiapan','custom')),
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists pt_child_idx on public.psychotest_reports(child_id, report_date desc);

alter table public.evaluation_reports enable row level security;
alter table public.psychotest_reports enable row level security;

-- FRM-006 Konsultasi: identitas alamat; kolom lain sudah ada di 0008
alter table public.reexamination_reports add column if not exists service text default 'PSI';

-- Kolom siklus yang sama untuk kelima tabel laporan
do $$
declare t text;
begin
  foreach t in array array['medical_examinations','development_reports','reexamination_reports','evaluation_reports','psychotest_reports'] loop
    execute format('alter table public.%I add column if not exists status text', t);
    -- laporan lama yang sudah ada dianggap sudah terbit (sebelumnya tampil apa adanya)
    execute format('update public.%I set status = ''terbit'' where status is null', t);
    execute format('alter table public.%I alter column status set default ''draft''', t);
    execute format('alter table public.%I alter column status set not null', t);
    begin
      execute format('alter table public.%I add constraint %I check (status in (''draft'',''terbit''))', t, t || '_status_chk');
    exception when duplicate_object then null; end;
    execute format('alter table public.%I add column if not exists published_at timestamptz', t);
    execute format('update public.%I set published_at = coalesce(published_at, created_at) where status = ''terbit''', t);
    execute format('alter table public.%I add column if not exists edited_after_publish_at timestamptz', t);
    execute format('alter table public.%I add column if not exists withdrawn_at timestamptz', t);
    execute format('alter table public.%I add column if not exists withdraw_reason text', t);
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists deleted_by uuid references profiles(id)', t);
    execute format('alter table public.%I add column if not exists delete_reason text', t);
    execute format('alter table public.%I add column if not exists history jsonb not null default ''[]''', t);
    execute format('alter table public.%I add column if not exists substitute_for uuid references profiles(id)', t);
    execute format('alter table public.%I add column if not exists booking_id uuid references online_bookings(id) on delete set null', t);
  end loop;
end $$;

create or replace function public.report_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ev text; v_reason text; v_name text;
begin
  select full_name into v_name from profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    new.history := jsonb_build_array(jsonb_build_object('at', now(), 'by', v_name, 'event', 'dibuat'));
    if new.status = 'terbit' then
      new.published_at := now();
      new.history := new.history || jsonb_build_array(jsonb_build_object('at', now(), 'by', v_name, 'event', 'diterbitkan'));
    end if;
    return new;
  end if;

  if new.deleted_at is not null and old.deleted_at is null then
    if old.status = 'terbit' and coalesce(trim(new.delete_reason), '') = '' then
      raise exception 'Alasan wajib diisi untuk menghapus laporan yang sudah terbit.';
    end if;
    v_ev := 'dihapus'; v_reason := new.delete_reason; new.deleted_by := auth.uid();
  elsif new.deleted_at is null and old.deleted_at is not null then
    v_ev := 'dipulihkan'; new.deleted_by := null; new.delete_reason := null;
  elsif old.status = 'terbit' and new.status = 'draft' then
    if coalesce(trim(new.withdraw_reason), '') = '' then
      raise exception 'Alasan wajib diisi untuk menarik laporan yang sudah terbit.';
    end if;
    v_ev := 'ditarik'; v_reason := new.withdraw_reason; new.withdrawn_at := now();
  elsif old.status = 'draft' and new.status = 'terbit' then
    v_ev := case when old.published_at is null then 'diterbitkan' else 'diterbitkan ulang' end;
    new.published_at := coalesce(old.published_at, now());
    if old.published_at is not null then new.edited_after_publish_at := now(); end if;
  elsif old.status = 'terbit' and new.status = 'terbit' then
    v_ev := 'diperbarui setelah terbit'; new.edited_after_publish_at := now();
  else
    v_ev := 'diperbarui';
  end if;
  new.history := coalesce(old.history, '[]') || jsonb_build_array(
    jsonb_build_object('at', now(), 'by', v_name, 'event', v_ev, 'reason', v_reason));
  return new;
end $$;

-- Trigger + RLS untuk kelima tabel laporan
do $$
declare
  rec record;
begin
  for rec in select * from (values
    ('medical_examinations','examiner_id'),
    ('development_reports','therapist_id'),
    ('reexamination_reports','examiner_id'),
    ('evaluation_reports','author_id'),
    ('psychotest_reports','author_id')) as x(tbl, author)
  loop
    execute format('drop trigger if exists t_report_lifecycle on public.%I', rec.tbl);
    execute format('create trigger t_report_lifecycle before insert or update on public.%I for each row execute function public.report_lifecycle()', rec.tbl);
    execute format('drop trigger if exists t_touch_%s on public.%I', rec.tbl, rec.tbl);
    execute format('create trigger t_touch_%s before update on public.%I for each row execute function public.touch_updated_at()', rec.tbl, rec.tbl);

    -- bersihkan policy lama yang terlalu longgar
    execute format('drop policy if exists exam_staff_read on public.%I', rec.tbl);
    execute format('drop policy if exists exam_psi_write on public.%I', rec.tbl);
    execute format('drop policy if exists exam_patient_read on public.%I', rec.tbl);
    execute format('drop policy if exists dev_staff_read on public.%I', rec.tbl);
    execute format('drop policy if exists dev_staff_write on public.%I', rec.tbl);
    execute format('drop policy if exists dev_patient_read on public.%I', rec.tbl);
    execute format('drop policy if exists reexam_staff_all on public.%I', rec.tbl);
    execute format('drop policy if exists reexam_parent_read on public.%I', rec.tbl);
    execute format('drop policy if exists report_read on public.%I', rec.tbl);
    execute format('drop policy if exists report_insert on public.%I', rec.tbl);
    execute format('drop policy if exists report_update on public.%I', rec.tbl);
    execute format('drop policy if exists report_delete on public.%I', rec.tbl);
    execute format('drop policy if exists report_parent_read on public.%I', rec.tbl);

    -- Baca: admin & psikolog semua; terapis sesuai tim; penulis miliknya
    execute format($p$create policy report_read on public.%I for select to authenticated
      using (is_admin() or %I = auth.uid() or (is_clinical() and can_access_child(child_id)))$p$, rec.tbl, rec.author);
    -- Tulis: penulis = diri sendiri
    execute format($p$create policy report_insert on public.%I for insert to authenticated
      with check (is_clinical() and %I = auth.uid() and can_access_child(child_id))$p$, rec.tbl, rec.author);
    -- Ubah (edit/terbit/tarik/hapus-ke-Sampah): penulis sendiri atau Super Admin
    execute format($p$create policy report_update on public.%I for update to authenticated
      using (%I = auth.uid() or is_super()) with check (%I = auth.uid() or is_super())$p$, rec.tbl, rec.author, rec.author);
    -- Hapus permanen: hanya Super Admin (dari Sampah)
    execute format($p$create policy report_delete on public.%I for delete to authenticated using (is_super())$p$, rec.tbl);
    -- Orang tua (akun portal lama): hanya laporan terbit & tidak di Sampah
    execute format($p$create policy report_parent_read on public.%I for select to authenticated
      using (status = 'terbit' and deleted_at is null and is_parent_of(child_id))$p$, rec.tbl);
  end loop;
end $$;

-- Hapus permanen otomatis dari Sampah > 30 hari
create or replace function public.purge_report_trash() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; m int; t text;
begin
  if auth.uid() is not null and not is_super() then raise exception 'Hanya Super Admin.'; end if;
  foreach t in array array['medical_examinations','development_reports','reexamination_reports','evaluation_reports','psychotest_reports'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''30 days''', t);
    get diagnostics m = row_count; n := n + m;
  end loop;
  return n;
end $$;
grant execute on function public.purge_report_trash() to authenticated;

-- ---------------------------------------------------------------------
-- 7. TANDA TANGAN STAF
-- ---------------------------------------------------------------------
create table if not exists public.staff_signatures (
  profile_id   uuid primary key references profiles(id) on delete cascade,
  display_name text,
  title        text,          -- jabatan, mis. "Psikolog" / "Terapis Wicara"
  license      text,          -- SIPP / STR / SIP
  image_data   text,          -- PNG data URL (tanda tangan)
  updated_at   timestamptz not null default now()
);
alter table public.staff_signatures enable row level security;
drop policy if exists sig_read on public.staff_signatures;
create policy sig_read on public.staff_signatures for select to authenticated using (is_staff());
drop policy if exists sig_write on public.staff_signatures;
create policy sig_write on public.staff_signatures for all to authenticated
  using (profile_id = auth.uid() or is_super()) with check (profile_id = auth.uid() or is_super());

-- ---------------------------------------------------------------------
-- 8. PORTAL ORANG TUA — No. RM + nama depan + kode akses
-- ---------------------------------------------------------------------
alter table public.children add column if not exists access_code_hash text;
alter table public.children add column if not exists access_code_set_at timestamptz;

create table if not exists public.parent_sessions (
  token_hash  text primary key,
  child_id    uuid not null references children(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
alter table public.parent_sessions enable row level security;   -- tanpa policy: hanya lewat fungsi

create or replace function public.admin_set_access_code(p_child_id uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; v_code text := ''; i int; v_rm text;
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  for i in 1..6 loop
    v_code := v_code || substr(v_chars, 1 + (get_byte(gen_random_bytes(1), 0) % length(v_chars)), 1);
  end loop;
  update children set access_code_hash = crypt(v_code, gen_salt('bf')), access_code_set_at = now()
   where id = p_child_id returning rm_number into v_rm;
  if v_rm is null then raise exception 'Pasien tidak ditemukan.'; end if;
  delete from parent_sessions where child_id = p_child_id;      -- kode lama tidak berlaku
  delete from parent_login_attempts where rm = upper(v_rm);
  return v_code;
end $$;
grant execute on function public.admin_set_access_code(uuid) to authenticated;

create or replace function public.admin_unlock_parent(p_rm text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  delete from parent_login_attempts where rm in (upper(trim(p_rm)), 'BOOK:' || upper(trim(p_rm)));
end $$;
grant execute on function public.admin_unlock_parent(text) to authenticated;

create or replace function public.admin_parent_lock_status(p_rm text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else
    (select jsonb_build_object('failures', failures, 'locked_until', locked_until)
       from parent_login_attempts where rm = upper(trim(p_rm))) end
$$;
grant execute on function public.admin_parent_lock_status(text) to authenticated;

create or replace function public.parent_login(p_rm text, p_name text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_rm text := upper(trim(coalesce(p_rm,''))); v_lock timestamptz; v_child children%rowtype; v_token text;
begin
  if v_rm = '' then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select locked_until into v_lock from parent_login_attempts where rm = v_rm;
  if v_lock is not null and v_lock > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'until', v_lock);
  end if;
  select * into v_child from children where upper(rm_number) = v_rm and deleted_at is null;
  if not found
     or v_child.access_code_hash is null
     or not (fc_first_name(v_child.full_name) = fc_first_name(p_name) or fc_first_name(v_child.nickname) = fc_first_name(p_name))
     or v_child.access_code_hash <> crypt(upper(trim(coalesce(p_code,''))), v_child.access_code_hash) then
    return fc_register_failure(v_rm);
  end if;
  delete from parent_login_attempts where rm = v_rm;
  delete from parent_sessions where expires_at < now();
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into parent_sessions (token_hash, child_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), v_child.id, now() + interval '12 hours');
  return jsonb_build_object('ok', true, 'token', v_token, 'expires_at', now() + interval '12 hours');
end $$;
grant execute on function public.parent_login(text, text, text) to anon, authenticated;

create or replace function public.parent_logout(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from parent_sessions where token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex') $$;
grant execute on function public.parent_logout(text) to anon, authenticated;

create or replace function public.parent_portal(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v_child uuid; v_out jsonb; v_hide text[] := array['history','deleted_at','deleted_by','delete_reason','withdraw_reason','withdrawn_at'];
begin
  select child_id into v_child from parent_sessions
   where token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex') and expires_at > now();
  if v_child is null then return jsonb_build_object('ok', false, 'error', 'expired'); end if;

  select jsonb_build_object(
    'ok', true,
    'child', (select jsonb_build_object('id', c.id, 'rm_number', c.rm_number, 'full_name', c.full_name, 'nickname', c.nickname,
                     'dob', c.dob, 'gender', c.gender, 'parent_name', p.full_name, 'address', p.address)
                from children c left join parents p on p.id = c.parent_id where c.id = v_child),
    'team', coalesce((select jsonb_agg(jsonb_build_object('service', t.service, 'name', pr.full_name))
                from child_care_team t join profiles pr on pr.id = t.staff_id where t.child_id = v_child), '[]'),
    'reports', coalesce((
      select jsonb_agg(r order by (r->>'report_date') desc) from (
        select (to_jsonb(x) - v_hide) || jsonb_build_object('kind','asesmen','report_date', x.examination_date, 'author_id', x.examiner_id) r
          from medical_examinations x where x.child_id = v_child and x.status = 'terbit' and x.deleted_at is null
        union all
        select (to_jsonb(x) - v_hide) || jsonb_build_object('kind','sesi','report_date', x.therapy_date, 'author_id', x.therapist_id)
          from development_reports x where x.child_id = v_child and x.status = 'terbit' and x.deleted_at is null
        union all
        select (to_jsonb(x) - v_hide) || jsonb_build_object('kind','konsultasi','report_date', x.examination_date, 'author_id', x.examiner_id)
          from reexamination_reports x where x.child_id = v_child and x.status = 'terbit' and x.deleted_at is null
        union all
        select (to_jsonb(x) - v_hide) || jsonb_build_object('kind','evaluasi')
          from evaluation_reports x where x.child_id = v_child and x.status = 'terbit' and x.deleted_at is null
        union all
        select (to_jsonb(x) - v_hide) || jsonb_build_object('kind','psikotes')
          from psychotest_reports x where x.child_id = v_child and x.status = 'terbit' and x.deleted_at is null
      ) s), '[]'),
    'authors', coalesce((
      select jsonb_object_agg(pr.id, jsonb_build_object('full_name', pr.full_name, 'role', pr.role,
               'signature', (select to_jsonb(sg) - 'updated_at' from staff_signatures sg where sg.profile_id = pr.id)))
        from profiles pr
       where pr.id in (
         select examiner_id from medical_examinations where child_id = v_child
         union select therapist_id from development_reports where child_id = v_child
         union select examiner_id from reexamination_reports where child_id = v_child
         union select author_id from evaluation_reports where child_id = v_child
         union select author_id from psychotest_reports where child_id = v_child)), '{}'),
    'pj', setting('pj')
  ) into v_out;
  return v_out;
end $$;
grant execute on function public.parent_portal(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. PERBAIKAN FUNGSI LAMA
-- ---------------------------------------------------------------------
-- next_rm_number: sebelumnya bisa dipanggil tanpa login
create or replace function public.next_rm_number() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  return 'FC-RM-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMM') || '-' || lpad(nextval('rm_number_seq')::text, 4, '0');
end $$;
revoke all on function public.next_rm_number() from public, anon;
grant execute on function public.next_rm_number() to authenticated;

-- assign_rm_to_registration: dulu cek role bisa lolos untuk anon (NULL not in ...)
create or replace function public.assign_rm_to_registration(p_registration_id uuid, p_rm_number text)
returns table(child_id uuid, parent_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_reg patient_registrations%rowtype;
  v_parent_id uuid; v_child_id uuid; v_code text;
begin
  if not is_admin() then raise exception 'Hanya Admin yang boleh memberi Nomor RM.'; end if;
  select * into v_reg from patient_registrations where id = p_registration_id;
  if not found then raise exception 'Pendaftaran tidak ditemukan'; end if;
  if v_reg.status = 'rm_assigned' then raise exception 'RM sudah diberikan'; end if;
  if coalesce(trim(p_rm_number), '') = '' then raise exception 'Nomor RM wajib diisi'; end if;
  if exists (select 1 from children c where upper(c.rm_number) = upper(trim(p_rm_number))) then
    raise exception 'Nomor RM % sudah digunakan', p_rm_number;
  end if;

  insert into parents (full_name, whatsapp, email, address, auth_user_id)
  values (
    coalesce(nullif(v_reg.mother_name, ''), nullif(v_reg.father_name, ''), 'Wali'),
    coalesce(v_reg.contact_whatsapp, ''),
    coalesce(v_reg.submitter_email::text, 'unknown@flourishcare.id'),
    coalesce(nullif(v_reg.mother_address, ''), v_reg.father_address, ''),
    v_reg.submitter_user_id)
  returning id into v_parent_id;

  insert into children (parent_id, rm_number, full_name, nickname, dob, gender, primary_condition, notes)
  values (v_parent_id, upper(trim(p_rm_number)), v_reg.patient_name, split_part(trim(v_reg.patient_name), ' ', 1),
          coalesce(v_reg.date_of_birth, current_date), v_reg.gender, v_reg.chief_complaint, v_reg.development_history)
  returning id into v_child_id;

  update patient_registrations set
    status = 'rm_assigned', rm_number = upper(trim(p_rm_number)), rm_assigned_at = now(),
    rm_assigned_by = auth.uid(), linked_child_id = v_child_id, linked_parent_id = v_parent_id
  where id = p_registration_id;

  return query select v_child_id, v_parent_id;
end $$;
grant execute on function public.assign_rm_to_registration(uuid, text) to authenticated;

-- Hapus pendaftaran: Admin Operasional & Super Admin
create or replace function public.delete_patient_registration(p_registration_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin yang boleh menghapus pendaftaran.'; end if;
  delete from patient_registrations where id = p_registration_id;
end $$;
grant execute on function public.delete_patient_registration(uuid) to authenticated;

-- Hapus pasien (konfirmasi No. RM) — admin
create or replace function public.admin_delete_patient(p_child_id uuid, p_rm_confirm text)
returns void language plpgsql security definer set search_path = public as $$
declare v_rm text; v_parent uuid;
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  select rm_number, parent_id into v_rm, v_parent from children where id = p_child_id;
  if v_rm is null then raise exception 'Pasien tidak ditemukan.'; end if;
  if upper(trim(coalesce(p_rm_confirm,''))) <> upper(v_rm) then raise exception 'No. RM konfirmasi tidak cocok.'; end if;
  update patient_registrations set linked_child_id = null, linked_parent_id = null, status = 'archived' where linked_child_id = p_child_id;
  delete from children where id = p_child_id;
  if not exists (select 1 from children where parent_id = v_parent) then
    update patient_registrations set linked_parent_id = null where linked_parent_id = v_parent;
    delete from parents where id = v_parent;
  end if;
end $$;
grant execute on function public.admin_delete_patient(uuid, text) to authenticated;

-- children: admin boleh ubah data pasien
drop policy if exists internal_write_children on public.children;
create policy internal_write_children on public.children for all to authenticated
  using (is_admin()) with check (is_admin());
drop policy if exists internal_write_parents on public.parents;
create policy internal_write_parents on public.parents for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- 10. JADWAL OTOMATIS (pg_cron, bila tersedia di project)
-- ---------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('fc_expire_unpaid_bookings', '* * * * *', 'select public.expire_unpaid_bookings()');
  perform cron.schedule('fc_purge_report_trash', '17 20 * * *', 'select public.purge_report_trash()');
exception when others then
  raise notice 'pg_cron tidak aktif (%). Aktifkan di Database → Extensions → pg_cron, lalu jalankan ulang file ini.', sqlerrm;
end $$;

notify pgrst, 'reload schema';
