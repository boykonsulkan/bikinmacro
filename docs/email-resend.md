# Email lewat Resend (kontrol dari halaman admin)

Halaman: `/north/email`. Email **cuma terkirim saat admin menekan tombol**. Nggak ada pengiriman otomatis.

## Setup (sekali)

1. **Buat akun Resend** di resend.com, lalu buat API key (`re_...`).
2. **Verifikasi domain pengirim** di Resend (Domains, Add Domain, `bikinmacro.my.id`) dengan menambahkan record DNS
   yang diminta (SPF dan DKIM) di penyedia DNS-mu. Tanpa domain terverifikasi, pengirim sandbox
   `onboarding@resend.dev` biasanya cuma bisa mengirim ke email pemilik akun Resend. Cek aturan terbarunya di dashboard Resend.
3. **Isi environment di hosting** (lalu deploy ulang):

   | Variabel | Contoh | Catatan |
   |---|---|---|
   | `RESEND_API_KEY` | `re_xxxxxxxx` | Rahasia. Tipe Sensitive di Vercel, **tanpa** awalan `NEXT_PUBLIC_` |
   | `EMAIL_FROM` | `BikinMacro <halo@bikinmacro.my.id>` | Harus di domain yang sudah terverifikasi. Kosong = sandbox |
   | `EMAIL_REPLY_TO` | `kamu@gmail.com` | Opsional: ke mana balasan penerima masuk |
   | `NEXT_PUBLIC_SITE_URL` | `https://bikinmacro.my.id` | Opsional: dipakai untuk link tombol |

4. **Jalankan `scripts/email_schema.sql`** di Supabase (SQL Editor). Ini membuat tabel `email_logs`. Tombol kirim
   menolak bekerja kalau tabelnya belum ada, supaya nggak ada email yang terkirim tanpa tercatat.
5. Buka `/north/email`, klik **Kirim tes ke saya** dulu, lalu cek inbox (dan folder spam).

## Balasan penerima masuk ke mana?

Resend cuma **mengirim**. Balasan penerima dikirim ke alamat `Reply-To`, atau kalau itu kosong, ke alamat pengirim (`EMAIL_FROM`).

- **Bawaan sementara: `founder@pelajarin.id`** (konstanta `DEFAULT_REPLY_TO` di `src/lib/email/resend.ts`). Dipakai kalau
  `EMAIL_REPLY_TO` kosong, jadi balasan nggak hilang walau pengirimnya `onboarding@resend.dev` atau domain tanpa email hosting.
- **Untuk mengganti**, isi `EMAIL_REPLY_TO` di environment (nggak butuh pengaturan DNS) lalu deploy ulang.
  Halaman `/north/email` menampilkan alamat balasan yang aktif.
- Mau balasan masuk ke kotak masuk di domain sendiri (misalnya `halo@bikinmacro.my.id`)? Perlu email hosting atau layanan
  penerusan email dengan record MX di DNS. Resend juga punya fitur menerima email, tapi itu perlu setup tersendiri dan nggak
  dipakai oleh kode ini.

## Pengaman bawaan

- Hanya admin. Tamu diarahkan ke login, dan server action mengecek ulang role admin.
- Maksimal 10 penerima sekali kirim dan 30 email per 24 jam (di luar email tes). Diatur di `src/lib/email/config.ts`.
- Satu baris yang bukan email membatalkan seluruh pengiriman (nggak ada kiriman parsial yang membingungkan).
- Ada dialog konfirmasi berisi daftar penerima sebelum kirim.
- Penerima yang sudah dapat subjek yang sama dalam 10 menit terakhir dilewati (mencegah dobel karena klik ganda).
- Setiap email dicatat di `email_logs` (penerima, subjek, status, alasan gagal, id Resend, siapa admin yang mengirim).
- API key nggak pernah ditampilkan atau masuk ke log.
- Isi email di-escape sebagai teks biasa. Pratinjau memakai iframe `sandbox`.

## Template

Template ada di `src/lib/email/config.ts`. `{nama}` diganti nama penerima (atau "kamu" kalau nama nggak diisi).
Format penerima: `email`, `email, Nama`, atau `Nama <email>`, satu per baris.

## Batas Resend

Default 10 request per detik per akun. Free plan punya kuota harian dan bulanan (angkanya nggak tertulis di
dokumentasi API, lihat di dashboard Resend). Kode mengulang sekali kalau kena 429.

## Tes otomatis

```
npx tsx scripts/test-email.ts
```
