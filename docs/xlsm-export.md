# Ekspor .xlsm (beta)

Tombol Unduh di halaman hasil `/generate` punya dua pilihan: `.bas` (disarankan) dan `.xlsm` (beta).

## Cara kerja

`GET /api/export/xlsm?generation_id=...` membaca kode terbaru milik pengguna dari tabel `generations` (bukan dari
kiriman klien), memindainya lagi dengan `scanVba`, lalu merakit file di `src/lib/xlsm/build.ts`:

1. Template workbook kosong (sheet `Data`, modul `BikinMacro`) diambil dari `src/lib/xlsm/template.ts` (base64).
2. Isi modul `BikinMacro` diganti kode pengguna (kompresi MS-OVBA di `src/lib/xlsm/ovba.ts`).
3. Semua modul dijadikan source-only (p-code dibuang) dan versi `_VBA_PROJECT` diset `0xFFFF`, jadi Excel yang
   membuka file menyusun ulang kode dari teksnya.

Murni JavaScript, jadi jalan di Vercel tanpa Excel. Excel hanya dipakai sekali untuk membuat template.

## Memperbarui template

`powershell -File scripts/xlsm/build-template.ps1` (butuh Windows dan Excel desktop). Skrip ini menyentuh
`AccessVBOM` di registry sementara dan mengembalikannya. Setelah itu jalankan tes di bawah.

## Tes

- `npx tsx scripts/test-xlsm.ts`: tes unit (kompresi, encoding, isi modul).
- `powershell -File scripts/xlsm/verify-xlsm.ps1 -File x.xlsm -Macro Tulis -Cell A1 -Expect nilai`: membuka file di
  Excel asli dan menjalankan satu makro. Ini satu-satunya bukti bahwa Excel menerima file; jalankan setiap template
  atau pustaka `cfb` berubah.

## Batasan yang diketahui

- Satu modul saja. Kode yang bergantung pada event sheet (misalnya `Worksheet_Change`) tidak akan berfungsi karena
  harus ada di modul sheet.
- Karakter di luar Windows-1252 diganti `?`.
- Sudah diuji di Excel 365 (Windows). Versi lain belum, makanya labelnya Beta dan `.bas` yang disarankan.
- File dari internet bisa diblokir Windows (Mark of the Web): pengguna harus klik Enable Content atau Unblock.
