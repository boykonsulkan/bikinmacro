// Helper murni untuk menyusun animasi berbasis waktu (ms).
// Scene menghitung tampilannya dari `t`, jadi frame manapun bisa dirender
// statis (poster, reduced motion) tanpa state tambahan.

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** 0 sebelum `from`, 1 sesudah `to`, linear di antaranya. */
export const ramp = (t: number, from: number, to: number) =>
  clamp01((t - from) / (to - from))

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p

export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)

export const easeInOut = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

/** Teks yang sedang diketik: `cps` karakter per detik mulai dari `from`. */
export const typed = (text: string, t: number, from: number, cps: number) =>
  text.slice(0, Math.min(text.length, Math.max(0, Math.floor(((t - from) / 1000) * cps))))

/** Format angka gaya Indonesia: 12450000 -> "12.450.000". */
export const rupiah = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
