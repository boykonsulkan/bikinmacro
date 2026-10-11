-- Pelacakan perilaku pengguna (halaman admin /north/behavior). Jalankan sekali di Supabase SQL Editor.
-- Tabel ini cuma ditulis dan dibaca server (service role): RLS aktif tanpa policy, jadi anon/authenticated tertutup.
-- Isi: nama kejadian dan properti kecil saja. Isi permintaan dan kode TIDAK disalin ke sini (sudah ada di generations).

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  name text not null,
  props jsonb not null default '{}'::jsonb
);

create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_user_created_idx on public.events (user_id, created_at desc);
create index if not exists events_name_created_idx on public.events (name, created_at desc);

alter table public.events enable row level security;
