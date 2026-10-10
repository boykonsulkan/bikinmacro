# Demo "Proses Rekap Penjualan"

Use case demo di halaman `/coba`. Hasilnya selalu sama karena datanya tetap (tanpa angka acak).

| File | Fungsi |
|---|---|
| `demo-data.ps1` | Data contoh fiktif, aturan komisi, dan hasil yang diharapkan |
| `ProsesRekap.bas` | Sumber kode VBA macro |
| `build-demo.ps1` | Membangun file di `public/demo/` memakai Excel yang terpasang |
| `test-demo.ps1` | Menjalankan macro di Excel sungguhan dan membandingkan dengan hasil yang diharapkan |

File yang dihasilkan di `public/demo/`:

- `Contoh_Rekap_Penjualan.xlsx` : file yang di-download user (sheet Penjualan dan Aturan Komisi)
- `Proses_Rekap_Penjualan.xlsm` : file hasil (sheet Mulai, Hasil, Opsi, Petunjuk, plus macro dan tombol Jalankan)
- `Proses_Rekap_Penjualan.bas` : kode VBA (bonus)

## Membangun ulang

```
powershell -ExecutionPolicy Bypass -File scripts/demo/build-demo.ps1
powershell -ExecutionPolicy Bypass -File scripts/demo/test-demo.ps1
```

Syarat: Windows dengan Microsoft Excel desktop.

`build-demo.ps1` menyalakan "Trust access to the VBA project object model" (kunci `HKCU\...\Excel\Security\AccessVBOM`)
selama proses, lalu mengembalikannya ke nilai semula di blok `finally`.

## Kalau mengubah data atau aturan

1. Ubah `demo-data.ps1` (data, tier, atau jumlah baris per Sales).
2. Jalankan `build-demo.ps1` lalu `test-demo.ps1`.
3. Samakan angka di `src/components/coba/data.ts` (`EXPECTED_KOMISI`, `TIERS`, `FINGERPRINT`).
   Angka hasil komisi bisa dicetak dengan `Get-DemoExpectedKomisi`.

## Yang belum dites otomatis

- Pop up pilih file (`GetOpenFilename`) dan klik tombol Jalankan. Tes memanggil `ProsesFile` langsung, jadi bagian ini
  perlu dicoba manual sekali: buka `.xlsm`, klik Jalankan, pilih file contoh.
- Windows saja. Kode memakai `Collection` dan `Application.PathSeparator` jadi kemungkinan besar jalan di Mac,
  tapi belum pernah dites di sana.
