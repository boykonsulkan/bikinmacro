# Font yang di-self-host

`playfair-display-latin.woff2`: Playfair Display, variable font (bobot 400 sampai 900), subset latin.
Dipakai untuk headline hero lewat `next/font/local` di `src/app/layout.tsx`.

- Sumber: Google Fonts (`fonts.gstatic.com/s/playfairdisplay/v40/...`).
- Lisensi: SIL Open Font License 1.1. Copyright 2017 The Playfair Display Project Authors
  (https://github.com/clauseggers/Playfair). Boleh disebarkan bersama aplikasi selama pemberitahuan lisensi ini ikut.

Kenapa nggak memakai `next/font/google`: lihat komentar di `src/app/layout.tsx`.
Subset yang tidak ada di berkas ini (cyrillic, vietnamese, latin-ext) jatuh ke font cadangan (Georgia, serif).
