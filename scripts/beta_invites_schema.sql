-- Undangan beta tester dengan aktivasi satu klik (/aktivasi).
-- Jalankan sekali di Supabase (SQL Editor). Aman diulang.
-- RLS aktif TANPA policy: cuma service role (server Next.js) yang bisa baca dan tulis.
-- Token aktivasi TIDAK disimpan; yang disimpan cuma hash sha256-nya.

create table if not exists public.beta_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  plan text not null check (plan in ('addon', 'starter', 'pro')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'activated', 'revoked')),
  expires_at timestamptz not null,
  created_by uuid,                       -- admin yang membuat undangan
  activated_at timestamptz,
  activated_user_id uuid                 -- akun yang dibuat atau dinaikkan paketnya
);

create index if not exists beta_invites_email_idx on public.beta_invites (lower(email), created_at desc);
create index if not exists beta_invites_created_idx on public.beta_invites (created_at desc);

alter table public.beta_invites enable row level security;
