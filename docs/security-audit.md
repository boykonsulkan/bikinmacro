# Audit keamanan sebelum undangan beta (12 Oktober 2026)

Diaudit dengan pengujian nyata di database hidup (akun sementara `@example.com`, semua dihapus), bukan hanya membaca
kode. Skrip yang bisa diulang: `node scripts/audit-rls.js`.

## Temuan

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| 1 | KRITIS | Pengguna biasa bisa mengubah `role`, `plan`, dan kuota miliknya sendiri lewat API publik Supabase (kebijakan "Users can update own row" tanpa batas kolom). Terbukti: akun uji jadi `admin`, `pro`, kuota 99.999, lalu bisa membaca semua pengguna. | Kode siap. **Menunggu kamu menjalankan `scripts/security_hardening.sql` setelah deploy.** |
| 2 | KRITIS | Next.js 16.2.4 punya puluhan advisory: bypass middleware/proxy, SSRF, RCE (Windows dan next/og), DoS. | Diperbaiki: upgrade ke 16.4.0. Berlaku setelah deploy. Dependensi produksi sekarang 0 kerentanan. |
| 3 | TINGGI | Webhook Xendit lolos tanpa verifikasi kalau `XENDIT_CALLBACK_TOKEN` kosong di server (siapa pun bisa memalsukan pembayaran lalu menaikkan paket pengguna berdasarkan email). | Diperbaiki: gagal-tertutup. |
| 4 | TINGGI | Kuota bisa dilewati dengan permintaan paralel: pemotongan kredit membaca lalu menulis (nilai basi), jadi banyak generate bisa lolos sementara `credits_used` tetap rendah. | Diperbaiki: kredit dipesan atomik sebelum AI dipanggil dan dikembalikan kalau gagal. Diuji 4 permintaan paralel dengan 1 slot: tepat 1 lolos. |
| 5 | TINGGI | Pendaftaran publik tanpa konfirmasi email: siapa pun (email palsu atau milik orang lain) langsung dapat sesi dan jatah gratis. Bisa menguras biaya AI dengan banyak akun. | **Tindakan kamu di dashboard Supabase** (lihat checklist). |
| 6 | SEDANG | Pengguna bisa menulis langsung ke `generations` dan `generation_chats` (melewati pengaman AI dan batas). | Ditutup oleh SQL di #1 (kode sudah menulis lewat service role). |
| 7 | SEDANG | Pesan error mentah dari server (termasuk dari penyedia AI) dikirim ke browser. | Diperbaiki: pesan generik, detail hanya di log server. |
| 8 | SEDANG | Tidak ada pembatas laju untuk `/api/events`, `/api/export/xlsm`, `/api/feedback`; feedback tanpa batas panjang. | Diperbaiki (pembatas per instance serverless: pagar kasar, bukan batas global). |
| 9 | SEDANG | Tidak ada halaman Privasi dan Syarat, padahal data finansial dan janji "tidak disalahgunakan" ada di FAQ. | Draf dibuat di `/privasi` dan `/syarat`, tertaut di footer. **Perlu kamu baca dan setujui.** |
| 10 | SEDANG | Tidak ada header keamanan. | Ditambahkan (nosniff, DENY, referrer, permissions, HSTS). CSP sengaja belum: Midtrans Snap perlu diuji dulu. |
| 11 | RENDAH | `admin_settings` dan `plan_settings` (termasuk `system_context`, tautan bayar) terbaca semua pengguna login. | Belum diubah. Jangan taruh rahasia di `system_context`. |
| 12 | RENDAH | Admin ditentukan lewat email yang di-hardcode di trigger database. Aman selama akun itu ada dan pendaftaran dikendalikan (#5). | Dicatat. |
| 13 | INFO | Catatan pembayaran `pending` dari checkout dulu gagal tersimpan diam-diam (tidak ada policy insert). Sekarang tersimpan lewat service role, jadi polling status pembayaran bekerja sesuai desain. | Perubahan perilaku yang diinginkan. |

## Checklist sebelum mengirim undangan

1. **Push dan deploy** versi terbaru (kode harus live lebih dulu).
2. **Jalankan `scripts/security_hardening.sql`** di Supabase SQL Editor, lalu `node scripts/audit-rls.js`. Hasilnya tidak boleh
   punya baris `[KRITIS]`.
3. **Supabase Auth**: matikan "Allow new users to sign up" selama beta (undangan tetap jalan karena akun dibuat server),
   atau minimal aktifkan konfirmasi email dan captcha.
4. **Batas biaya di penyedia AI** (OpenRouter, OpenAI, Gemini): set batas bulanan dan alert. Batas per pengguna ada di
   kode (`AI_LIMITS`), tapi tidak ada batas global.
5. **Baca `/privasi` dan `/syarat`**. Itu draf yang menggambarkan perilaku produk sekarang, bukan nasihat hukum.
6. **Cek kontak**: halaman Bantuan menampilkan `support@bikinmacro.com`, sedangkan domain produk `bikinmacro.my.id`.
   Pastikan kotak masuk itu ada dan dibaca. Privasi menjanjikan penghapusan akun lewat Bantuan, jadi siapkan prosedurnya.
7. **Cadangan**: paket gratis Supabase tidak punya point-in-time recovery. Pastikan ada cadangan harian aktif atau ekspor
   manual sebelum beta.
8. Mulai dengan 2 atau 3 penguji dulu, lalu pantau `/north/behavior`, `/north/ai-log`, dan biaya AI sebelum menambah.

## Belum tercakup

- Tidak ada pemantauan galat dan alert (hanya log Vercel).
- Tidak ada alur hapus akun mandiri (manual lewat Bantuan).
- Lima kerentanan tersisa di `npm audit` hanya di alat pengembangan (tidak ikut ter-deploy).
