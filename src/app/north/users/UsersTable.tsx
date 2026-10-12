'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search, Settings2, X } from 'lucide-react'
import { PLAN_OPTIONS } from '@/lib/admin/users'
import { changePlanAction, deactivateAction, hardDeleteAction, reactivateAction, resetCreditsAction } from './actions'
import type { ActionResult } from './actions'

export type UserRowView = {
  id: string
  email: string
  role: string | null
  plan: string
  creditsUsed: number
  creditsLimit: number
  joined: string
  macros: number
  chats: number
  deactivated: boolean
}

const PLAN_STYLE: Record<string, string> = {
  pro: 'bg-orange-100 text-orange-700',
  starter: 'bg-blue-100 text-blue-700',
  addon: 'bg-emerald-100 text-emerald-700',
}

export default function UsersTable({ rows, adminId }: { rows: UserRowView[]; adminId: string }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => (status === 'all' || (status === 'inactive') === r.deactivated) && (!q || r.email.toLowerCase().includes(q) || r.id.startsWith(q)))
  }, [rows, query, status])

  const selected = rows.find((r) => r.id === openId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
          <Search size={16} className="text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari email atau ID..."
            aria-label="Cari pengguna"
            className="bg-transparent border-none focus:outline-none text-sm w-64"
          />
        </div>
        {(['all', 'active', 'inactive'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${status === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900'}`}
          >
            {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Nonaktif'}
            {s === 'inactive' && rows.some((r) => r.deactivated) ? ` (${rows.filter((r) => r.deactivated).length})` : ''}
          </button>
        ))}
        <span className="text-xs text-gray-400">{shown.length} dari {rows.length}</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              {['User', 'Plan', 'Stats', 'Usage', 'Joined', ''].map((h) => (
                <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shown.map((u) => (
              <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${u.deactivated ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {u.email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {u.email}
                        {u.role === 'admin' && <span className="ml-2 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white">ADMIN</span>}
                        {u.deactivated && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">NONAKTIF</span>}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{u.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${PLAN_STYLE[u.plan] ?? 'bg-gray-100 text-gray-600'}`}>{u.plan}</span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-600">
                  <p><span className="font-bold text-gray-900">{u.macros}</span> macros</p>
                  <p><span className="font-bold text-gray-900">{u.chats}</span> chats</p>
                </td>
                <td className="px-6 py-4">
                  <div className="w-24">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">Credits</span>
                      <span className="font-bold text-gray-900">{u.creditsUsed}/{u.creditsLimit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${u.creditsUsed >= u.creditsLimit ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, u.creditsLimit ? (u.creditsUsed / u.creditsLimit) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.joined}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setOpenId(u.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    aria-label={`Kelola ${u.email}`}
                  >
                    <Settings2 size={14} aria-hidden="true" /> Kelola
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Tidak ada pengguna yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <ManagePanel key={selected.id} user={selected} isSelf={selected.id === adminId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function ManagePanel({ user, isSelf, onClose }: { user: UserRowView; isSelf: boolean; onClose: () => void }) {
  const [pending, start] = useTransition()
  const [plan, setPlan] = useState(user.plan)
  const [confirm, setConfirm] = useState('')
  const [result, setResult] = useState<ActionResult | null>(null)
  const protectedAccount = user.role === 'admin' || isSelf

  const run = (fn: () => Promise<ActionResult>, after?: (r: ActionResult) => void) =>
    start(async () => {
      const r = await fn()
      setResult(r)
      after?.(r)
    })

  const section = 'rounded-xl border border-gray-200 p-4'
  const btn = 'rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Kelola ${user.email}`}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Kelola pengguna</h2>
            <p className="mt-1 font-mono text-xs text-gray-500">{user.email}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-1 text-gray-400 hover:text-gray-900"><X size={18} /></button>
        </div>

        {result && (
          <p role="status" className={`mt-4 rounded-lg border p-3 text-sm font-medium ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {result.message}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <section className={section}>
            <h3 className="text-sm font-bold text-gray-900">Paket</h3>
            <p className="mt-1 text-xs text-gray-500">Mengubah paket juga menyetel batas kredit sesuai pengaturan paket itu. Kredit terpakai tidak berubah.</p>
            <div className="mt-3 flex gap-2">
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" aria-label="Paket">
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button disabled={pending || plan === user.plan} onClick={() => run(() => changePlanAction(user.id, plan))} className={`${btn} bg-gray-900 text-white`}>Simpan paket</button>
            </div>
            <button disabled={pending} onClick={() => run(() => resetCreditsAction(user.id))} className={`${btn} mt-3 border border-gray-200 text-gray-700`}>
              Reset kredit terpakai ke 0 ({user.creditsUsed}/{user.creditsLimit})
            </button>
          </section>

          <section className={section}>
            <h3 className="text-sm font-bold text-gray-900">Status akun</h3>
            {protectedAccount ? (
              <p className="mt-1 text-xs text-gray-500">{isSelf ? 'Ini akunmu sendiri.' : 'Akun admin.'} Tidak bisa dinonaktifkan atau dihapus dari sini.</p>
            ) : user.deactivated ? (
              <>
                <p className="mt-1 text-xs text-gray-500">Akun nonaktif: tidak bisa masuk. Datanya masih ada.</p>
                <button disabled={pending} onClick={() => run(() => reactivateAction(user.id))} className={`${btn} mt-3 bg-emerald-600 text-white`}>Aktifkan kembali</button>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-gray-500">Nonaktifkan: dia langsung keluar dan tidak bisa masuk lagi, tapi semua datanya tetap ada dan bisa diaktifkan kembali kapan saja.</p>
                <button disabled={pending} onClick={() => run(() => deactivateAction(user.id))} className={`${btn} mt-3 border border-red-300 text-red-700`}>Nonaktifkan akun</button>
              </>
            )}
          </section>

          {!protectedAccount && (
            <section className={`${section} border-red-200 bg-red-50/40`}>
              <h3 className="text-sm font-bold text-red-700">Hapus permanen</h3>
              {user.deactivated ? (
                <>
                  <p className="mt-1 text-xs text-gray-600">
                    Menghapus akun, macro, riwayat chat, masukan, dan catatan pemakaian. <strong>Tidak bisa dibatalkan.</strong> Catatan
                    pembayaran tetap disimpan tanpa tautan ke akun. Pesanan layanan Dibuatin tidak ikut terhapus.
                  </p>
                  <label className="mt-3 block text-xs font-semibold text-gray-700" htmlFor="confirm-email">
                    Ketik email akun untuk konfirmasi
                  </label>
                  <input id="confirm-email" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={user.email} autoComplete="off" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm" />
                  <button
                    disabled={pending || confirm.trim().toLowerCase() !== user.email.toLowerCase()}
                    onClick={() => run(() => hardDeleteAction(user.id, confirm), (r) => r.ok && setTimeout(onClose, 1800))}
                    className={`${btn} mt-3 bg-red-600 text-white`}
                  >
                    Hapus permanen
                  </button>
                </>
              ) : (
                <p className="mt-1 text-xs text-gray-600">Nonaktifkan akun dulu. Hapus permanen hanya untuk akun yang sudah nonaktif.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
