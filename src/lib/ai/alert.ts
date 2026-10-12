import 'server-only'
import { sendOne } from '@/lib/email/resend'
import { serviceClient } from '@/lib/orders/server'
import { AI_BUDGET, budgetAlert, monthStartIso } from './cost'
import type { BudgetAlert } from './cost'

export type AlertDeps = {
  /** Email semua admin. */
  admins: () => Promise<string[]>
  /** Sudah pernah dikirim bulan ini? null = nggak bisa dicek (jangan kirim, supaya nggak spam). */
  alreadySent: (template: string) => Promise<boolean | null>
  send: (to: string, subject: string, text: string) => Promise<{ ok: boolean; id?: string; error?: string }>
  log: (row: { to: string; subject: string; template: string; ok: boolean; id?: string; error?: string }) => Promise<void>
}

const sentThisMonth = new Set<string>()

const realDeps: AlertDeps = {
  admins: async () => {
    const { data } = await serviceClient().from('users').select('email').eq('role', 'admin')
    return (data ?? []).map((r) => r.email as string).filter(Boolean)
  },
  alreadySent: async (template) => {
    const { data, error } = await serviceClient()
      .from('email_logs')
      .select('id')
      .eq('template', template)
      .eq('status', 'terkirim')
      .gte('created_at', monthStartIso(new Date()))
      .limit(1)
    return error ? null : (data ?? []).length > 0
  },
  send: async (to, subject, text) => {
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#0b1b2b">${text
      .split('\n')
      .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
      .join('<br>')}</div>`
    const r = await sendOne({ to, subject, html, text })
    return r.ok ? { ok: true, id: r.id } : { ok: false, error: r.error }
  },
  log: async (row) => {
    await serviceClient().from('email_logs').insert({
      to_email: row.to,
      subject: row.subject,
      template: row.template,
      status: row.ok ? 'terkirim' : 'gagal',
      provider_id: row.id ?? null,
      error: row.error ?? null,
    })
  },
}

/**
 * Kirim email peringatan ke admin kalau biaya AI bulan ini melewati 80% atau 100% anggaran. Sekali per tingkat per bulan
 * (dicatat di email_logs). Best effort: gagal kirim nggak boleh mengganggu pengguna.
 * Mengembalikan alamat yang dikirimi (kosong kalau nggak ada yang perlu dikirim).
 */
export async function maybeSendBudgetAlert(monthUsd: number, deps: AlertDeps = realDeps, now: Date = new Date()): Promise<string[]> {
  try {
    const alert: BudgetAlert | null = budgetAlert(monthUsd, now)
    if (!alert) return []
    const memoKey = `${alert.template}:${monthStartIso(now)}`
    if (sentThisMonth.has(memoKey)) return []

    const done = await deps.alreadySent(alert.template)
    if (done !== false) {
      if (done === true) sentThisMonth.add(memoKey)
      return []
    }
    const admins = await deps.admins()
    if (admins.length === 0) return []

    // Tandai dulu supaya panggilan paralel di instance yang sama nggak mengirim dobel.
    sentThisMonth.add(memoKey)
    const sent: string[] = []
    for (const to of admins) {
      const r = await deps.send(to, alert.subject, alert.text)
      await deps.log({ to, subject: alert.subject, template: alert.template, ok: r.ok, id: r.id, error: r.error })
      if (r.ok) sent.push(to)
    }
    if (sent.length === 0) sentThisMonth.delete(memoKey) // gagal semua: boleh dicoba lagi nanti
    return sent
  } catch (e) {
    console.warn('maybeSendBudgetAlert gagal:', e instanceof Error ? e.message : e)
    return []
  }
}

/** Hanya untuk tes. */
export function resetAlertMemo(): void {
  sentThisMonth.clear()
}

export const ALERT_THRESHOLD_USD = AI_BUDGET.monthlyUsd * AI_BUDGET.warnRatio
