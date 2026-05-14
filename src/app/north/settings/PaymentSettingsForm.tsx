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
  xenditUrls: {
    addon: string
    starter: string
    pro: string
  }
}

export default function PaymentSettingsForm({ initialProvider, lynkUrls, xenditUrls }: PaymentSettingsFormProps) {
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
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setIsSaving(false)
    }
  }

  const urlFields = (prefix: 'lynk' | 'xendit', defaultValues: { addon: string; starter: string; pro: string }, placeholder: string) => (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <p className="text-xs text-gray-500">Masukkan URL tautan pembayaran untuk setiap paket.</p>
      {[
        { key: 'addon', label: 'Addon Pack (Rp 25.000)', name: `${prefix}_url_addon`, value: defaultValues.addon },
        { key: 'starter', label: 'Starter (Rp 79.000/bln)', name: `${prefix}_url_starter`, value: defaultValues.starter },
        { key: 'pro', label: 'Pro (Rp 149.000/bln)', name: `${prefix}_url_pro`, value: defaultValues.pro },
      ].map(field => (
        <div key={field.key}>
          <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor={field.name}>
            {field.label}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id={field.name}
              name={field.name}
              type="url"
              placeholder={placeholder}
              defaultValue={field.value}
              className="pl-10 w-full rounded-lg px-4 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  )

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
          <div className="flex gap-6">
            {[
              { value: 'midtrans', label: 'Midtrans' },
              { value: 'xendit', label: 'Xendit (konsulkan.com)' },
              { value: 'lynk.id', label: 'Lynk.id' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment_provider"
                  value={opt.value}
                  checked={provider === opt.value}
                  onChange={() => setProvider(opt.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {provider === 'xendit' && urlFields('xendit', xenditUrls, 'https://checkout.xendit.co/...')}
        {provider === 'lynk.id' && urlFields('lynk', lynkUrls, 'https://lynk.id/...')}

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
