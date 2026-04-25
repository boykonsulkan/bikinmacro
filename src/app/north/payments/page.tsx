import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle, AlertCircle, Plus } from 'lucide-react'
import ManualUpgradeForm from '@/app/north/payments/ManualUpgradeForm'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/north/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/north/login')

  // Fetch payments with user email
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, plan, amount, status, midtrans_id, created_at,
      users ( email )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola transaksi dan riwayat pembayaran.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Plan</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments?.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{payment.users?.email || 'Unknown'}</td>
                      <td className="px-6 py-4 uppercase text-xs font-bold tracking-wider text-gray-500">{payment.plan}</td>
                      <td className="px-6 py-4 text-gray-900">Rp {payment.amount.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Belum ada data pembayaran</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus size={16} /> Manual Upgrade
            </h3>
            <p className="text-xs text-gray-500 mb-6">Gunakan ini jika webhook Midtrans gagal atau user salah memasukkan email saat bayar di Midtrans.</p>
            
            <ManualUpgradeForm />
          </div>
        </div>
      </div>
    </div>
  )
}
