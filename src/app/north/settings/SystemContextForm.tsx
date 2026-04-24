'use client'

import { useState } from 'react'
import { Zap, Edit2, Check, X, Loader2 } from 'lucide-react'
import { saveSettings } from './actions'

export default function SystemContextForm({ initialValue }: { initialValue: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [pendingValue, setPendingValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // We use a FormData to call the server action
      const formData = new FormData()
      formData.append('system_context', pendingValue)
      
      // The saveSettings action updates everything, but we only send what we want to change or keep
      // Actually, since it's a server action, it might expect more fields. 
      // Let's check actions.ts
      await saveSettings(formData)
      
      setValue(pendingValue)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save system context', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setPendingValue(value)
    setIsEditing(false)
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Zap size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">System Context</h2>
            <p className="text-xs text-gray-400 mt-0.5">Custom instructions injected into every generation.</p>
          </div>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors uppercase tracking-wider"
          >
            <Edit2 size={14} /> Edit Context
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-gray-50 rounded-lg transition-colors uppercase tracking-wider"
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-black text-white hover:bg-gray-800 rounded-lg transition-colors uppercase tracking-wider shadow-lg shadow-black/10 disabled:bg-gray-300"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="relative group">
        <textarea
          id="system_context"
          name="system_context"
          value={pendingValue}
          onChange={(e) => setPendingValue(e.target.value)}
          rows={10}
          readOnly={!isEditing}
          placeholder={`Contoh:\n- Semua macro harus kompatibel dengan Excel 2016\n- Selalu tambahkan logging ke sheet "Log"\n- Gunakan naming convention: camelCase untuk variabel`}
          className={`w-full rounded-2xl px-5 py-4 border transition-all text-sm resize-none font-mono leading-relaxed ${
            isEditing 
              ? 'bg-white border-primary ring-4 ring-primary/5 text-gray-900' 
              : 'bg-gray-50/50 border-gray-100 text-gray-400 cursor-not-allowed select-none'
          }`}
        />
        {!isEditing && (
          <div className="absolute inset-0 z-10" onClick={() => setIsEditing(true)} />
        )}
      </div>
      
      {isEditing && (
        <p className="text-[10px] text-gray-400 font-medium italic">
          * Instructions here are appended to the AI's system prompt for every generation and chat refinement.
        </p>
      )}
    </div>
  )
}
