-- Log pengiriman email dari halaman admin (/north/email).
-- Jalankan sekali di Supabase: SQL Editor, tempel isi file ini, lalu Run. Aman diulang.
-- RLS aktif TANPA policy: cuma service role (server Next.js) yang bisa baca dan tulis.

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  to_email text not null,
  subject text not null,
  template text not null,                 -- beta_invite, free, atau test
  status text not null check (status in ('terkirim', 'gagal')),
  provider_id text,                       -- id email dari Resend
  error text,                             -- alasan gagal (tanpa data rahasia)
  sent_by uuid                            -- id admin yang menekan tombol kirim
);

create index if not exists email_logs_created_idx on public.email_logs (created_at desc);
create index if not exists email_logs_to_idx on public.email_logs (lower(to_email), created_at desc);

alter table public.email_logs enable row level security;
