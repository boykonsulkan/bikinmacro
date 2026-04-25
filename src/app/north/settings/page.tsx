import { createClient } from '@/utils/supabase/server'
import { saveSettings } from './actions'
import { Sliders, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import AiConfigClient from './AiConfigClient'
import SystemContextForm from './SystemContextForm'

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
]

const MODEL_HINTS: Record<string, string[]> = {
  openrouter: [
    'anthropic/claude-3-5-sonnet',
    'anthropic/claude-3-haiku',
    'openai/gpt-4o-mini',
    'google/gemini-flash-1.5',
    'meta-llama/llama-3.1-8b-instruct:free',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-3.5-turbo',
  ],
}

export default async function NorthSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; plan?: string }>
}) {
  const { saved, plan: selectedPlan = 'free' } = await searchParams
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from('plan_settings')
    .select('*')
    .eq('plan', selectedPlan)
    .single()

  const currentProvider = settings?.ai_provider || 'openrouter'

  let apiKeyUsage = null
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        next: { revalidate: 60 }
      })
      const data = await res.json()
      if (data && data.data) {
        apiKeyUsage = data.data
      }
    } catch (e) {
      console.error(e)
    }
  }

  const plans = [
    { id: 'free', label: 'Free' },
    { id: 'starter', label: 'Starter' },
    { id: 'pro', label: 'Pro' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure AI provider, system context, and usage limits per plan.</p>
        </div>
      </div>

      {/* Plan Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {plans.map((p) => (
          <a
            key={p.id}
            href={`/north/settings?plan=${p.id}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedPlan === p.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </a>
        ))}
      </div>

      {saved === 'ok' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          <CheckCircle size={16} />
          Pengaturan untuk plan <strong>{selectedPlan}</strong> berhasil disimpan.
        </div>
      )}
      {saved === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertCircle size={16} />
          Gagal menyimpan pengaturan. Coba lagi.
        </div>
      )}

      <form action={saveSettings} className="space-y-6">
        <input type="hidden" name="plan" value={selectedPlan} />
        
        <AiConfigClient 
          initialProvider={currentProvider} 
          initialModel={settings?.ai_model || ''}
          apiKeyUsage={apiKeyUsage}
        />

        <SystemContextForm initialValue={settings?.system_context || ''} />

        {/* Usage Limits */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Usage Limits — {selectedPlan.toUpperCase()}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Specific limits for users on the {selectedPlan} plan.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="credits_limit">
                Macros / month
              </label>
              <input
                id="credits_limit"
                name="credits_limit"
                type="number"
                min={0}
                defaultValue={settings?.credits_limit ?? 3}
                className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="max_chat_per_generation">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-gray-400" />
                  Max Chat / macro
                </span>
              </label>
              <input
                id="max_chat_per_generation"
                name="max_chat_per_generation"
                type="number"
                min={0}
                defaultValue={settings?.max_chat_per_generation ?? 10}
                className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5">Set 0 to disable chat refinement.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            Save {selectedPlan.toUpperCase()} Settings
          </button>
        </div>
      </form>
    </div>
  )
}
