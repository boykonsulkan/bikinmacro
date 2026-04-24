# Product Requirements Document
# BikinMacro — AI-Powered Excel Macro Generator

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** April 2026  
**Author:** Founder

---

## 1. Overview

### 1.1 Ringkasan Produk
BikinMacro adalah micro SaaS berbasis web yang memungkinkan pengguna — terutama non-programmer — untuk menghasilkan kode VBA (Visual Basic for Applications) siap pakai hanya dengan mendeskripsikan kebutuhan mereka dalam bahasa natural (Bahasa Indonesia atau Inggris). Output berupa macro Excel yang bisa langsung di-paste dan dijalankan tanpa pengetahuan coding.

### 1.2 Tagline
> *"Dari kalimat jadi macro. Tanpa coding."*

### 1.3 Target Market
Pengguna Excel aktif di Indonesia yang membutuhkan otomasi namun tidak memiliki latar belakang pemrograman: akuntan, staf HR, analis data, admin operasional, mahasiswa, dan UMKM.

---

## 2. Problem Statement

### 2.1 Masalah yang Diselesaikan
- Membuat macro Excel (VBA) membutuhkan pengetahuan programming yang tidak dimiliki mayoritas pengguna Excel
- Solusi yang ada (forum, YouTube, Stack Overflow) membutuhkan waktu lama dan hasilnya sering tidak sesuai kebutuhan spesifik
- Freelancer dan jasa macro Excel mahal (Rp 100k–500k per macro) dan butuh waktu
- AI generik (ChatGPT, Claude) bisa generate VBA, tapi tidak memiliki UX yang dioptimalkan untuk usecase ini

### 2.2 Proposisi Nilai
BikinMacro memberikan pengalaman **satu klik** dari deskripsi kebutuhan ke kode macro siap pakai, dengan konteks yang tepat untuk pengguna Excel Indonesia.

---

## 3. Goals & Success Metrics

### 3.1 Business Goals
| Goal | Target (3 bulan post-launch) |
|---|---|
| Registered users | 500 users |
| Paying users | 50 users (10% conversion) |
| Monthly Recurring Revenue | Rp 5.000.000 |
| Total macro generated | 2.000+ |

### 3.2 Product Metrics
| Metric | Target |
|---|---|
| Time-to-first-macro | < 2 menit sejak landing |
| Macro success rate (user tidak regenerate) | > 70% |
| User retention (kembali dalam 7 hari) | > 40% |
| Free-to-paid conversion | > 8% |

### 3.3 Non-Goals (Out of Scope untuk MVP)
- Integrasi langsung ke Excel (add-in)
- Support Google Sheets / LibreOffice
- Fitur kolaborasi tim
- Mobile app native
- Multi-bahasa selain ID/EN

---

## 4. User Personas

### Persona 1 — Rini, Staff Akuntansi (Primary)
- **Usia:** 28 tahun, Bandung
- **Tools:** Excel setiap hari, tidak bisa coding
- **Pain point:** Setiap bulan harus manual rekap laporan dari 20 sheet berbeda, makan waktu 3 jam
- **Goal:** Bisa otomatis rekap dengan satu klik
- **Willingness to pay:** Rp 50k–100k/bulan jika terbukti hemat waktu

### Persona 2 — Budi, Pemilik UMKM (Secondary)
- **Usia:** 42 tahun, Surabaya
- **Tools:** Excel untuk stok dan cashflow
- **Pain point:** Tidak ada budget hire programmer, tapi butuh laporan otomatis
- **Goal:** Macro sederhana untuk auto-kirim laporan stok via email
- **Willingness to pay:** Rp 25k sekali pakai

### Persona 3 — Dimas, Mahasiswa Teknik (Secondary)
- **Usia:** 22 tahun, Jakarta
- **Tools:** Excel untuk tugas kuliah dan internship
- **Pain point:** Dosen minta data processing yang repetitif
- **Goal:** Selesai cepat, belajar VBA sambil jalan
- **Willingness to pay:** Rp 25k–75k/bulan

---

## 5. Fitur & Halaman

### 5.1 Sitemap

```
/                   → Dashboard utama (post-login) / Landing page (guest)
/generate           → Core feature: input → generate macro
/history            → Riwayat macro (Starter & Pro)
/templates          → Macro template populer (Pro)
/pricing            → Halaman harga
/admin              → Admin dashboard (role: admin)
/auth/login         → Login
/auth/register      → Register
/settings           → Profile & billing user
```

