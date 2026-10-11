// Pengaman AI. Prinsip: anggap modelnya BISA diakali (prompt injection, ganti peran, dsb).
// Karena itu yang dikunci adalah jalur keluarnya: server cuma menerima balasan yang berupa VBA valid dan
// nggak berbahaya, dan semua penggunaan dibatasi. Modul ini murni (tanpa jaringan/DB) supaya gampang dites.

export const AI_LIMITS = {
  /** Panjang permintaan macro (sudah termasuk jawaban pertanyaan klarifikasi dari form). */
  promptMax: 4000,
  chatMessageMax: 1000,
  /** Riwayat chat yang dikirim ke AI: jumlah pesan dan total karakter. */
  historyMaxMessages: 20,
  historyMaxChars: 20_000,
  /** Kode macro maksimal yang diterima dari AI. */
  codeMaxChars: 30_000,
  /** Batas token keluaran per panggilan, supaya satu permintaan nggak bisa menghabiskan kuota. */
  maxOutputTokens: 4000,
  requestsPerMinute: 6,
  requestsPerDay: 100,
  /** Penolakan (di luar topik atau berbahaya) per jam sebelum akun ditahan sementara. */
  rejectionsPerHour: 5,
  /** Penjelasan kode (tanya arti atau cara kerja) per macro. Setelah ini nggak dijawab lagi. */
  explainMax: 5,
  /** Panjang jawaban penjelasan. Dibatasi supaya jalur ini nggak dipakai buat tanya jawab umum. */
  explainMaxChars: 1500,
} as const

export type VbaExtract =
  | { ok: true; code: string }
  | { ok: false; reason: 'refusal' | 'not_vba' | 'empty' | 'too_long' }

const PROC_START = /^\s*(?:(?:Public|Private|Friend)\s+)?(?:Static\s+)?(?:Sub|Function)\s+\w+/im
const PROC_END = /^\s*End\s+(?:Sub|Function)\b[^\n]*$/gim
const CODE_START = /^(?:Option|Attribute|Public|Private|Friend|Sub|Function|Dim|Const|Declare|Type|Enum|Static|#|'|Rem\b)/i

/**
 * Ambil kode VBA dari balasan AI. Teks di luar blok kode dibuang. Balasan yang bukan VBA
 * (terjemahan, Python, esai, penolakan) ditolak, jadi nggak pernah tersimpan sebagai "macro".
 */
export function extractVba(raw: string): VbaExtract {
  let text = (raw ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) return { ok: false, reason: 'empty' }

  const fence = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/)
  text = fence ? fence[1].trim() : text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim()
  if (!text) return { ok: false, reason: 'empty' }

  if (!PROC_START.test(text) || !/^\s*End\s+(?:Sub|Function)\b/im.test(text)) {
    return { ok: false, reason: /^\s*'\s*ERROR/i.test(text) ? 'refusal' : 'not_vba' }
  }

  // Kode harus dimulai sebagai kode/komentar (bukan kalimat pengantar yang terselip di blok).
  const firstLine = text.split('\n').find((l) => l.trim() !== '') ?? ''
  if (!CODE_START.test(firstLine.trim())) return { ok: false, reason: 'not_vba' }

  // Buang teks penutup setelah End Sub/Function terakhir.
  let lastEnd = -1
  for (const m of text.matchAll(PROC_END)) lastEnd = (m.index ?? 0) + m[0].length
  if (lastEnd > 0) text = text.slice(0, lastEnd).trim()

  if (text.length > AI_LIMITS.codeMaxChars) return { ok: false, reason: 'too_long' }
  return { ok: true, code: text }
}

/** Awalan jawaban penjelasan dari AI, dan juga penanda di riwayat chat (isi pesan asisten diawali ini). */
export const EXPLAIN_PREFIX = 'PENJELASAN:'

export type ExplainExtract =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'not_explanation' }

/**
 * Ambil teks penjelasan dari balasan AI. Penjelasan nggak boleh berisi kode lengkap (itu jalur revisi yang dipindai),
 * dan dibatasi panjangnya supaya nggak jadi jalur tanya jawab umum.
 */
export function extractExplanation(raw: string): ExplainExtract {
  const text = (raw ?? '').replace(/\r\n/g, '\n').trim().replace(/^PENJELASAN:\s*/i, '').trim()
  if (!text) return { ok: false, reason: 'empty' }
  const hasProcedure = PROC_START.test(text) && /^\s*End\s+(?:Sub|Function)\b/im.test(text)
  const longFence = [...text.matchAll(/```[a-zA-Z]*\n([\s\S]*?)```/g)].some((m) => m[1].trim().split('\n').length > 12)
  if (hasProcedure || longFence) return { ok: false, reason: 'not_explanation' }
  if (text.length > AI_LIMITS.explainMaxChars) return { ok: false, reason: 'too_long' }
  return { ok: true, text }
}

const EXPLAIN_WORDS =
  /\b(?:jelaskan|jelasin|penjelasan|artinya|arti dari|maksud(?:nya)?|apa (?:itu|fungsi|arti)|kenapa|mengapa|cara kerja|gimana kerja|bagaimana kerja|explain|what does)\b/i
const CHANGE_WORDS = /\b(?:ubah|ganti|tambah(?:kan)?|hapus|buat(?:kan)?|perbaiki|benerin|betulin|revisi|fix|modifikasi|sesuaikan|kurangi|pindah(?:kan)?)\b/i

