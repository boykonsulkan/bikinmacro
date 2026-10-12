-- Pemakaian token AI per panggilan (halaman admin /north/ai-cost dan pemutus anggaran global).
-- Jalankan sekali di Supabase SQL Editor. Hanya server (service role) yang menulis dan membaca: RLS aktif tanpa policy.
-- Yang disimpan cuma angka token dan nama model. Isi permintaan dan kode TIDAK disalin ke sini.

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  kind text not null check (kind in ('generate', 'chat')),
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0
);

create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;
