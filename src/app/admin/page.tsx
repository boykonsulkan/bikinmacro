import { createClient } from '@/utils/supabase/server'
import { Users, FileCode2, TrendingUp, Activity } from 'lucide-react'

export default async function AdminOverview() {
  const supabase = await createClient()

  const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
  const { count: macrosCount } = await supabase.from('generations').select('*', { count: 'exact', head: true })
  
  // Just placeholders for now since we don't have complex charts built
  // Recharts would be used here dynamically

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-8">Dashboard Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-card border border-border p-6 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Total Users</p>
              <h3 className="text-3xl font-bold text-foreground">{usersCount || 0}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <Users size={20} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Macros Generated</p>
              <h3 className="text-3xl font-bold text-foreground">{macrosCount || 0}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <FileCode2 size={20} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Active Users (This Month)</p>
              <h3 className="text-3xl font-bold text-foreground">0</h3>
            </div>
            <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
              <Activity size={20} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Est. MRR</p>
              <h3 className="text-3xl font-bold text-foreground">Rp 0</h3>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border rounded-2xl p-6 h-80 flex flex-col items-center justify-center text-muted">
          <p>Chart: New Registrations (Last 30 Days)</p>
          <p className="text-xs mt-2">(Recharts implementation)</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 h-80 flex flex-col items-center justify-center text-muted">
          <p>Chart: Plan Distribution</p>
          <p className="text-xs mt-2">(Recharts implementation)</p>
        </div>
      </div>
    </div>
  )
}
