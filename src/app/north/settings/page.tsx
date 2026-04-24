import { createClient } from '@/utils/supabase/server'
import { saveSettings } from './actions'
import { Sliders, MessageSquare, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import AiConfigClient from './AiConfigClient'

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
  searchParams: Promise<{ saved?: string }>
}) {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const currentProvider = settings?.ai_provider || 'openrouter'
  const { saved } = await searchParams

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure AI provider, system context, and usage limits.</p>
      </div>

      {saved === 'ok' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          <CheckCircle size={16} />
          Pengaturan berhasil disimpan.
        </div>
      )}
      {saved === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertCircle size={16} />
          Gagal menyimpan pengaturan. Coba lagi.
        </div>
      )}

      <form action={saveSettings} className="space-y-6">
        <AiConfigClient 
          initialProvider={currentProvider} 
          initialModel={settings?.ai_model || ''}
          apiKeyUsage={apiKeyUsage}
        />

        {/* System Context */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">System Context</h2>
              <p className="text-xs text-gray-400 mt-0.5">Custom instructions injected into every generation and chat prompt.</p>
            </div>
          </div>

          <textarea
            id="system_context"
            name="system_context"
            defaultValue={settings?.system_context || ''}
            rows={8}
            placeholder={`Contoh:\n- Semua macro harus kompatibel dengan Excel 2016\n- Selalu tambahkan logging ke sheet "Log"\n- Gunakan naming convention: camelCase untuk variabel`}
            className="w-full rounded-lg px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm resize-none font-mono"
          />
        </div>

        {/* Usage Limits */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Usage Limits</h2>
              <p className="text-xs text-gray-400 mt-0.5">Applies to new users. Existing users keep their current limits.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="free_credits_limit">
                Free Plan — Macros / month
              </label>
              <input
                id="free_credits_limit"
                name="free_credits_limit"
                type="number"
                min={0}
                defaultValue={settings?.free_credits_limit ?? 3}
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
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}
