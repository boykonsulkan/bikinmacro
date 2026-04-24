import { createClient } from '@/utils/supabase/server'
import { CreditCard, Search, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default async function NorthTransactionsPage() {
  const supabase = await createClient()

  // Fetch payments with user details
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      *,
      users (email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-500 p-6">Error loading transactions: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor revenue and payment statuses from Midtrans.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
          <Search size={16} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
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
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Amount</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{(p.users as any)?.email || 'Unknown User'}</p>
                    <p className="text-[10px] text-gray-400 font-mono uppercase">{p.user_id.slice(0, 8)}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900 capitalize">{p.plan}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900">
                    Rp {p.amount.toLocaleString('id-ID')}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {p.status === 'success' ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle size={12} /> Success
                      </span>
                    ) : p.status === 'pending' ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} /> Pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle size={12} /> {p.status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600">{format(new Date(p.created_at), 'MMM d, yyyy')}</p>
                  <p className="text-[10px] text-gray-400">{format(new Date(p.created_at), 'HH:mm')}</p>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                      {p.mayar_ref || 'N/A'}
                      {p.mayar_ref && (
                        <button className="text-gray-300 hover:text-primary transition-colors">
                          <ExternalLink size={12} />
                        </button>
                      )}
                   </div>
                </td>
              </tr>
            ))}
            {payments?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <CreditCard size={48} className="mx-auto mb-4 opacity-10" />
                  <p>No transactions found yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
