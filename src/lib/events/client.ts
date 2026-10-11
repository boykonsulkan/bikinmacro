import type { ClientEventName, EventProps } from './names'

/** Kirim kejadian dari browser. Nggak pernah melempar galat dan nggak menunggu hasilnya. */
export function track(name: ClientEventName, props?: EventProps): void {
  try {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, props }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // pelacakan nggak boleh mengganggu pemakaian
  }
}
