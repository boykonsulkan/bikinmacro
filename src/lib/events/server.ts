import { serviceClient } from '@/lib/orders/server'
import { sanitizeProps } from './names'
import type { EventName, EventProps } from './names'

/**
 * Catat satu kejadian. Sengaja "best effort": gagal (misalnya tabel belum dibuat) nggak boleh mengganggu
 * generate, chat, atau unduhan, jadi semua galat ditelan.
 */
export async function trackEvent(userId: string, name: EventName, props: EventProps = {}): Promise<void> {
  try {
    const { error } = await serviceClient().from('events').insert({ user_id: userId, name, props: sanitizeProps(props) })
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') console.warn('trackEvent:', error.message)
  } catch (e) {
    console.warn('trackEvent gagal:', e instanceof Error ? e.message : e)
  }
}