---

### 5.2 Halaman Dashboard `/`

**Untuk Guest (belum login):**
- Hero section: Headline, subheadline, CTA "Coba Gratis Sekarang"
- Live counter: `● LIVE  X User  |  X Macro Generated`
- 3 contoh output macro (read-only preview)
- Pricing section ringkas
- Footer

**Untuk User (sudah login):**
- Header: Logo, live counter, badge plan (Free/Starter/Pro), tombol Upgrade
- Headline: *"Mau bikin macro apa hari ini?"*
- 1 CTA card besar: **Buat Macro Baru**
- Shortcut ke macro terakhir dibuat (jika ada)
- Counter personal: "Kamu sudah bikin X macro bulan ini"
- Notifikasi jika mendekati limit quota

---

### 5.3 Halaman Generate `/generate` *(Core Feature)*

**Input Section:**
- Textarea besar: *"Deskripsikan kebutuhan macro kamu..."*
  - Placeholder dengan contoh: *"Buat macro untuk otomatis filter baris yang nilainya kosong di kolom C, lalu hapus baris tersebut"*
  - Karakter counter
- Dropdown kategori (opsional):
  - Data Processing
  - Formatting & Styling
  - Automasi & Looping
  - Email & Reporting
  - Import / Export
  - Lainnya
- Tombol: **Generate Macro** (primary, disabled saat input kosong)

**Output Section (muncul setelah generate):**
- Code block dengan syntax highlighting VBA
- Action bar:
  - **Salin Kode** (primary)
  - **Download .bas** (secondary)
  - **Regenerate** (icon refresh)
  - **Refine** — textarea kecil untuk instruksi lanjutan (Pro only)
- Cara pakai: expandable section "Bagaimana cara menggunakan macro ini?" → step-by-step instruksi
- Tombol: **Buat Macro Baru**

**Quota Gate:**
- Jika user sudah habis quota, tampilkan modal upgrade dengan konteks: "Kamu sudah pakai X dari X macro bulan ini. Upgrade untuk lanjut."

---

### 5.4 Halaman History `/history` *(Starter & Pro)*

- List semua macro yang pernah dibuat oleh user
- Per item: tanggal, kategori, preview prompt (50 karakter), tombol Copy & Lihat Detail
- Search/filter by kategori dan tanggal
- Pagination (10 per halaman)
- Empty state: CTA ke `/generate`

---

### 5.5 Halaman Templates `/templates` *(Pro)*

- Grid card template macro populer:
  - Auto-filter & hapus baris kosong
  - Rekap data dari banyak sheet ke 1 sheet
  - Auto-send email dengan attachment
  - Highlight duplikat
  - Generate laporan PDF
  - Dan lainnya (10+ template)
- Klik template → langsung masuk `/generate` dengan prompt pre-filled
- Badge "Paling Populer" dan "Baru"

---

### 5.6 Halaman Pricing `/pricing`

**Toggle:** Bulanan / Tahunan (diskon 20% untuk tahunan)

| | Addon Pack | Starter | Pro |
|---|---|---|---|
| Harga | Rp 25.000 | Rp 79.000/bln | Rp 149.000/bln |
| Type | Sekali pakai | Subscription | Subscription |
| Quota macro | 5 macro | 20 macro/bln | Unlimited |
| AI Model | Standard | Premium | Premium |
| History | ✗ | ✓ | ✓ |
| Templates | ✗ | ✗ | ✓ |
| Refine macro | ✗ | ✗ | ✓ |
| Masa aktif | Tidak ada expiry | Reset tiap bulan | Reset tiap bulan |
| Highlighted | | | ✓ Paling Worth |

**CTA:**
- Addon Pack → "Beli Sekarang" (Mayar.id one-time payment)
- Starter → "Pilih Starter"
- Pro → "Pilih Pro" (warna accent/orange)

**Footer note:** Semua harga dalam Rupiah. Bisa upgrade, downgrade, atau cancel kapan saja.

---

### 5.7 Admin Dashboard `/admin` *(Role: Admin)*

Diakses hanya oleh user dengan `role = 'admin'` di tabel users. Protected via Next.js middleware.

**Overview Cards (top):**
- Total Registered Users
- Users Aktif Bulan Ini (≥1 generate)
- Total Macro Generated (all time)
- Macro Generated Hari Ini

