import { createClient } from '@/utils/supabase/server'
import { Users, FileCode2, CreditCard, Activity, ArrowUpRight, BarChart3, Globe, Clock } from 'lucide-react'

export default async function NorthDashboard() {
  const supabase = await createClient()

  // Fetch real data
  const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
  const { count: generationsCount } = await supabase.from('generations').select('*', { count: 'exact', head: true })
  
  const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'paid')
  const totalRevenue = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor your application's performance and analytics.</p>
      </div>

      {/* Primary Stats (Real Data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl font-semibold text-gray-900">{usersCount || 0}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Generations</h3>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <FileCode2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-semibold text-gray-900">{generationsCount || 0}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="text-3xl font-semibold text-gray-900">Rp {totalRevenue.toLocaleString('id-ID')}</div>
        </div>
      </div>

      <div className="mt-12 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Deep Analytics</h2>
        <p className="text-sm text-gray-500">Detailed insights into visitor behavior and demographics.</p>
      </div>

      {/* Advanced Analytics (Coming Soon) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center transition-all">
            <span className="bg-white border border-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm mb-2 uppercase tracking-wide">
              Coming Soon
            </span>
            <p className="text-sm text-gray-500 font-medium">PostHog Integration Required</p>
          </div>
          <div className="flex items-center justify-between mb-6 opacity-40">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={18} className="text-gray-400" />
              Website Visits
            </h3>
            <select className="text-sm border-gray-200 rounded-md text-gray-500" disabled>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-64 flex items-end gap-2 opacity-20">
            {/* Fake chart bars */}
            {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
              <div key={i} className="flex-1 bg-gray-200 rounded-t-sm" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>

        {/* Traffic Sources Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center transition-all">
            <span className="bg-white border border-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm mb-2 uppercase tracking-wide">
              Coming Soon
            </span>
            <p className="text-sm text-gray-500 font-medium">Awaiting UTM Tracking Setup</p>
          </div>
          <div className="flex items-center justify-between mb-6 opacity-40">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Globe size={18} className="text-gray-400" />
              Traffic Sources
            </h3>
          </div>
          <div className="space-y-4 opacity-20">
            {[
              { name: 'Direct', val: '45%' },
              { name: 'Google Search', val: '30%' },
              { name: 'Twitter', val: '15%' },
              { name: 'Referral', val: '10%' }
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-sm font-medium text-gray-600">{s.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demographics Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group lg:col-span-2">
          <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center transition-all">
            <span className="bg-white border border-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm mb-2 uppercase tracking-wide">
              Coming Soon
            </span>
            <p className="text-sm text-gray-500 font-medium">Demographics profiling will be enabled in v2.0</p>
          </div>
          <div className="flex items-center justify-between mb-6 opacity-40">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-gray-400" />
              User Demographics (Age)
            </h3>
          </div>
          <div className="h-48 flex items-end justify-around gap-4 opacity-20 px-10">
             {/* Fake chart bars */}
             {[
               { age: '18-24', h: 20 },
               { age: '25-34', h: 80 },
               { age: '35-44', h: 60 },
               { age: '45-54', h: 30 },
               { age: '55+', h: 10 }
             ].map((d, i) => (
              <div key={i} className="flex flex-col items-center w-full">
                <div className="w-full max-w-16 bg-gray-200 rounded-t-md" style={{ height: `${d.h}px` }}></div>
                <span className="text-xs text-gray-400 mt-2">{d.age}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
