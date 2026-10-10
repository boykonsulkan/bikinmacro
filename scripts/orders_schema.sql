-- Skema pesanan (order per use case) untuk BikinMacro.
-- Jalankan sekali di Supabase: SQL Editor, tempel isi file ini, lalu Run.
-- Aman dijalankan ulang (memakai IF NOT EXISTS).
--
-- Akses data: RLS aktif TANPA policy, artinya cuma service role (server Next.js)
-- yang bisa baca dan tulis. Pembeli nggak login, aksesnya lewat token rahasia
-- yang hash-nya disimpan di access_token_hash.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                  -- kode pendek, mis. BM-7K3Q9F (bukan rahasia)
  access_token_hash text not null,            -- sha256 token rahasia di link pesanan
  email text not null,
  plan text not null check (plan in ('output_1', 'output_3', 'dibuatin')),
  midtrans_order_id text not null,            -- nomor order dari struk Midtrans
  description text not null,                  -- cerita kerjaan dari pembeli
  payment_status text not null default 'menunggu'
    check (payment_status in ('menunggu', 'terverifikasi', 'ditolak')),
  status text not null default 'menunggu_cek'
    check (status in ('menunggu_cek', 'dikerjakan', 'selesai', 'dibatalkan')),
  outputs_total int not null check (outputs_total >= 1),
  outputs_delivered int not null default 0 check (outputs_delivered >= 0),
  revisions_total int not null check (revisions_total >= 0),
  revisions_used int not null default 0 check (revisions_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Satu pembayaran cuma boleh dipakai untuk satu pesanan (nggak peduli huruf besar/kecil).
create unique index if not exists orders_midtrans_order_id_key
  on public.orders (lower(midtrans_order_id));
create index if not exists orders_email_created_idx
  on public.orders (lower(email), created_at desc);
create index if not exists orders_created_idx
  on public.orders (created_at desc);

create table if not exists public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('contoh', 'hasil')),
  name text not null,                         -- nama file yang ditampilkan (sudah dibersihkan)
  storage_path text not null,                 -- path di bucket order-files
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists order_files_order_idx on public.order_files (order_id, created_at);

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender text not null check (sender in ('pembeli', 'admin')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists order_messages_order_idx on public.order_messages (order_id, created_at);

alter table public.orders enable row level security;
alter table public.order_files enable row level security;
alter table public.order_messages enable row level security;

-- Bucket privat untuk file contoh pembeli dan file hasil.
insert into storage.buckets (id, name, public)
values ('order-files', 'order-files', false)
on conflict (id) do nothing;
