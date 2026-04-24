'use client'

import { useState, useEffect } from 'react'
import { Bot, AlertCircle, CreditCard, Activity } from 'lucide-react'

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
]

export default function AiConfigClient({ 
  initialProvider, 
  initialModel,
  apiKeyUsage
}: { 
  initialProvider: string, 
  initialModel: string,
  apiKeyUsage: any
}) {
  const [provider, setProvider] = useState(initialProvider)
  const [models, setModels] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<any>(null)

  useEffect(() => {
    async function fetchModels() {
      setIsLoading(true)
      try {
        const res = await fetch('https://openrouter.ai/api/v1/models')
        const data = await res.json()
        if (data && data.data) {
          setModels(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch models', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchModels()
  }, [])

  const filteredModels = models.filter(m => {
    if (provider === 'openrouter') return true
    if (provider === 'anthropic') return m.id.startsWith('anthropic/')
    if (provider === 'openai') return m.id.startsWith('openai/')
    return false
  })

  // Set selected model detail whenever the selection changes
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const found = models.find(m => m.id === val)
    setSelectedModel(found || null)
  }

  // Initialize selected model once loaded
  useEffect(() => {
    if (models.length > 0) {
      const found = models.find(m => m.id === initialModel)
      if (found) setSelectedModel(found)
    }
  }, [models, initialModel])

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
            <Bot size={18} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">AI Configuration</h2>
        </div>
        {apiKeyUsage && apiKeyUsage.limit !== null && (
           <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
             <Activity size={14} className="text-gray-500" />
             <span className="text-gray-600">OpenRouter Usage:</span>
             <span className="font-semibold text-gray-900">${(apiKeyUsage.usage || 0).toFixed(4)} / ${apiKeyUsage.limit}</span>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="ai_provider">
            Provider
          </label>
          <select
            id="ai_provider"
            name="ai_provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm"
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="ai_model">
            Model Name
          </label>
          {isLoading ? (
            <div className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-400 text-sm animate-pulse">
              Loading models...
            </div>
          ) : (
            <select
              id="ai_model"
              name="ai_model"
              defaultValue={initialModel}
              onChange={handleModelChange}
              className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm"
            >
              <option value="">Select a model...</option>
              {filteredModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedModel && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">{selectedModel.name}</h3>
            {selectedModel.id.includes(':free') && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                Free Tier
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Context Limit</p>
              <p className="font-medium text-gray-900">{(selectedModel.context_length || 0).toLocaleString()} tokens</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Max Output</p>
              <p className="font-medium text-gray-900">{selectedModel.top_provider?.max_completion_tokens ? selectedModel.top_provider.max_completion_tokens.toLocaleString() : 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Input Price / 1M</p>
              <p className="font-medium text-gray-900">${(parseFloat(selectedModel.pricing?.prompt || '0') * 1000000).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Output Price / 1M</p>
              <p className="font-medium text-gray-900">${(parseFloat(selectedModel.pricing?.completion || '0') * 1000000).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
