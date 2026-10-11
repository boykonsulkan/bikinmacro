# Pelacakan perilaku (beta)

Halaman admin: `/north/behavior` (menu Perilaku). Rentang 7, 30, atau 90 hari. Akun admin dikeluarkan kecuali tombol
"Termasuk admin" dipilih.

## Aktifkan

Jalankan `scripts/events_schema.sql` di Supabase SQL Editor (membuat tabel `events`). Sebelum itu halaman tetap jalan,
tapi funnel dan data unduhan kosong dan ada banner kuning.

## Sumber data

| Yang tampil | Dari mana |
|---|---|
| Generate, chat, permintaan terbaru, revisi per macro | tabel `generations` dan `generation_chats` (sudah ada) |
| Terakhir login | Supabase Auth (`last_sign_in_at`) |
| Ditolak | tabel `ai_rejections` |
| Funnel, copy, unduh `.bas`, unduh `.xlsm` | tabel `events` (baru) |

## Kejadian yang dicatat

Dari browser (`POST /api/events`, hanya nama di daftar putih): `generate_view`, `questions_step`, `generate_submit`,
`copy_code`, `download_bas`, `guide_tab`, `history_resume`.

Dari server (nggak bisa dipalsukan klien): `generate_success`, `chat_success`, `download_xlsm`, `download_xlsm_failed`.

Daftar ada di `src/lib/events/names.ts`. Menambah kejadian baru: tambahkan namanya di sana, lalu panggil `track()`
(klien) atau `trackEvent()` (server).

## Privasi

`events` hanya menyimpan nama kejadian dan properti kecil (maksimal 8 kunci, teks maksimal 100 karakter). Isi
permintaan dan kode tidak disalin ke sana. Isi permintaan tetap ada di `generations` dan tampil di admin, jadi
sebutkan di kebijakan privasi bahwa permintaan disimpan dan dipakai untuk meningkatkan produk.

Pencatatan "best effort": kalau gagal (misalnya tabel belum dibuat), generate, chat, dan unduhan tetap jalan.

## Tes

`npx tsx scripts/test-events.ts` (daftar putih, pembersihan properti, agregasi laporan).
