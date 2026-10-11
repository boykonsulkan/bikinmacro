-- Log penolakan pengaman AI (permintaan di luar topik atau berbahaya).
-- Dipakai untuk menahan akun yang berulang kali memancing dan untuk dilihat admin di /north/ai-log.
-- Jalankan sekali di Supabase (SQL Editor). Aman diulang. RLS aktif TANPA policy: cuma service role (server).
-- Kalau tabel ini belum ada, pengaman lain tetap jalan; cuma penahanan akun dan halaman log yang nonaktif.

create table if not exists public.ai_rejections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  kind text not null check (kind in ('generate', 'chat')),
  reason text not null,                -- refusal, not_vba, empty, too_long, unsafe
  detail text,                         -- mis. jenis perintah berbahaya yang terdeteksi
  excerpt text                         -- 200 karakter pertama dari teks pengguna
);

create index if not exists ai_rejections_user_created_idx on public.ai_rejections (user_id, created_at desc);
create index if not exists ai_rejections_created_idx on public.ai_rejections (created_at desc);

alter table public.ai_rejections enable row level security;
