// Agregasi perilaku untuk /north/behavior. Murni (tanpa DB) supaya gampang dites.
// Sumber: events (unduhan, funnel) digabung data yang sudah ada (generations, generation_chats, last sign-in).

export type UserRow = { id: string; email: string; plan: string; role: string; created_at: string }
export type GenerationRow = { id: string; user_id: string; created_at: string; category: string | null; prompt: string }
export type ChatRow = { generation_id: string; user_id: string; role: string; created_at: string }
export type EventRow = { user_id: string; name: string; created_at: string }
export type RejectionRow = { user_id: string }

export type ReportInput = {
  now: Date
  users: UserRow[]
  signIns: Map<string, string | null>
  generations: GenerationRow[]
  chats: ChatRow[]
  events: EventRow[]
  rejections: RejectionRow[]
  includeAdmins: boolean
}

export const FUNNEL_STEPS = [
  { key: 'generate_view', label: 'Membuka halaman Generate', names: ['generate_view'] },
  { key: 'questions_step', label: 'Lanjut ke pertanyaan detail', names: ['questions_step'] },
  { key: 'generate_submit', label: 'Menekan Generate Macro', names: ['generate_submit'] },
  { key: 'generate_success', label: 'Macro berhasil dibuat', names: ['generate_success'] },
  { key: 'output', label: 'Memakai hasil (salin atau unduh)', names: ['copy_code', 'download_bas', 'download_xlsm'] },
  { key: 'chat_success', label: 'Merevisi lewat chat', names: ['chat_success'] },
] as const

export type PerUser = {
  id: string
  email: string
  plan: string
  isAdmin: boolean
  joinedAt: string
  lastActive: string | null
  activeDays: number
  generations: number
  chats: number
  copy: number
  bas: number
  xlsm: number
  rejections: number
  /** Menit dari akun dibuat sampai generate pertama (dalam periode laporan). */
  minutesToFirstGeneration: number | null
}

export type Report = {
  summary: {
    users: number
    active7d: number
    usersWithGeneration: number
    generations: number
    revisionRate: number // porsi generasi yang direvisi minimal sekali
    chatsPerGeneration: number
  }
  funnel: { key: string; label: string; users: number; ofFirst: number | null; ofPrevious: number | null }[]
  formats: { copy: number; bas: number; xlsm: number; xlsmFailed: number }
  perUser: PerUser[]
  recent: { createdAt: string; email: string; category: string; prompt: string; revisions: number }[]
}

const day = (iso: string) => iso.slice(0, 10)
const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)

export function buildReport(input: ReportInput): Report {
  const { now, signIns, includeAdmins } = input
  const users = input.users.filter((u) => includeAdmins || u.role !== 'admin')
  const allowed = new Set(users.map((u) => u.id))
  const emailById = new Map(input.users.map((u) => [u.id, u.email]))

  const generations = input.generations.filter((g) => allowed.has(g.user_id))
  const chats = input.chats.filter((c) => allowed.has(c.user_id) && c.role === 'user')
  const events = input.events.filter((e) => allowed.has(e.user_id))
  const rejections = input.rejections.filter((r) => allowed.has(r.user_id))

  const chatsByGeneration = new Map<string, number>()
  for (const c of chats) chatsByGeneration.set(c.generation_id, (chatsByGeneration.get(c.generation_id) ?? 0) + 1)

  const perUser = new Map<string, PerUser & { days: Set<string> }>()
  for (const u of users) {
    const lastSignIn = signIns.get(u.id) ?? null
    perUser.set(u.id, {
      id: u.id, email: u.email, plan: u.plan, isAdmin: u.role === 'admin', joinedAt: u.created_at,
      lastActive: lastSignIn, activeDays: 0, generations: 0, chats: 0, copy: 0, bas: 0, xlsm: 0, rejections: 0,
      minutesToFirstGeneration: null, days: new Set(lastSignIn ? [day(lastSignIn)] : []),
    })
  }
  const touch = (userId: string, at: string) => {
    const p = perUser.get(userId)
    if (!p) return null
    p.lastActive = later(p.lastActive, at)
    p.days.add(day(at))
    return p
  }

  const firstGeneration = new Map<string, string>()
  for (const g of generations) {
    const p = touch(g.user_id, g.created_at)
    if (!p) continue
    p.generations++
    const first = firstGeneration.get(g.user_id)
    if (!first || g.created_at < first) firstGeneration.set(g.user_id, g.created_at)
  }
  for (const c of chats) {
    const p = touch(c.user_id, c.created_at)
    if (p) p.chats++
  }
  for (const e of events) {
    const p = touch(e.user_id, e.created_at)
    if (!p) continue
    if (e.name === 'copy_code') p.copy++
    else if (e.name === 'download_bas') p.bas++
    else if (e.name === 'download_xlsm') p.xlsm++
  }
  for (const r of rejections) {
    const p = perUser.get(r.user_id)
    if (p) p.rejections++
  }
  for (const [userId, at] of firstGeneration) {
    const p = perUser.get(userId)
    const joined = users.find((u) => u.id === userId)?.created_at
    if (p && joined) p.minutesToFirstGeneration = Math.max(0, Math.round((Date.parse(at) - Date.parse(joined)) / 60000))
  }

  const rows: PerUser[] = [...perUser.values()]
    .map(({ days, ...rest }) => ({ ...rest, activeDays: days.size }))
    .sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? ''))

  const usersByEvent = new Map<string, Set<string>>()
  for (const e of events) {
    if (!usersByEvent.has(e.name)) usersByEvent.set(e.name, new Set())
    usersByEvent.get(e.name)!.add(e.user_id)
  }
  const funnel: Report['funnel'] = []
  FUNNEL_STEPS.forEach((step, i) => {
    const set = new Set<string>()
    for (const n of step.names) for (const id of usersByEvent.get(n) ?? []) set.add(id)
    const prev = i > 0 ? funnel[i - 1].users : null
    funnel.push({
      key: step.key, label: step.label, users: set.size,
      ofFirst: i === 0 || funnel[0].users === 0 ? null : set.size / funnel[0].users,
      ofPrevious: prev === null || prev === 0 ? null : set.size / prev,
    })
  })

  const count = (name: string) => events.filter((e) => e.name === name).length
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const revised = generations.filter((g) => (chatsByGeneration.get(g.id) ?? 0) > 0).length

  const recent = [...generations]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 30)
    .map((g) => ({
      createdAt: g.created_at,
      email: emailById.get(g.user_id) ?? g.user_id,
      category: g.category ?? 'Lainnya',
      prompt: g.prompt.split('\n\nDetail tambahan:')[0].slice(0, 300),
      revisions: chatsByGeneration.get(g.id) ?? 0,
    }))

  return {
    summary: {
      users: users.length,
      active7d: rows.filter((r) => r.lastActive && r.lastActive >= sevenDaysAgo).length,
      usersWithGeneration: rows.filter((r) => r.generations > 0).length,
      generations: generations.length,
      revisionRate: generations.length ? revised / generations.length : 0,
      chatsPerGeneration: generations.length ? chats.length / generations.length : 0,
    },
    funnel,
    formats: { copy: count('copy_code'), bas: count('download_bas'), xlsm: count('download_xlsm'), xlsmFailed: count('download_xlsm_failed') },
    perUser: rows,
    recent,
  }
}
