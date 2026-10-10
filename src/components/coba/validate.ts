import readXlsxFile from 'read-excel-file/browser'
import { FINGERPRINT } from './data'

export type ValidateResult =
  | { ok: true; rows: number; sheets: string[] }
  | { ok: false; message: string }

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Cek apakah file yang diupload adalah file contoh demo: nama sheet, header,
 * jumlah baris, dan total Nilai harus cocok. Dibaca di browser, file nggak
 * dikirim ke mana mana.
 */
export async function validateSample(file: File): Promise<ValidateResult> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { ok: false, message: 'Formatnya harus .xlsx. Pakai file contoh yang kamu download tadi.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: 'Ukuran file terlalu besar untuk demo ini.' }
  }

  let sheets: { sheet: string; data: unknown[][] }[]
  try {
    sheets = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[]
  } catch {
    return { ok: false, message: 'File nggak bisa dibaca. Pastikan itu file Excel .xlsx yang nggak rusak.' }
  }

  const names = sheets.map((s) => s.sheet)
  const data = sheets.find((s) => s.sheet === FINGERPRINT.dataSheet)
  const rule = sheets.find((s) => s.sheet === FINGERPRINT.ruleSheet)
  const different = 'File ini beda dari file contoh. Demo ini cuma jalan dengan file contoh yang di-download dari halaman ini.'

  if (!data || !rule) {
    return {
      ok: false,
      message: `Sheet "${FINGERPRINT.dataSheet}" dan "${FINGERPRINT.ruleSheet}" harus ada. ${different}`,
    }
  }

  const header = (data.data[0] ?? []).map((c) => String(c ?? '').trim())
  if (header.join('|') !== FINGERPRINT.header.join('|')) {
    return { ok: false, message: `Header sheet "${FINGERPRINT.dataSheet}" beda dari contoh. ${different}` }
  }

  const body = data.data.slice(1)
  const nilaiCol = FINGERPRINT.header.indexOf('Nilai')
  const total = body.reduce<number>((sum, r) => sum + (typeof r[nilaiCol] === 'number' ? (r[nilaiCol] as number) : 0), 0)
  if (body.length !== FINGERPRINT.rowCount || total !== FINGERPRINT.totalNilai) {
    return { ok: false, message: `Isi datanya sudah berubah dari contoh. ${different}` }
  }

  return { ok: true, rows: body.length, sheets: names }
}
