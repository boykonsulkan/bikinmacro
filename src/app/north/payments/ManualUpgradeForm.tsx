'use client'

import { useState } from 'react'
import { manualUpgrade } from './actions'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ManualUpgradeForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await manualUpgrade(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'User berhasil diupgrade' })
        ;(e.target as HTMLFormElement).reset()
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message?.type === 'success' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          <CheckCircle size={16} />
          {message.text}
        </div>
      )}
      {message?.type === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertCircle size={16} />
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="email">
          Email User
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="w-full rounded-lg px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="plan">
          Pilih Plan
        </label>
        <select
          id="plan"
          name="plan"
          required
          className="w-full rounded-lg px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm"
        >
          <option value="addon">Addon (Rp 25.000)</option>
          <option value="starter">Starter (Rp 79.000)</option>
          <option value="pro">Pro (Rp 149.000)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors flex justify-center items-center gap-2"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Proses Upgrade'}
      </button>
    </form>
  )
}
