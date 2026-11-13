-- Seed admin & staff — jalankan SETELAH akun dibuat di Supabase Auth.
--
-- CARA:
-- 1. Supabase Dashboard → Authentication → Users → "Add user" → "Create new user"
--    a) adit@flourishcare.id  | password: (buat sandi kuat, jangan ditulis di repo) | Auto confirm: ON
--    b) achla@flourishcare.id | password: (buat sandi kuat, jangan ditulis di repo) | Auto confirm: ON
--
-- 2. Buka SQL Editor lalu jalankan script ini apa adanya.
--    Script akan otomatis mencocokkan email → auth.users.id, membuat baris
--    profiles, dan menghubungkan staff_profiles Achla ke akun-nya.

do $$
declare
  v_branch_id uuid := '00000000-0000-0000-0000-000000000001';
  v_adit_id   uuid;
  v_achla_id  uuid;
begin
  -- Ambil user id berdasarkan email
  select id into v_adit_id  from auth.users where lower(email) = lower('adit@flourishcare.id');
  select id into v_achla_id from auth.users where lower(email) = lower('achla@flourishcare.id');

  if v_adit_id is null then
    raise exception 'User adit@flourishcare.id belum ada di auth.users. Buat dulu via Dashboard → Authentication.';
  end if;
  if v_achla_id is null then
    raise exception 'User achla@flourishcare.id belum ada di auth.users. Buat dulu via Dashboard → Authentication.';
  end if;

  -- Profil Adit = Super Admin
  insert into profiles (id, full_name, role, branch_id, is_active)
  values (v_adit_id, 'Adit', 'super_admin', v_branch_id, true)
  on conflict (id) do update
     set full_name = excluded.full_name,
         role      = excluded.role,
         branch_id = excluded.branch_id,
         is_active = true;

  -- Profil Achla = Psikolog
  insert into profiles (id, full_name, role, branch_id, is_active)
  values (v_achla_id, 'Achla', 'psikolog', v_branch_id, true)
  on conflict (id) do update
     set full_name = excluded.full_name,
         role      = excluded.role,
         branch_id = excluded.branch_id,
         is_active = true;

  -- Hubungkan staff_profiles Achla ke akun-nya (agar tetap muncul di halaman Team)
  update staff_profiles
     set profile_id = v_achla_id
   where id = '00000000-0000-0000-0000-000000001001';

  raise notice 'OK: Adit (super_admin) & Achla (psikolog) terpasang di cabang %', v_branch_id;
end $$;
