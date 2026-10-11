# Undangan beta dengan aktivasi satu klik

Penerima undangan nggak perlu mengisi form daftar. Mereka klik **Aktifkan akun beta** di email, membuat password, dan akunnya
langsung jadi dengan paket beta yang aktif. Mereka bisa masuk lagi kapan pun dengan email dan password itu.

## Alur

1. Admin buka `/north/email`, pilih template **Undangan beta tester**, isi penerima, pilih paket (bawaan `starter`), kirim.
2. Untuk **tiap penerima** dibuat satu undangan unik (link `https://bikinmacro.my.id/aktivasi#TOKEN`, berlaku 14 hari, sekali pakai).
   Kalau pengiriman email gagal, undangannya langsung dicabut.
3. Penerima membuka link. Halaman `/aktivasi` menampilkan email yang disamarkan (`b***o@gmail.com`) dan paketnya.
   **Membuka link belum mengaktifkan apa pun.**
4. Penerima membuat password lalu klik **Aktifkan akun**. Server membuat akun (email langsung terkonfirmasi), menyalakan paket
   (kredit mengikuti `plan_settings`, `reset_at` 30 hari ke depan), dan langsung memasukkan penerima ke `/generate`.

## Keputusan desain

| Hal | Pilihan | Alasan |
|---|---|---|
| Token | Di bagian `#` URL, hanya hash sha256 yang disimpan | Nggak masuk log server maupun header referer, dan kebocoran database nggak membocorkan link |
| Aktivasi | Baru terjadi saat tombol diklik (bukan saat link dibuka) | Pemindai email (misalnya Outlook SafeLinks) membuka semua link dan akan menghanguskan undangan |
| Sekali pakai | Undangan "diklaim" secara atomik sebelum akun dibuat | Klik ganda atau dua tab nggak membuat dua akun |
| Password | Dipilih penerima saat aktivasi (8 sampai 72 karakter) | Login BikinMacro berbasis password. Tanpa ini mereka nggak bisa masuk lagi |
| Email sudah punya akun | Paket dinaikkan, **password diatur ulang** ke pilihan pengguna dan langsung masuk | Link membuktikan mereka pemilik email (seperti link reset password). Aplikasi belum punya fitur "lupa password", jadi tanpa ini orang yang lupa password buntu. Akun **admin** nggak disentuh (password nggak diubah) |
| Menaikkan saja | Paket **nggak pernah diturunkan**, akun admin nggak disentuh sama sekali | Pelanggan Pro yang diundang sebagai Starter tetap Pro |
| Undangan baru | Mencabut undangan lama yang masih menunggu untuk email yang sama | Hanya ada satu link aktif per orang |

## Setup

Jalankan `scripts/beta_invites_schema.sql` di Supabase (SQL Editor). Tanpa tabel itu, tombol aktivasi di `/north/email` menolak
bekerja dengan pesan yang jelas (bukan mengirim email dengan link rusak).

## Memantau dan mencabut

Di `/north/email`, bagian **Undangan beta**: status tiap undangan (menunggu, aktif, kedaluwarsa, dicabut), dan tombol **Cabut**
untuk yang masih menunggu.

## Tes

```
npx tsx scripts/test-invites.ts          # aturan murni (11 tes), tanpa jaringan
npx tsx scripts/test-email.ts            # termasuk tombol aktivasi (22 tes)
npx tsx scripts/e2e-invites.ts --confirm # alur nyata ke Supabase: buat, aktivasi, login, klik ganda, kedaluwarsa, cabut
```

`e2e-invites.ts` membuat akun uji `@example.com` (nggak mengirim email), menjalankan semua skenario, lalu **menghapus** semuanya,
termasuk saat tes gagal di tengah. Jalankan setelah tabel `beta_invites` ada.

## Catatan teknis

- Query `HEAD` di supabase-js (`select(..., { head: true })`) **nggak melaporkan error untuk tabel yang hilang**. Untuk
  mengecek keberadaan tabel pakai `tableExists()` (`src/lib/orders/server.ts`), yang memakai query GET biasa.
- Sebelum mengaktifkan banyak orang, ingat batas AI di `src/lib/ai/guard.ts` (per menit dan per hari) berlaku per akun.
