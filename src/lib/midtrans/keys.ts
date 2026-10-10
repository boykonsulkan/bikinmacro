// Helper murni (aman dipakai di client maupun server). Mode sandbox atau produksi
// ditentukan dari AWALAN KEY, bukan dari variabel env terpisah, supaya nggak bisa
// salah pasang (mis. key produksi tapi mode sandbox).
//   Sandbox : SB-Mid-server-...  dan  SB-Mid-client-...
//   Produksi: Mid-server-...     dan  Mid-client-...

export const SNAP_SANDBOX_URL = 'https://app.sandbox.midtrans.com/snap/snap.js'
export const SNAP_PRODUCTION_URL = 'https://app.midtrans.com/snap/snap.js'

const PLACEHOLDER_RE = /your_midtrans|^\s*$/i

export function isSandboxKey(key?: string | null): boolean {
  return !!key && key.startsWith('SB-')
}

export function snapScriptUrl(clientKey?: string | null): string {
  return isSandboxKey(clientKey) ? SNAP_SANDBOX_URL : SNAP_PRODUCTION_URL
}

export type KeyCheck = { ok: true; production: boolean } | { ok: false; error: string }

/** Pastikan server key dan client key ada, bukan placeholder, dan satu lingkungan. */
export function checkKeys(serverKey?: string | null, clientKey?: string | null): KeyCheck {
  if (!serverKey || PLACEHOLDER_RE.test(serverKey)) return { ok: false, error: 'MIDTRANS_SERVER_KEY belum diisi.' }
  if (!clientKey || PLACEHOLDER_RE.test(clientKey)) return { ok: false, error: 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum diisi.' }
  if (!/Mid-server-/.test(serverKey)) return { ok: false, error: 'MIDTRANS_SERVER_KEY bukan server key Midtrans.' }
  if (!/Mid-client-/.test(clientKey)) return { ok: false, error: 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY bukan client key Midtrans.' }
  if (isSandboxKey(serverKey) !== isSandboxKey(clientKey)) {
    return { ok: false, error: 'Server key dan client key beda lingkungan (satu sandbox, satu produksi).' }
  }
  return { ok: true, production: !isSandboxKey(serverKey) }
}
