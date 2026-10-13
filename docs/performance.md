# Kecepatan dan wilayah server

**Aturan penting: fungsi Vercel harus berada di wilayah yang sama dengan database Supabase.**
Database proyek ini ada di AWS Seoul (`ap-northeast-2`), jadi `vercel.json` menetapkan `"regions": ["icn1"]` (Seoul).
Sebelumnya fungsi berjalan di Washington (`iad1`, bawaan Vercel) dan setiap kueri database membayar sekitar 230 ms
perjalanan bolak-balik. Halaman yang melakukan 5 sampai 8 panggilan berurutan jadi lambat 1 sampai 3 detik.
Setelah dipindah: sekitar 22 ms per kueri dan sekitar 25 ms untuk pemeriksaan login.

Kalau database dipindah ke wilayah lain (atau membuat proyek Supabase baru), ubah `regions` di `vercel.json` ke wilayah
Vercel terdekat dan ukur ulang. Cara cepat memastikan lokasi database: resolve `db.<ref>.supabase.co` lalu cari lokasi IP-nya.

## Hasil ukur di produksi (waktu sampai halaman siap, median 3 muatan)

| Halaman | Sebelum (ms) | Sesudah (ms) | Lebih cepat |
|---|---|---|---|
| / | 1185 | 467 | 2.5 kali |
| /pricing | 1015 | 222 | 4.6 kali |
| /generate (login) | 2087 | 464 | 4.5 kali |
| /history (login) | 1598 | 445 | 3.6 kali |
| /pricing (login) | 1641 | 355 | 4.6 kali |
| /north | 2268 | 627 | 3.6 kali |
| /north/users | 2419 | 656 | 3.7 kali |
| /north/behavior | 2989 | 668 | 4.5 kali |
| /north/ai-cost | 2218 | 604 | 3.7 kali |
| /north/ai-log | 2120 | 556 | 3.8 kali |
| /north/orders | 2224 | 624 | 3.6 kali |
| /north/transactions | 1082 | 693 | 1.6 kali |
| /north/email | 2603 | 794 | 3.3 kali |
| /north/feedback | 1149 | 583 | 2.0 kali |
| /north/settings | 1858 | 650 | 2.9 kali |

## Perubahan lain yang membantu

- **Pemeriksaan login berulang dikurangi.** Layout admin tidak lagi bertanya ke server Auth di setiap navigasi (middleware
  sudah menjamin pengunjung adalah admin). Halaman admin memakai `getAdminForPage()` (identitas dari JWT yang diverifikasi,
  dipakai bersama dalam satu permintaan), sedangkan aksi yang mengubah data dan route API tetap memakai `getAdminUser()`
  yang ketat.
- **Kueri paralel.** Dashboard, Users, Perilaku, dan Biaya AI tidak lagi menjalankan kueri berurutan atau memeriksa
  keberadaan tabel dengan perjalanan terpisah (error kueri = tabel belum ada).
- **Tampilan loading seketika** (`loading.tsx`) untuk admin, `/generate`, `/history`, dan `/pricing`.
- **Penyorot kode ringan** (`src/lib/highlight.ts`): mesin regex JavaScript dengan hanya bahasa vb dan tema github-dark,
  bukan seluruh paket `shiki` dengan mesin wasm.
- `middleware.ts` diganti nama menjadi `proxy.ts` (konvensi Next 16). `recharts` yang tidak dipakai dihapus.
