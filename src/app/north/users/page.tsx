import { createClient } from '@/utils/supabase/server'
import { Users as UsersIcon, Search, MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'

export default async function NorthUsersPage() {
  const supabase = await createClient()

  // Fetch users with their stats
  // Since we don't have a complex view, we can do multiple queries or a single query with subqueries if supported.
  // Supabase JS doesn't support complex joins with counts easily without views.
  // We'll fetch users and then maybe aggregate if list is small, or just show basic info for now.
  // Actually, let's just get the users list first.
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      *,
      generations (id),
      generation_chats (id)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-500 p-6">Error loading users: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor your application users.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
          <Search size={16} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="bg-transparent border-none focus:outline-none text-sm w-64"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">User</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Plan</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Stats</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Usage</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Joined</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u.email}</p>
                      <p className="text-xs text-gray-400 font-mono">{u.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    u.plan === 'pro' ? 'bg-orange-100 text-orange-700' : 
                    u.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {u.plan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="font-bold text-gray-900">{(u.generations as any[]).length}</span> macros
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="font-bold text-gray-900">{(u.generation_chats as any[]).length}</span> chats
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="w-24">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">Credits</span>
                      <span className="font-bold text-gray-900">{u.credits_used}/{u.credits_limit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${u.credits_used >= u.credits_limit ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (u.credits_used / u.credits_limit) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600">{format(new Date(u.created_at), 'MMM d, yyyy')}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
