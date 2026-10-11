import { EMAIL_LIMITS } from './config'

export type Recipient = { email: string; name: string }

export type ParsedRecipients = {
  valid: Recipient[]
  /** Baris yang nggak bisa dibaca sebagai email. */
  invalid: string[]
  /** Jumlah email dobel yang dibuang. */
  duplicates: number
}

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/

/** Buang karakter kontrol dan kurung sudut dari nama (mencegah injeksi header dan HTML). */
export function cleanName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, EMAIL_LIMITS.nameMax)
}

/**
 * Baca daftar penerima dari teks. Satu penerima per baris (atau dipisah titik koma).
 * Format yang dikenali:
 *   budi@perusahaan.com
 *   budi@perusahaan.com, Budi
 *   Budi <budi@perusahaan.com>
 */
export function parseRecipients(text: string): ParsedRecipients {
  const valid: Recipient[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  let duplicates = 0

  for (const raw of text.split(/\r?\n|;/)) {
    const line = raw.trim()
    if (!line) continue

    let email = ''
    let name = ''
    const angle = line.match(/^(.*)<([^<>]+)>\s*$/)
    if (angle) {
      name = angle[1]
      email = angle[2]
    } else {
      const comma = line.indexOf(',')
      if (comma >= 0) {
        email = line.slice(0, comma)
        name = line.slice(comma + 1)
      } else {
        email = line
      }
    }

    email = email.trim().toLowerCase()
    if (!EMAIL_RE.test(email) || email.length > 254) {
      invalid.push(line)
      continue
    }
    if (seen.has(email)) {
      duplicates++
      continue
    }
    seen.add(email)
    valid.push({ email, name: cleanName(name) })
  }

  return { valid, invalid, duplicates }
}
