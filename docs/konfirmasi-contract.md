# Kontrak data: layar Konfirmasi rencana

Layar: `/generate/konfirmasi` ([KonfirmasiScreen.tsx](../src/components/konfirmasi/KonfirmasiScreen.tsx)).
Tipe TypeScript: [types.ts](../src/components/konfirmasi/types.ts). Data dummy: [dummy.ts](../src/components/konfirmasi/dummy.ts).

Muncul setelah user ngetik permintaan dan upload contoh file, sebelum file dibuat.
Backend generator mengirim satu objek `KonfirmasiPlan`. Layar mengirim balik `KonfirmasiConfirmPayload`
saat user klik "Sudah benar, bikin file".

## Dari backend ke layar: `KonfirmasiPlan`

```json
{
  "plan_id": "plan_01HX...",
  "request_text": "Gabungin semua file penjualan cabang di satu folder jadi satu sheet Rekap.",
  "sample_file": {
    "name": "Penjualan_JKT_Oktober.xlsx",
    "sheet_count": 3,
    "row_count": 1240
  },
  "detected_sheets": [
    { "name": "Sales", "header_row": 1, "columns": ["Tanggal", "Customer", "Kode", "Qty", "Nilai", "Catatan"] },
    { "name": "Ringkasan", "header_row": 1, "columns": ["Cabang", "Total"] }
  ],
  "output_file_name": "Rekap_Multi_File.xlsm",
  "steps": [
    { "id": "s1", "text": "Buka semua file .xlsx di folder yang kamu pilih." },
    { "id": "s2", "text": "Ambil sheet Sales dari tiap file, mulai dari baris 2." }
  ],
  "decision": {
    "id": "header_beda",
    "question": "Kalau ada file yang header-nya beda dari contoh, macro harus gimana?",
    "options": [
      { "id": "lewati", "label": "Lewati file itu dan kasih tahu aku" },
      { "id": "berhenti", "label": "Berhenti dan tampilkan pesan error" }
    ],
    "default_option_id": null
  }
}
```

| Field | Tipe | Wajib | Catatan |
|---|---|---|---|
| `plan_id` | string | ya | Dikirim balik saat konfirmasi atau ubah rencana. |
| `request_text` | string | ya | Permintaan user apa adanya. |
| `sample_file.name` | string | ya | Nama file yang diupload. |
| `sample_file.sheet_count` | number | ya | Jumlah sheet. |
| `sample_file.row_count` | number | ya | Total baris di semua sheet. |
| `detected_sheets[]` | array | ya | Boleh kosong kalau file nggak kebaca (layar tetap render, tabelnya kosong). |
| `detected_sheets[].name` | string | ya | Nama sheet. |
| `detected_sheets[].header_row` | number | ya | Baris header yang terdeteksi. Sekarang layar belum menampilkannya, tapi dibutuhkan kalau user mau koreksi. |
| `detected_sheets[].columns` | string[] | ya | Isi baris header, urut dari kiri. |
| `output_file_name` | string | ya | Nama file `.xlsm` yang akan dibuat. |
| `steps[]` | array | ya | Langkah macro dalam bahasa awam, urut. `id` harus unik. |
| `decision` | object atau null | ya | `null` kalau nggak ada yang perlu dipilih (kotak pilihan disembunyikan). |
| `decision.options[]` | array | ya | Minimal 2. Tampil sebagai tombol pilihan. |
| `decision.default_option_id` | string, null, atau hilang | tidak | Kalau diisi, opsi itu terpilih dari awal. Kalau kosong, tombol utama nonaktif sampai user memilih. |

Aturan teks (supaya cocok dengan tone produk): bahasa Indonesia santai, pakai "kamu", tanpa em dash atau en dash,
satu kalimat per langkah.

## Dari layar ke backend

Saat "Sudah benar, bikin file":

```json
{
  "plan_id": "plan_01HX...",
  "decision_answers": { "header_beda": "lewati" }
}
```

`decision_answers` berisi `{}` kalau `decision` null.

## Yang belum ada di layar (perlu keputusan saat disambung)

- **Ubah rencana**: callback `onEditPlan` belum punya perilaku. Pilihan: kembali ke langkah Ceritain dengan teks terisi, atau mode edit langkah satu per satu. Kalau pakai mode edit, backend perlu endpoint yang menerima `steps` hasil edit dan mengembalikan `KonfirmasiPlan` baru.
- **Ganti file**: callback `onReplaceFile` belum punya perilaku. Setelah file baru diupload, backend mengirim `KonfirmasiPlan` baru.
- **Loading dan error**: layar sekarang menerima plan yang sudah jadi. State menunggu analisis file dan state gagal baca file belum dibuat.
- **Rute**: sekarang `/generate/konfirmasi` memakai data dummy dan belum dipanggil dari `GenerateForm`.
