'use client'

import { useState } from 'react'
import { CreditCard, Link as LinkIcon, Save, Loader2 } from 'lucide-react'
import { savePaymentSettings } from './actions'

interface PaymentSettingsFormProps {
  initialProvider: string
  lynkUrls: {
    addon: string
    starter: string
    pro: string
  }
}

export default function PaymentSettingsForm({ initialProvider, lynkUrls }: PaymentSettingsFormProps) {
  const [provider, setProvider] = useState(initialProvider)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await savePaymentSettings(formData)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Payment settings saved successfully.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <CreditCard size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Global Payment Settings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Configure which payment provider is active across the platform.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Active Provider
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="payment_provider" 
                value="midtrans" 
                checked={provider === 'midtrans'}
                onChange={() => setProvider('midtrans')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-900">Midtrans</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="payment_provider" 
                value="lynk.id" 
                checked={provider === 'lynk.id'}
                onChange={() => setProvider('lynk.id')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-900">Lynk.id</span>
            </label>
          </div>
        </div>

        {provider === 'lynk.id' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Lynk.id Static Payment Links</h3>
            <p className="text-xs text-gray-500">Provide the static Lynk.id checkout URL for each plan.</p>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor="lynk_url_addon">
                Addon Plan (25k) URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="lynk_url_addon"
                  name="lynk_url_addon"
                  type="url"
                  placeholder="https://lynk.id/..."
                  defaultValue={lynkUrls.addon}
                  className="pl-10 w-full rounded-lg px-4 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor="lynk_url_starter">
                Starter Plan (79k) URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="lynk_url_starter"
                  name="lynk_url_starter"
                  type="url"
                  placeholder="https://lynk.id/..."
                  defaultValue={lynkUrls.starter}
                  className="pl-10 w-full rounded-lg px-4 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor="lynk_url_pro">
                Pro Plan (149k) URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="lynk_url_pro"
                  name="lynk_url_pro"
                  type="url"
                  placeholder="https://lynk.id/..."
                  defaultValue={lynkUrls.pro}
                  className="pl-10 w-full rounded-lg px-4 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {message ? (
            <span className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {message.text}
            </span>
          ) : <span />}
          
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-5 py-2 rounded-xl font-medium text-sm transition-colors"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Payment Settings
          </button>
        </div>
      </form>
    </div>
  )
}
