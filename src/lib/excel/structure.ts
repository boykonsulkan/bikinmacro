// Struktur file Excel contoh untuk AI. Murni (tanpa jaringan/DB/DOM) supaya dipakai di browser, di server, dan di tes.
// Prinsip privasi: file dibaca di browser dan TIDAK diunggah. Yang boleh dikirim cuma nama sheet, header kolom, jenis
// isi kolom (angka/teks/tanggal), jumlah baris, dan (hanya kalau pengguna mencentang) beberapa contoh isi.
// Prinsip keamanan: semua teks dari sel adalah DATA yang dikontrol penyerang (header bisa berisi perintah), jadi dibersihkan,
// dibatasi panjangnya, dan di prompt dibungkus sebagai data. Server MEMVALIDASI ULANG, nggak percaya hasil dari browser.

export const FILE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxSheets: 5,
  maxColumns: 40,
  maxHeaderChars: 60,
  maxSampleChars: 40,
  maxSamplesPerColumn: 3,
  /** Baris yang dipindai untuk menebak jenis isi kolom. */
  scanRows: 200,
  /** Baris teratas yang dicari untuk menemukan baris header. */
  headerSearchRows: 10,
  /** Batas total teks yang masuk ke prompt. */
  maxPromptChars: 6000,
} as const

export type ColumnType = 'teks' | 'angka' | 'tanggal' | 'campuran' | 'kosong'
const COLUMN_TYPES: readonly string[] = ['teks', 'angka', 'tanggal', 'campuran', 'kosong']

export type ColumnInfo = {
  /** Huruf kolom di Excel (A, B, ..., AA). Dihitung dari posisi asli supaya tetap benar walau ada kolom yang dibuang. */
  col: string
  header: string
  type: ColumnType
  samples: string[]
}

export type SheetInfo = {
  name: string
  /** Jumlah baris data (di bawah header). */
  rowCount: number
  /** Nomor baris header (mulai dari 1). */
  headerRow: number
  columns: ColumnInfo[]
}

export type FileStructure = { sheets: SheetInfo[]; truncated: boolean }

/** Yang benar-benar dikirim ke server. `samples` kosong kalau pengguna nggak mencentang contoh isi. */
export type FileContext = { sheets: SheetInfo[] }

