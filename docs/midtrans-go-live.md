# Midtrans: checklist go-live

Ada dua alur pembayaran, dan keduanya memakai akun Midtrans yang sama:

| Alur | Dipakai untuk | Aktivasi |
|---|---|---|
| **Payment Link** (statis) | Paket per output di landing (`PAYMENT_LINK_BASIC`) | Manual: pembeli isi `/pesan`, admin cek pembayaran di dashboard Midtrans |
| **Snap** (`/api/checkout`) | Paket lama di `/pricing` (Addon, Starter, Pro) untuk pengguna login | Otomatis lewat webhook |

## 1. Environment (hosting)

| Variabel | Isi |
|---|---|
| `MIDTRANS_SERVER_KEY` | `Mid-server-...` (produksi) atau `SB-Mid-server-...` (sandbox) |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | `Mid-client-...` atau `SB-Mid-client-...`, **lingkungan yang sama** dengan server key |
| `SUPABASE_SERVICE_ROLE_KEY` | Dipakai webhook dan route pesanan |

- **Mode ditentukan dari awalan key.** Variabel `NEXT_PUBLIC_MIDTRANS_MODE` sudah nggak dipakai dan boleh dihapus.
- Kalau server key dan client key beda lingkungan, checkout menolak dan mencatat alasannya di log server.
- `NEXT_PUBLIC_*` ditanam saat build. Setelah mengubah client key, **deploy ulang**.
- Di mesin lokal, pakai key **sandbox** (`SB-...`) di `.env.local` supaya testing nggak membuat transaksi sungguhan.

## 2. Dashboard Midtrans

- **Payment Notification URL**: `https://bikinmacro.my.id/api/webhooks/midtrans` (Settings, Configuration).
  Pengaturan ini berlaku untuk seluruh akun. Kalau akun yang sama dipakai aplikasi lain, notifikasi aplikasi itu juga
  akan masuk ke URL ini.
- Payment Link dibuat dengan `scripts/midtrans/create-payment-link.ps1` (redirect otomatis ke `/pesan`).

## 3. Cara kerja webhook

- Tanda tangan notifikasi **wajib valid**. Tanpa `MIDTRANS_SERVER_KEY`, webhook menolak semua notifikasi (500).
- Notifikasi yang sama bisa datang lebih dari sekali. Pembayaran yang sudah `success` nggak diproses lagi, jadi kredit
  nggak bertambah dua kali.
- Kartu dengan `fraud_status` `challenge` ditahan, bukan dianggap lunas.
- `deny`, `cancel`, `expire`, dan `failure` menandai pembayaran Snap yang masih pending jadi `failed`.
- Notifikasi dari Payment Link nggak membawa ID user kita, jadi nggak mengaktifkan akun apa pun. Verifikasinya manual
  lewat `/north/orders`.

## 4. Urutan tes sebelum buka untuk umum

1. Sandbox: pasang key `SB-...`, jalankan checkout dari `/pricing` (login), bayar dengan data tes Midtrans, dan pastikan
   paket aktif dan hanya sekali walau notifikasi dikirim ulang.
2. Produksi: bayar satu kali dengan nominal asli terkecil lewat Payment Link, lalu cek apa yang tertulis di struk dan
   dashboard supaya cocok dengan isian "Nomor order Midtrans" di `/pesan`.
3. Cek `Settings, Configuration` bahwa notifikasi terkirim (ada tombol kirim ulang di dashboard).

## 5. Tes otomatis

```
npx tsx scripts/test-midtrans.ts
```

Menguji pengecekan key, verifikasi tanda tangan, dan penentuan hasil notifikasi. Nggak butuh jaringan atau key asli.