/**
 * Tebakan cepat (tanpa AI): apakah pesan ini murni minta penjelasan? Dipakai cuma untuk menolak lebih awal setelah batas
 * penjelasan habis, jadi pesan campuran ("jelaskan lalu ubah...") dianggap revisi supaya nggak salah blokir.
 * Penentu akhirnya tetap jenis balasan AI.
 */
export function looksLikeExplainRequest(message: string): boolean {
  return EXPLAIN_WORDS.test(message) && !CHANGE_WORDS.test(message)
}

/** Hapus komentar VBA (di luar tanda kutip) supaya pemindaian nggak salah baca komentar. */
export function stripVbaComments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      let inString = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') inString = !inString
        else if (ch === "'" && !inString) return line.slice(0, i)
      }
      return line
    })
    .filter((l) => !/^\s*Rem\b/i.test(l))
    .join('\n')
}

type Rule = { re: RegExp; label: string }

// Diblokir: macro dijalankan di komputer pengguna, jadi perintah ini terlalu berisiko untuk dihasilkan AI.
const BLOCKED: Rule[] = [
  { re: /\bShell\s*\(|^\s*Shell\s+["\w]/im, label: 'menjalankan program lain (Shell)' },
  { re: /WScript|CScript|Shell\.Application|mshta|powershell|cmd\.exe|\bcmd\s*\/c/i, label: 'menjalankan skrip atau perintah sistem' },
  { re: /URLDownloadToFile|XMLHTTP|WinHttp|MSXML2|InternetExplorer|ADODB\.Stream/i, label: 'mengakses internet atau mengunduh file' },
  { re: /\bSendKeys\b/i, label: 'mengontrol keyboard (SendKeys)' },
  { re: /\bDeclare\s+(?:PtrSafe\s+)?(?:Function|Sub)\b/i, label: 'memanggil fungsi sistem Windows (Declare)' },
  { re: /\bVBProject\b|\bVBComponents\b/i, label: 'mengubah kode VBA lewat kode' },
  { re: /winmgmts|Win32_Process/i, label: 'mengakses sistem lewat WMI' },
  {
    re: /\bCreateObject\s*\(\s*"(?!Scripting\.(?:Dictionary|FileSystemObject)\b|Outlook\.Application\b|Excel\.Application\b|Word\.Application\b)/i,
    label: 'membuat objek sistem yang nggak diizinkan (CreateObject)',
  },
]

// Diizinkan tapi diberi peringatan ke pengguna.
const WARNINGS: Rule[] = [
  { re: /\b(?:Kill|RmDir)\b|DeleteFile|DeleteFolder/i, label: 'menghapus file atau folder' },
  { re: /\b(?:Auto_Open|Workbook_Open|Document_Open)\b/i, label: 'berjalan otomatis saat file dibuka' },
  { re: /SaveSetting|DeleteSetting|RegWrite/i, label: 'mengubah pengaturan registry' },
]

export function scanVba(code: string): { blocked: string[]; warnings: string[] } {
  const clean = stripVbaComments(code)
  return {
    blocked: BLOCKED.filter((r) => r.re.test(clean)).map((r) => r.label),
    warnings: WARNINGS.filter((r) => r.re.test(clean)).map((r) => r.label),
  }
}

/** Bungkus teks pengguna sebagai DATA. Tag penutup palsu di dalam teks dibuang supaya nggak bisa "keluar" dari blok. */
export function wrapUserText(tag: 'permintaan' | 'pesan', text: string): string {
  const safe = text.replace(/<\/?\s*(?:permintaan|pesan)\b[^>]*>/gi, '').trim()
  return `<${tag}>\n${safe}\n</${tag}>`
}

/** Batasi riwayat chat yang dikirim ke AI: paling baru dulu, sampai batas jumlah dan karakter. */
export function trimHistory<T extends { content: string }>(history: T[]): T[] {
  const out: T[] = []
  let chars = 0
  for (let i = history.length - 1; i >= 0 && out.length < AI_LIMITS.historyMaxMessages; i--) {
    const len = history[i].content.length
    if (chars + len > AI_LIMITS.historyMaxChars) break
    chars += len
    out.unshift(history[i])
  }
  return out
}

export const REJECTION_MESSAGES = {
  refusal: 'Permintaan ini di luar topik. BikinMacro cuma bisa membuat dan merevisi macro Excel VBA.',
  not_vba: 'Balasan AI bukan kode macro yang valid, jadi nggak disimpan. Coba tulis permintaan kamu lebih spesifik soal Excel.',
  empty: 'AI nggak memberi jawaban. Coba lagi.',
  too_long: 'Macro yang dihasilkan terlalu panjang. Pecah permintaan kamu jadi bagian yang lebih kecil.',
  explain_limit: `Batas penjelasan (${AI_LIMITS.explainMax}x) untuk macro ini sudah tercapai. Kalau kodenya masih membingungkan, minta versi yang lebih sederhana atau dengan komentar yang lebih banyak, atau tulis ke kami lewat halaman Bantuan.`,
  unsafe: 'Macro ini butuh perintah yang nggak diizinkan di BikinMacro (menjalankan program lain atau akses internet), jadi nggak dibuat.',
} as const

export type RejectionReason = keyof typeof REJECTION_MESSAGES
