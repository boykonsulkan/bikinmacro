// Tes pelacakan perilaku: npx tsx scripts/test-events.ts
import { CLIENT_EVENTS, SERVER_EVENTS, isClientEvent, sanitizeProps } from '../src/lib/events/names'
import { buildReport } from '../src/lib/events/report'

let fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok ? '' : '  ' + detail))
  if (!ok) fail++
}

// daftar putih
check('nama kejadian klien dikenali', isClientEvent('download_bas') && isClientEvent('copy_code'))
check('kejadian server TIDAK bisa dikirim klien', SERVER_EVENTS.every((n) => !isClientEvent(n)))
check('nama asing dan bukan teks ditolak', !isClientEvent('hapus_semua') && !isClientEvent(42) && !isClientEvent(undefined))
check('tidak ada nama ganda', new Set([...CLIENT_EVENTS, ...SERVER_EVENTS]).size === CLIENT_EVENTS.length + SERVER_EVENTS.length)

// properti
check('properti: teks dipotong 100 karakter', String(sanitizeProps({ tab: 'x'.repeat(500) }).tab).length === 100)
check('properti: objek, array, fungsi dibuang', Object.keys(sanitizeProps({ a: { b: 1 }, c: [1], d: () => 1, ok: 1 })).join() === 'ok')
check('properti: kunci aneh dibuang', Object.keys(sanitizeProps({ 'a b': 1, '../x': 1, tab: 'ok' })).join() === 'tab')
check('properti: maksimal 8 kunci', Object.keys(sanitizeProps(Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['k' + 'a'.repeat(i + 1), i])))).length === 8)
check('properti: bukan objek menghasilkan kosong', Object.keys(sanitizeProps('x')).length === 0 && Object.keys(sanitizeProps(null)).length === 0 && Object.keys(sanitizeProps([1])).length === 0)
check('properti: NaN dan Infinity dibuang', Object.keys(sanitizeProps({ a: NaN, b: Infinity })).length === 0)

// laporan
const now = new Date('2026-10-12T12:00:00Z')
const users = [
  { id: 'u1', email: 'a@x.id', plan: 'starter', role: 'user', created_at: '2026-10-10T08:00:00Z' },
  { id: 'u2', email: 'b@x.id', plan: 'starter', role: 'user', created_at: '2026-10-01T08:00:00Z' },
  { id: 'adm', email: 'boss@x.id', plan: 'pro', role: 'admin', created_at: '2026-04-01T08:00:00Z' },
]
const generations = [
  { id: 'g1', user_id: 'u1', created_at: '2026-10-10T08:30:00Z', category: 'Data Processing', prompt: 'rekap\n\nDetail tambahan:\nSheet mana → A' },
  { id: 'g2', user_id: 'u1', created_at: '2026-10-11T09:00:00Z', category: null, prompt: 'laporan' },
  { id: 'g3', user_id: 'adm', created_at: '2026-10-11T10:00:00Z', category: 'Lainnya', prompt: 'uji admin' },
]
const chats = [
  { generation_id: 'g1', user_id: 'u1', role: 'user', created_at: '2026-10-10T08:40:00Z' },
  { generation_id: 'g1', user_id: 'u1', role: 'assistant', created_at: '2026-10-10T08:40:05Z' },
  { generation_id: 'g1', user_id: 'u1', role: 'user', created_at: '2026-10-10T08:50:00Z' },
]
const ev = (user_id: string, name: string, created_at = '2026-10-10T08:20:00Z') => ({ user_id, name, created_at })
const events = [
  ev('u1', 'generate_view'), ev('u2', 'generate_view'), ev('adm', 'generate_view'),
  ev('u1', 'questions_step'), ev('u1', 'generate_submit'), ev('u1', 'generate_success'),
  ev('u1', 'download_bas'), ev('u1', 'download_bas'), ev('u1', 'download_xlsm'), ev('u1', 'download_xlsm_failed'), ev('u1', 'chat_success'),
  ev('adm', 'download_bas'),
]
const signIns = new Map<string, string | null>([['u1', '2026-10-12T07:00:00Z'], ['u2', null], ['adm', '2026-10-12T11:00:00Z']])
const base = { now, users, signIns, generations, chats, events, rejections: [{ user_id: 'u2' }, { user_id: 'adm' }] }

const r = buildReport({ ...base, includeAdmins: false })
check('admin dikeluarkan secara default', r.summary.users === 2 && !r.perUser.some((p) => p.isAdmin))
check('jumlah generasi tanpa admin', r.summary.generations === 2 && r.summary.usersWithGeneration === 1)
check('tingkat revisi: 1 dari 2 generasi', r.summary.revisionRate === 0.5)
check('chat per generasi menghitung pesan pengguna saja', r.summary.chatsPerGeneration === 1)
check('funnel: pengguna unik per langkah', r.funnel.map((f) => f.users).join() === '2,1,1,1,1,1', r.funnel.map((f) => f.users).join())
check('funnel: persen terhadap langkah awal', r.funnel[1].ofFirst === 0.5 && r.funnel[0].ofFirst === null)
check('funnel: persen terhadap langkah sebelumnya', r.funnel[4].ofPrevious === 1)
check('format unduhan dihitung tanpa admin', r.formats.bas === 2 && r.formats.xlsm === 1 && r.formats.xlsmFailed === 1 && r.formats.copy === 0, JSON.stringify(r.formats))
const u1 = r.perUser.find((p) => p.id === 'u1')!
check('per pengguna: generate, chat, unduhan', u1.generations === 2 && u1.chats === 2 && u1.bas === 2 && u1.xlsm === 1)
check('waktu ke generate pertama = 30 menit', u1.minutesToFirstGeneration === 30, String(u1.minutesToFirstGeneration))
check('hari aktif menggabungkan login, generate, chat, event', u1.activeDays === 3, String(u1.activeDays))
check('terakhir aktif memakai kejadian terbaru', u1.lastActive === '2026-10-12T07:00:00Z')
const u2 = r.perUser.find((p) => p.id === 'u2')!
check('pengguna yang cuma membuka halaman: tercatat aktif, tanpa generate', u2.generations === 0 && u2.minutesToFirstGeneration === null && u2.lastActive === '2026-10-10T08:20:00Z' && u2.rejections === 1)
check('aktif 7 hari menghitung login dan kejadian', r.summary.active7d === 2)
const ghost = buildReport({ ...base, events: [], signIns: new Map(), includeAdmins: false }).perUser.find((p) => p.id === 'u2')!
check('pengguna tanpa aktivitas sama sekali: kosong dan tidak error', ghost.lastActive === null && ghost.activeDays === 0)
check('urutan: terakhir aktif paling atas', r.perUser[0].id === 'u1')
check('permintaan terbaru: detail form dipotong, kategori default', r.recent[1].prompt === 'rekap' && r.recent[0].category === 'Lainnya' && r.recent[1].revisions === 2)

const withAdmin = buildReport({ ...base, includeAdmins: true })
check('opsi sertakan admin', withAdmin.summary.users === 3 && withAdmin.summary.generations === 3 && withAdmin.funnel[0].users === 3)

const empty = buildReport({ ...base, users: [], generations: [], chats: [], events: [], rejections: [], includeAdmins: false })
check('data kosong: tanpa pembagian nol', empty.summary.revisionRate === 0 && empty.funnel.every((f) => f.ofFirst === null && f.ofPrevious === null))

console.log(fail ? `\n${fail} GAGAL` : '\nSEMUA LOLOS')
process.exit(fail ? 1 : 0)
