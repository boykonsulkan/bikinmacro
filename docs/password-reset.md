# Lupa password

Alur: `/auth/login` ("Lupa password?") ke `/auth/forgot` (isi email) ke email berisi tautan ke `/auth/reset#t=...` (buat
password baru) ke langsung masuk di `/generate`.

## Cara kerja

- Token pemulihan dibuat Supabase lewat `admin.generateLink({ type: 'recovery' })` (sekali pakai, berlaku 1 jam sesuai
  pengaturan OTP expiry di Supabase). Email dikirim lewat Resend kita sendiri, bukan email bawaan Supabase, jadi tidak
  bergantung pada pengaturan SMTP atau daftar URL redirect di Supabase.
- Token ada di bagian `#` tautan: tidak dikirim ke server saat halaman dibuka, tidak masuk log, dan pemindai email yang
  membuka tautan tidak bisa menghabiskannya. Token baru dipakai saat tombol "Simpan password" ditekan (`verifyOtp`).
- Password divalidasi LEBIH DULU, jadi salah ketik tidak menghabiskan token. Aturannya sama dengan aktivasi
  (`validatePassword`: 8 sampai 72 karakter).
- Setelah berhasil: sesi di perangkat lain dicabut (`signOut({ scope: 'others' })`) dan pengguna langsung masuk.

## Pengaman

- Jawaban untuk email terdaftar dan tidak terdaftar IDENTIK, dan waktu responsnya diratakan (minimal 1,2 detik), supaya
  tidak bisa dipakai menebak siapa yang punya akun.
- Batas: 3 email per alamat per jam (tahan lintas instance lewat `email_logs`, plus pembatas memori) dan 10 permintaan
  per IP per jam.
- Akun nonaktif (diblokir admin) tidak dikirimi email, dan token mereka ditolak di `verifyOtp`, jadi reset tidak bisa
  dipakai untuk "mengaktifkan diri".
- Setiap email tercatat di `email_logs` (template `password_reset`), terlihat di `/north/email`.
- `/auth/reset` dikecualikan dari pengalihan "sudah login" di middleware, supaya token tidak hilang.

## Tes

- `npx tsx scripts/test-password-reset.ts` (aturan dan isi email).
- Uji browser dengan database hidup ada di sesi pengembangan (24 pengecekan: jawaban netral, batas laju, token sekali
  pakai, pencabutan sesi lain, akun nonaktif).
