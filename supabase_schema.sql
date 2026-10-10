-- =========================================================
-- GIA ĐÌNH SỐ - schema, RLS, RPCs, seed data
-- =========================================================
create extension if not exists pgcrypto;

-- ---------- TABLES ----------
create table public.families (
  id uuid primary key default gen_random_uuid(),
  family_code text not null unique check (family_code ~ '^[A-Z0-9]{6}$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete set null,
  full_name text,
  avatar_url text,
  is_premium boolean not null default false,
  usage_count integer not null default 0 check (usage_count >= 0)
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  role text not null check (role in ('grandparent','parent','youth','child')),
  avatar_emoji text not null default '🙂',
  birth_year integer check (birth_year between 1900 and 2100),
  nickname text,
  created_at timestamptz not null default now()
);

create table public.scam_warnings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity text not null check (severity in ('high','medium','low')),
  prevention_tips text not null,
  created_at timestamptz not null default now()
);

create table public.health_reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid references public.family_members(id) on delete set null,
  title text not null,
  "time" time not null,
  frequency text not null default 'daily' check (frequency in ('daily','weekly')),
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.family_members (family_id);
create index on public.health_reminders (family_id);

-- ---------- HELPERS ----------
create or replace function public.current_family_id()
returns uuid language sql stable security definer set search_path = public as $$
  select family_id from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.families         enable row level security;
alter table public.profiles         enable row level security;
alter table public.family_members   enable row level security;
alter table public.scam_warnings    enable row level security;
alter table public.health_reminders enable row level security;

create policy "families: read own"   on public.families
  for select to authenticated using (id = public.current_family_id());

create policy "profiles: read own"   on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members: family access" on public.family_members
  for all to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy "reminders: family access" on public.health_reminders
  for all to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy "scams: public read" on public.scam_warnings
  for select to anon, authenticated using (true);

-- Lock down sensitive writes (premium flag and usage are only changed by RPC / server)
revoke insert, update, delete on public.families      from anon, authenticated;
revoke insert, update, delete on public.scam_warnings from anon, authenticated;
revoke insert, update, delete on public.profiles      from anon, authenticated;
grant  update (full_name, avatar_url) on public.profiles to authenticated;

-- ---------- RPCs ----------
create or replace function public.create_family(p_name text)
returns public.families language plpgsql security definer set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_family public.families;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'name required'; end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where family_code = v_code);
  end loop;
  insert into public.families (family_code, name) values (v_code, trim(p_name)) returning * into v_family;
  insert into public.profiles (id, family_id) values (auth.uid(), v_family.id)
    on conflict (id) do update set family_id = excluded.family_id;
  return v_family;
end $$;

create or replace function public.join_family_by_code(p_code text)
returns public.families language plpgsql security definer set search_path = public as $$
declare v_family public.families;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_family from public.families where family_code = upper(trim(p_code));
  if not found then raise exception 'invalid code'; end if;
  insert into public.profiles (id, family_id) values (auth.uid(), v_family.id)
    on conflict (id) do update set family_id = excluded.family_id;
  return v_family;
end $$;

create or replace function public.leave_family()
returns void language sql security definer set search_path = public as $$
  update public.profiles set family_id = null where id = auth.uid();
$$;

create or replace function public.increment_usage()
returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  insert into public.profiles (id, usage_count) values (auth.uid(), 1)
    on conflict (id) do update set usage_count = public.profiles.usage_count + 1
    returning usage_count into v;
  return v;
end $$;

revoke all on function public.create_family(text)      from public;
revoke all on function public.join_family_by_code(text) from public;
revoke all on function public.leave_family()           from public;
revoke all on function public.increment_usage()        from public;
grant execute on function public.create_family(text)      to authenticated;
grant execute on function public.join_family_by_code(text) to authenticated;
grant execute on function public.leave_family()           to authenticated;
grant execute on function public.increment_usage()        to authenticated;

-- ---------- SEED: scam warnings ----------
insert into public.scam_warnings (title, description, severity, prevention_tips) values
('Deepfake video call',
 'Scammers use AI to copy the face and voice of a relative and ask for urgent money.',
 'high',
 'Hang up and call back on a known number. Agree on a family secret question. Never transfer money under time pressure.'),
('Fake bank notification',
 'A text says your account is locked and includes a link to steal your password and OTP.',
 'high',
 'Open the official bank app yourself. Never click links in messages. Never share OTP codes.'),
('Impersonating police or officials',
 'A caller claims you are linked to a crime and demands a transfer to a "safe account".',
 'high',
 'Authorities never handle cases by phone. Hang up and tell a relative or the local police.');

 create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_used int not null default 0,
  paid_credits int not null default 0
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  credits int not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Bật RLS và không tạo policy: chỉ server (service role) mới đọc/ghi được
alter table public.user_credits enable row level security;
alter table public.orders enable row level security;

-- Trừ 1 lượt (ưu tiên lượt miễn phí). Trả về true nếu trừ được.
create or replace function public.consume_credit(p_user uuid, p_free_limit int)
returns boolean
language plpgsql
security definer
as $$
begin
  insert into public.user_credits(user_id) values (p_user)
  on conflict (user_id) do nothing;

  update public.user_credits
     set free_used = free_used + 1
   where user_id = p_user and free_used < p_free_limit;
  if found then return true; end if;

  update public.user_credits
     set paid_credits = paid_credits - 1
   where user_id = p_user and paid_credits > 0;
  return found;
end;
$$;

-- Đánh dấu đơn đã thanh toán và cộng lượt (chạy 1 lần duy nhất cho mỗi đơn)
create or replace function public.mark_order_paid(p_code text, p_amount int)
returns boolean
language plpgsql
security definer
as $$
declare
  o public.orders;
begin
  update public.orders
     set status = 'paid', paid_at = now()
   where code = p_code and status = 'pending' and amount <= p_amount
  returning * into o;

  if o.id is null then
    return false;
  end if;

  insert into public.user_credits(user_id, paid_credits)
  values (o.user_id, o.credits)
  on conflict (user_id)
  do update set paid_credits = public.user_credits.paid_credits + o.credits;

  return true;
end;
$$;

-- Chặn client gọi trực tiếp hai hàm này
revoke execute on function public.consume_credit(uuid, int) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(text, int) from public, anon, authenticated;