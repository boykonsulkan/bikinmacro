import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/utils/supabase/server'
import { getAdminForPage, serviceClient } from '@/lib/orders/server'
import { isBanned } from '@/lib/admin/users'
import UsersTable from './UsersTable'
import type { UserRowView } from './UsersTable'

export const dynamic = 'force-dynamic'

export default async function NorthUsersPage() {
  const admin = await getAdminForPage()
  if (!admin) redirect('/north/login')

  const supabase = await createClient()
  // Daftar pengguna dan status blokir (Supabase Auth) diambil bersamaan, bukan berurutan.
  const [{ data: users, error }, list] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, role, plan, credits_used, credits_limit, created_at, generations (id), generation_chats (id)')
      .order('created_at', { ascending: false }),
    serviceClient().auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (error) {
    return <div className="text-red-500 p-6">Error loading users: {error.message}</div>
  }

  // Status nonaktif ada di Supabase Auth (banned_until), bukan di tabel users.
  const banned = new Map<string, string | null>()
  for (const u of list.data?.users ?? []) banned.set(u.id, u.banned_until ?? null)

  const rows: UserRowView[] = (users ?? []).map((u) => ({
    id: u.id as string,
    email: u.email as string,
    role: (u.role as string | null) ?? null,
    plan: (u.plan as string | null) ?? 'free',
    creditsUsed: (u.credits_used as number | null) ?? 0,
    creditsLimit: (u.credits_limit as number | null) ?? 0,
    joined: format(new Date(u.created_at as string), 'MMM d, yyyy'),
    macros: (u.generations as unknown[]).length,
    chats: (u.generation_chats as unknown[]).length,
    deactivated: isBanned(banned.get(u.id as string)),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola paket, nonaktifkan akun (bisa dibatalkan), atau hapus permanen akun yang sudah nonaktif.
        </p>
      </div>
      <UsersTable rows={rows} adminId={admin.id} />
    </div>
  )
}
