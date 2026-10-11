import 'server-only'
import { serviceClient } from '@/lib/orders/server'
import { AI_LIMITS } from './guard'
import type { RejectionReason } from './guard'

export type AbuseCheck = { ok: true } | { ok: false; status: number; error: string }

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

/**
 * Cek apakah pengguna boleh memanggil AI sekarang: ditahan kalau terlalu sering ditolak,
 * lalu batas per menit dan per hari (gabungan generate dan chat). Admin dilewati oleh pemanggil.
 * Kalau tabel log belum ada, pengecekan penolakan dilewati (fail-open), batas laju tetap jalan.
 */
export async function checkAbuse(userId: string): Promise<AbuseCheck> {
  const db = serviceClient()

  const { count: rejected, error: rejErr } = await db
    .from('ai_rejections')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', iso(60 * 60 * 1000))
  if (!rejErr && (rejected ?? 0) >= AI_LIMITS.rejectionsPerHour) {
    return {
      ok: false,
      status: 429,
      error: 'Terlalu banyak permintaan di luar topik. Akun kamu ditahan sementara, coba lagi dalam satu jam.',
    }
  }

  const countSince = async (msAgo: number) => {
    const since = iso(msAgo)
    const [g, c] = await Promise.all([
      db.from('generations').select('id', { head: true, count: 'exact' }).eq('user_id', userId).gte('created_at', since),
      db.from('generation_chats').select('id', { head: true, count: 'exact' }).eq('user_id', userId).eq('role', 'user').gte('created_at', since),
    ])
    return (g.count ?? 0) + (c.count ?? 0)
  }

  if ((await countSince(60 * 1000)) >= AI_LIMITS.requestsPerMinute) {
    return { ok: false, status: 429, error: 'Terlalu cepat. Tunggu sebentar lalu coba lagi.' }
  }
  if ((await countSince(24 * 60 * 60 * 1000)) >= AI_LIMITS.requestsPerDay) {
    return { ok: false, status: 429, error: 'Batas pemakaian harian tercapai. Coba lagi besok.' }
  }
  return { ok: true }
}

/** Catat penolakan. Gagal mencatat nggak boleh mengganggu respons ke pengguna. */
export async function logRejection(
  userId: string,
  kind: 'generate' | 'chat',
  reason: RejectionReason,
  userText: string,
  detail?: string,
) {
  try {
    await serviceClient()
      .from('ai_rejections')
      .insert({ user_id: userId, kind, reason, detail: detail ?? null, excerpt: userText.replace(/\s+/g, ' ').slice(0, 200) })
  } catch {
    /* abaikan */
  }
}