**Grafik:**
- Line chart: New Registrations per hari (30 hari terakhir)
- Bar chart: Macro Generated per hari (30 hari terakhir)
- Pie chart: Distribusi plan (Free / Starter / Pro / Addon)

**Revenue Section:**
- MRR (Monthly Recurring Revenue) — dari Starter + Pro aktif
- Estimated ARR
- Breakdown: berapa Starter aktif, berapa Pro aktif, berapa Addon terjual bulan ini

**User Table:**
- Kolom: Email, Plan, Macro Used (bulan ini), Total Macro, Tanggal Daftar, Status
- Filter by plan dan tanggal
- Search by email
- Pagination (20 per halaman)
- Aksi per user: Lihat Detail, Manual Upgrade Plan

**Generation Log:**
- Tabel: User, Kategori, Prompt (preview), Tanggal
- Filter by kategori dan tanggal
- Berguna untuk melihat kebutuhan macro paling populer

---

## 6. Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| IDE | Google Antigravity | Agent-first, gratis Gemini + Opus |
| Frontend | Next.js 15 (App Router) | SSR, Vercel native, ekosistem kuat |
| Styling | Tailwind CSS | Utility-first, cepat untuk dark theme |
| Auth | Supabase Auth | Google OAuth + Email OTP, terintegrasi DB |
| Database | Supabase Postgres | Row Level Security, realtime, free tier OK |
| AI | Anthropic Claude API (claude-sonnet-4) | Terbaik untuk generate code/VBA |
| Payment | Mayar.id | Setup simple, support subscription + one-time, lokal |
| Hosting | Vercel | Zero-config deploy, edge functions |
| Analytics | Vercel Analytics + Supabase queries | Built-in, gratis di awal |
| Syntax HL | Shiki atau Prism.js | Syntax highlighting untuk VBA output |

---

## 7. Database Schema (Supabase)

```sql
-- Users (extend dari Supabase auth.users)
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  email         TEXT NOT NULL,
  role          TEXT DEFAULT 'user',       -- 'user' | 'admin'
  plan          TEXT DEFAULT 'free',       -- 'free' | 'addon' | 'starter' | 'pro'
  credits_used  INT DEFAULT 0,
  credits_limit INT DEFAULT 3,             -- free: 3, addon: +5, starter: 20, pro: 999
  reset_at      TIMESTAMP,                 -- kapan quota di-reset (bulanan)
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Macro Generations
CREATE TABLE public.generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id),
  prompt      TEXT NOT NULL,
  category    TEXT,
  output_vba  TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Payments / Transactions
CREATE TABLE public.payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.users(id),
  plan           TEXT NOT NULL,
  amount         INT NOT NULL,              -- dalam Rupiah
  status         TEXT DEFAULT 'pending',   -- 'pending' | 'success' | 'failed'
  mayar_ref      TEXT,                     -- reference ID dari Mayar.id
  created_at     TIMESTAMP DEFAULT NOW()
);
```

**Row Level Security:**
- `users`: user hanya bisa baca/update data sendiri; admin bisa baca semua
- `generations`: user hanya bisa baca data sendiri; admin bisa baca semua
- `payments`: user hanya bisa baca data sendiri; admin bisa baca semua

---

## 8. Monetisasi & Payment Flow

### 8.1 Provider: Mayar.id
- One-time payment (Addon Pack Rp 25k) → via Mayar Payment Link
- Subscription Starter & Pro → via Mayar Billing/Subscription
- Semua metode pembayaran lokal tersedia: QRIS, GoPay, OVO, DANA, VA Bank, Indomaret, Alfamart, Kartu Kredit, Paylater

### 8.2 Flow Upgrade
1. User klik "Upgrade" / "Pilih Pro"
2. Redirect ke Mayar checkout page
3. User bayar
4. Mayar kirim webhook ke `/api/webhooks/mayar`
5. Backend update `users.plan` dan `users.credits_limit`
6. User redirect kembali ke app dengan status baru

### 8.3 Quota Reset
- Cron job (Vercel Cron) jalan setiap tanggal 1, reset `credits_used = 0` untuk semua user Starter dan Pro

---

## 9. AI Prompt Engineering

