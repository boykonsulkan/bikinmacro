# Pengaman AI (generate dan chat revisi)

Prinsip: **anggap modelnya bisa diakali** (prompt injection, ganti peran, "abaikan instruksi sebelumnya"). Karena itu yang dikunci
adalah jalur keluarnya, bukan cuma bunyi prompt. Kode: `src/lib/ai/` (guard, prompts, server) dan dua route
`/api/generate` dan `/api/chat`.

## Lapisan

| # | Pengaman | Efek |
|---|---|---|
| 1 | **Pemeriksa keluaran**: cuma VBA valid (`Sub...End Sub` atau `Function...End Function`) yang diterima | Terjemahan, Python, esai, dan penolakan nggak pernah tersimpan sebagai macro, nggak menimpa kode, nggak memotong kredit atau jatah chat |
| 2 | **Pemindai kode berbahaya**: blokir `Shell`, `WScript`, PowerShell, `URLDownloadToFile`, `XMLHTTP`, `SendKeys`, `Declare`, `VBProject`, WMI, `CreateObject` selain Dictionary, FileSystemObject, Outlook, Excel, Word | Macro berjalan di komputer pengguna, jadi perintah ini nggak boleh dihasilkan. Hapus file dan auto-run cuma diberi peringatan |
| 3 | **Prompt diperketat**: aturan keamanan, input pengguna dibungkus sebagai DATA (`<permintaan>`, `<pesan>`), tag palsu dibuang | Mengurangi peluang model terpancing. Ini lapisan pertama, bukan satu-satunya |
| 4 | **Batas keras**: panjang permintaan (4000) dan pesan chat (1000), riwayat chat dipangkas, token keluaran (4000), 6 permintaan per menit dan 100 per hari | Biaya terburuk per permintaan terbatas, walau modelnya sudah dibajak |
| 5 | **Log dan penahanan**: tiap penolakan dicatat di `ai_rejections`. 5 penolakan dalam satu jam menahan akun sementara. Lihat di `/north/ai-log` | Pelaku yang berulang terhenti dan kelihatan |

Semua angka ada di `AI_LIMITS` (`src/lib/ai/guard.ts`).

## Setup

Jalankan `scripts/ai_guard_schema.sql` di Supabase untuk tabel `ai_rejections`. Kalau belum, pengaman 1 sampai 4 tetap jalan.
Cuma penahanan akun dan halaman `/north/ai-log` yang nonaktif.

## Pesan error ke pengguna

Penolakan memakai status **422** dengan pesan yang jelas. Batas laju dan penahanan memakai **429**. Status **402** tetap khusus kuota habis.

## Tes

```
npx tsx scripts/test-ai-guard.ts      # 18 tes murni, tanpa jaringan
npx tsx scripts/redteam-ai.ts         # uji jebakan dengan model sungguhan (butuh key di .env.local)
npx tsx scripts/redteam-ai.ts gemini  # satu model saja
```

`redteam-ai.ts` menguji 15 skenario generate dan 7 skenario chat, termasuk permintaan wajar (rekap, Outlook, hapus baris kosong)
supaya terbukti pengaman nggak salah menolak. Jalur gratis Gemini punya batas kecepatan ketat, jadi skrip memberi jeda dan
memisahkan galat API (SKIP) dari kegagalan pengaman (FAIL). Jalankan ulang tiap mengganti model atau mengubah prompt.

## Keterbatasan

- Tidak ada pengaman yang menjamin 100%. Pemeriksa keluaran dan batas keras yang membuat kebocoran prompt tidak berbahaya.
- Macro yang melakukan akses internet atau menjalankan program lain sengaja diblokir, termasuk yang sah. Itu keputusan produk;
  longgarkan di `BLOCKED` kalau perlu.
- Pengujian yang ada satu kali jalan per skenario. Penyerang nyata mengulang dan memakai percakapan beberapa giliran.
