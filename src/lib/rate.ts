// Pembatas laju sederhana di memori (jendela geser). Murni, tanpa jaringan, gampang dites.
// Catatan: di serverless setiap instance punya memori sendiri, jadi ini pagar kasar terhadap lonjakan dari satu
// pengguna, bukan pembatas global. Batas yang harus tepat (kuota, pengaman AI) ada di database.

const hits = new Map<string, number[]>()

/** true = boleh lanjut. Mencatat percobaan kalau diizinkan. */
export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k)
  }
  return true
}

/** Hanya untuk tes. */
export function resetRateLimits(): void {
  hits.clear()
}
