export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// Token akses disimpan di browser pembeli supaya bisa balik tanpa mencari link lagi.
// Selalu dibungkus try/catch: localStorage bisa diblokir atau kosong.
const KEY = 'bm-orders'

export function saveOrderToken(code: string, token: string) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>
    all[code] = token
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* abaikan */
  }
}

export function loadOrderToken(code: string): string | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>
    return typeof all[code] === 'string' ? all[code] : null
  } catch {
    return null
  }
}