### 9.1 System Prompt untuk Generate Macro
```
Kamu adalah expert programmer VBA untuk Microsoft Excel.
Tugasmu adalah membuat macro VBA yang bersih, efisien, dan siap pakai berdasarkan deskripsi pengguna.

Aturan output:
- Hanya output kode VBA, tanpa penjelasan di luar kode
- Gunakan komentar dalam kode (bahasa Indonesia) untuk menjelaskan setiap bagian
- Tambahkan error handling yang proper
- Kode harus bisa langsung di-paste ke Excel VBA Editor dan dijalankan
- Jangan gunakan library eksternal
- Gunakan nama variabel yang deskriptif dan mudah dipahami

Kategori: [CATEGORY]
```

### 9.2 User Prompt Template
```
Buatkan macro Excel VBA untuk kebutuhan berikut:

[USER_PROMPT]

Pastikan macro ini:
- Aman dijalankan (tidak menghapus data yang tidak disengaja)
- Punya konfirmasi sebelum aksi destruktif
- Berjalan di Excel versi 2016 ke atas
```

---

## 10. Sprint Plan

### Sprint 1 — Foundation (Minggu 1–2)
**Goal:** App bisa generate macro end-to-end

- [ ] Setup project Next.js 15 + Tailwind di Antigravity
- [ ] Connect Supabase (Auth + DB)
- [ ] Implementasi Google OAuth + Email OTP
- [ ] Halaman `/generate` — input form + call Claude API
- [ ] Output: syntax highlighting VBA + Copy button
- [ ] Download `.bas` file
- [ ] Deploy ke Vercel (staging)

### Sprint 2 — Monetisasi (Minggu 3)
**Goal:** User bisa bayar dan quota terkontrol

- [ ] Integrasi Mayar.id (payment link + webhook)
- [ ] Quota system: track `credits_used`, gate generate jika habis
- [ ] Halaman `/pricing`
- [ ] Upgrade flow (redirect → bayar → webhook → update plan)
- [ ] Cron job reset quota bulanan

### Sprint 3 — User Experience (Minggu 4)
**Goal:** Produk terasa lengkap dan polished

- [ ] Halaman `/history` (Starter + Pro)
- [ ] Halaman Dashboard post-login (`/`)
- [ ] Landing page untuk guest
- [ ] Live counter di header (Supabase realtime atau polling)
- [ ] Refine macro feature (Pro only)
- [ ] Modal upgrade dengan konteks quota

### Sprint 4 — Admin & Polish (Minggu 5)
**Goal:** Admin bisa monitor, app siap launch publik

- [ ] Halaman `/admin` — overview cards + charts
- [ ] Admin user table dengan filter & search
- [ ] Generation log table
- [ ] Revenue metrics
- [ ] Error handling & loading states di semua halaman
- [ ] SEO: meta tags, sitemap, og:image
- [ ] Halaman `/templates` (Pro) — 10+ template awal

### Sprint 5 — Launch (Minggu 6)
- [ ] QA & testing end-to-end
- [ ] Setup domain `bikinmacro.id`
- [ ] Soft launch ke komunitas (WhatsApp group, forum Excel Indonesia)
- [ ] Monitor metrics pertama

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load time | < 2 detik (LCP) |
| AI response time | < 10 detik per generate |
| Uptime | > 99% (Vercel SLA) |
| Mobile responsive | Ya, semua halaman |
| Browser support | Chrome, Firefox, Edge, Safari (2 versi terakhir) |
| Data retention | History disimpan 1 tahun untuk Starter, unlimited untuk Pro |

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Output VBA tidak akurat | User kecewa, churn | Prompt engineering yang baik, fitur Refine, feedback button |
| Biaya API Claude tinggi | Margin negatif | Cache output untuk prompt identik, rate limit per user |
| Payment webhook gagal | User tidak diupgrade | Retry mechanism + manual trigger di admin |
| Mayar.id downtime | Tidak bisa bayar | Simpan backup payment link manual |
| User abuse (spam generate) | Biaya API membengkak | Rate limiting per IP + per user, captcha untuk free tier |

---

## 13. Open Questions

1. Apakah free tier perlu captcha/verifikasi email dulu sebelum bisa generate?
2. Apakah akan ada referral program untuk early adopter?
3. Apakah template akan dibuat manual oleh founder, atau crowdsourced dari user?
4. Berapa lama periode trial untuk Starter/Pro sebelum harus bayar?

---

*Dokumen ini bersifat living document dan akan diupdate seiring perkembangan produk.*
