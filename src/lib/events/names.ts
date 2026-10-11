// Daftar kejadian yang dilacak. Murni (tanpa jaringan/DB) supaya bisa dipakai di klien, server, dan tes.

/** Kejadian yang boleh dikirim dari browser lewat POST /api/events. Selain ini ditolak. */
export const CLIENT_EVENTS = [
  'generate_view', // membuka halaman Generate (form awal)
  'questions_step', // lanjut ke pertanyaan detail
  'generate_submit', // menekan Generate Macro
  'copy_code', // menekan Copy VBA
  'download_bas', // mengunduh file .bas
  'guide_tab', // membuka tab panduan (props: tab)
  'history_resume', // melanjutkan chat dari Riwayat
] as const

/** Kejadian yang hanya dicatat server (hasilnya pasti, nggak bisa dipalsukan klien). */
export const SERVER_EVENTS = [
  'generate_success', // macro berhasil dibuat (props: category, prompt_len, ms)
  'chat_success', // revisi lewat chat berhasil
  'download_xlsm', // file .xlsm berhasil dirakit
  'download_xlsm_failed', // perakitan .xlsm gagal atau ditolak (props: reason)
] as const

export type ClientEventName = (typeof CLIENT_EVENTS)[number]
export type ServerEventName = (typeof SERVER_EVENTS)[number]
export type EventName = ClientEventName | ServerEventName

export function isClientEvent(name: unknown): name is ClientEventName {
  return typeof name === 'string' && (CLIENT_EVENTS as readonly string[]).includes(name)
}

export type EventProps = Record<string, string | number | boolean>

/** Properti dibatasi: maksimal 8 kunci, nilai primitif, teks maksimal 100 karakter. Sisanya dibuang. */
export function sanitizeProps(input: unknown): EventProps {
  const out: EventProps = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= 8) break
    if (!/^[a-z_]{1,30}$/.test(key)) continue
    if (typeof value === 'string') out[key] = value.slice(0, 100)
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
    else if (typeof value === 'boolean') out[key] = value
  }
  return out
}