/** Nomor kolom (mulai 0) menjadi huruf Excel: 0 = A, 25 = Z, 26 = AA. */
export function columnLetter(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

/** Bersihkan teks dari sel: satu baris, tanpa karakter kontrol dan tanda < >, dipotong. */
export function cleanText(value: unknown, max: number): string {
  let s: string
  if (value === null || value === undefined) return ''
  if (value instanceof Date) s = Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  else if (typeof value === 'number') s = Number.isFinite(value) ? String(value) : ''
  else if (typeof value === 'boolean') s = value ? 'TRUE' : 'FALSE'
  else if (typeof value === 'string') s = value
  else return ''
  s = s
    .replace(/[\u0000-\u001f\u007f]+/g, ' ') // U+2028 dan U+2029 ikut tertangkap oleh \s+ di bawah
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s.length > max ? s.slice(0, max) : s
}

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

export function inferType(values: unknown[]): ColumnType {
  const filled = values.filter((v) => !isEmpty(v))
  if (filled.length === 0) return 'kosong'
  const kinds = new Set(filled.map((v) => (v instanceof Date ? 'tanggal' : typeof v === 'number' ? 'angka' : 'teks')))
  return kinds.size === 1 ? ([...kinds][0] as ColumnType) : 'campuran'
}

/** Baris header = baris pertama (dari baris teratas) yang punya minimal 2 sel terisi, atau baris terisi pertama. */
function findHeaderRow(data: unknown[][]): number {
  const limit = Math.min(data.length, FILE_LIMITS.headerSearchRows)
  let firstFilled = -1
  for (let i = 0; i < limit; i++) {
    const filled = (data[i] ?? []).filter((v) => !isEmpty(v)).length
    if (filled > 0 && firstFilled === -1) firstFilled = i
    if (filled >= 2) return i
  }
  return firstFilled
}

export function buildStructure(workbook: { sheet: string; data: unknown[][] }[]): FileStructure {
  const sheets: SheetInfo[] = []
  let truncated = workbook.length > FILE_LIMITS.maxSheets

  for (const ws of workbook.slice(0, FILE_LIMITS.maxSheets)) {
    const data = Array.isArray(ws.data) ? ws.data : []
    const h = findHeaderRow(data)
    if (h === -1) continue
    const headerCells = data[h] ?? []
    const body = data.slice(h + 1)
    const scan = body.slice(0, FILE_LIMITS.scanRows)

    const columns: ColumnInfo[] = []
    const width = Math.min(headerCells.length, 200)
    for (let c = 0; c < width; c++) {
      const column = scan.map((row) => (row ?? [])[c])
      const header = cleanText(headerCells[c], FILE_LIMITS.maxHeaderChars)
      const hasData = column.some((v) => !isEmpty(v))
      if (!header && !hasData) continue
      if (columns.length >= FILE_LIMITS.maxColumns) {
        truncated = true
        break
      }
      const samples: string[] = []
      for (const v of column) {
        if (samples.length >= FILE_LIMITS.maxSamplesPerColumn) break
        const t = cleanText(v, FILE_LIMITS.maxSampleChars)
        if (t) samples.push(t)
      }
      columns.push({ col: columnLetter(c), header: header || `Kolom ${columnLetter(c)}`, type: inferType(column), samples })
    }
    if (columns.length === 0) continue

    sheets.push({
      name: cleanText(ws.sheet, FILE_LIMITS.maxHeaderChars) || 'Sheet',
      rowCount: body.filter((row) => (row ?? []).some((v) => !isEmpty(v))).length,
      headerRow: h + 1,
      columns,
    })
  }
  return { sheets, truncated }
}

/** Pilihan pengguna di pratinjau: sheet dan kolom yang dibuang, dan apakah contoh isi ikut. */
export type Selection = { excluded: ReadonlySet<string>; includeSamples: boolean }
export const columnKey = (sheet: string, col: string) => `${sheet}::${col}`
export const sheetKey = (sheet: string) => `${sheet}::*`

export function toContext(structure: FileStructure, selection: Selection): FileContext | null {
  const sheets: SheetInfo[] = []
  for (const s of structure.sheets) {
    if (selection.excluded.has(sheetKey(s.name))) continue
    const columns = s.columns
      .filter((c) => !selection.excluded.has(columnKey(s.name, c.col)))
      .map((c) => ({ ...c, samples: selection.includeSamples ? c.samples : [] }))
    if (columns.length > 0) sheets.push({ ...s, columns })
  }
  return sheets.length > 0 ? { sheets } : null
}

export type SanitizeResult = { ok: true; value: FileContext } | { ok: false; error: string }

const COL_RE = /^[A-Z]{1,3}$/
const bad = (error: string): SanitizeResult => ({ ok: false, error })

/**
 * Validasi ketat di server. Bentuk, jumlah, dan panjang dicek ulang, semua teks dibersihkan ulang, dan kolom yang bukan
 * milik bentuk yang dikenal dibuang. Hasilnya aman dimasukkan ke prompt sebagai data.
 */
export function sanitizeFileContext(input: unknown): SanitizeResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return bad('Struktur file tidak valid.')
  const rawSheets = (input as { sheets?: unknown }).sheets
  if (!Array.isArray(rawSheets) || rawSheets.length === 0) return bad('Struktur file kosong.')
  if (rawSheets.length > FILE_LIMITS.maxSheets) return bad(`Maksimal ${FILE_LIMITS.maxSheets} sheet.`)

  const sheets: SheetInfo[] = []
  for (const rs of rawSheets) {
    if (!rs || typeof rs !== 'object') return bad('Struktur file tidak valid.')
    const s = rs as Record<string, unknown>
    if (!Array.isArray(s.columns) || s.columns.length === 0) return bad('Sheet tanpa kolom.')
    if (s.columns.length > FILE_LIMITS.maxColumns) return bad(`Maksimal ${FILE_LIMITS.maxColumns} kolom per sheet.`)

    const columns: ColumnInfo[] = []
    for (const rc of s.columns) {
      if (!rc || typeof rc !== 'object') return bad('Struktur file tidak valid.')
      const c = rc as Record<string, unknown>
      if (typeof c.col !== 'string' || !COL_RE.test(c.col)) return bad('Huruf kolom tidak valid.')
      const header = cleanText(c.header, FILE_LIMITS.maxHeaderChars)
      if (!header) return bad('Header kolom kosong.')
      const type = typeof c.type === 'string' && COLUMN_TYPES.includes(c.type) ? (c.type as ColumnType) : 'campuran'
      const samples = Array.isArray(c.samples)
        ? c.samples
            .slice(0, FILE_LIMITS.maxSamplesPerColumn)
            .map((v) => cleanText(v, FILE_LIMITS.maxSampleChars))
            .filter(Boolean)
        : []
      columns.push({ col: c.col, header, type, samples })
    }
    const name = cleanText(s.name, FILE_LIMITS.maxHeaderChars)
    if (!name) return bad('Nama sheet kosong.')
    const rowCount = typeof s.rowCount === 'number' && Number.isFinite(s.rowCount) ? Math.max(0, Math.min(Math.round(s.rowCount), 10_000_000)) : 0
    const headerRow = typeof s.headerRow === 'number' && Number.isFinite(s.headerRow) ? Math.max(1, Math.min(Math.round(s.headerRow), 1000)) : 1
    sheets.push({ name, rowCount, headerRow, columns })
  }

  const value: FileContext = { sheets }
  if (fileContextToPrompt(value).length > FILE_LIMITS.maxPromptChars) return bad('Struktur file terlalu besar. Kurangi kolom atau sheet yang dikirim.')
  return { ok: true, value }
}

/** Teks untuk prompt. Dibungkus sebagai DATA oleh pemanggil (lihat wrapUserText di lib/ai/guard). */
export function fileContextToPrompt(ctx: FileContext): string {
  const lines: string[] = []
  for (const s of ctx.sheets) {
    lines.push(`Sheet "${s.name}": ${s.rowCount} baris data, header di baris ${s.headerRow}.`)
    for (const c of s.columns) {
      const sample = c.samples.length > 0 ? ` | contoh isi: ${c.samples.map((x) => `"${x}"`).join(', ')}` : ''
      lines.push(`  Kolom ${c.col} "${c.header}" (${c.type})${sample}`)
    }
  }
  return lines.join('\n')
}

export function describeContext(ctx: FileContext): string {
  const cols = ctx.sheets.reduce((n, s) => n + s.columns.length, 0)
  return `${ctx.sheets.length} sheet, ${cols} kolom`
}
