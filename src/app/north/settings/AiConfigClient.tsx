'use client'

import { useState, useEffect, useRef } from 'react'
import { Bot, Activity, Search, ChevronDown, X } from 'lucide-react'

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
]

export default function AiConfigClient({
  initialProvider,
  initialModel,
  apiKeyUsage
}: {
  initialProvider: string
  initialModel: string
  apiKeyUsage: any
}) {
  const [provider, setProvider] = useState(initialProvider)
  const [models, setModels] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<any>(null)

  // Combobox state
  const [query, setQuery] = useState(initialModel)
  const [isOpen, setIsOpen] = useState(false)
  const [modelValue, setModelValue] = useState(initialModel)
  const comboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchModels() {
      setIsLoading(true)
      try {
        const res = await fetch('https://openrouter.ai/api/v1/models')
        const data = await res.json()
        if (data?.data) setModels(data.data)
      } catch (err) {
        console.error('Failed to fetch models', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchModels()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        // If query doesn't match any model, reset to current value
        if (!models.find(m => m.id === query)) {
          setQuery(modelValue)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [query, modelValue, models])

  // Initialize selected model once loaded
  useEffect(() => {
    if (models.length > 0 && initialModel) {
      const found = models.find(m => m.id === initialModel)
      if (found) setSelectedModel(found)
    }
  }, [models, initialModel])

  const filteredModels = models.filter(m => {
    const matchesProvider =
      provider === 'openrouter' ? true :
      provider === 'anthropic' ? m.id.startsWith('anthropic/') :
      provider === 'openai' ? m.id.startsWith('openai/') : false

    const matchesQuery = query
      ? m.id.toLowerCase().includes(query.toLowerCase()) ||
        m.name.toLowerCase().includes(query.toLowerCase())
      : true

    return matchesProvider && matchesQuery
  })

  const isDirectProvider = provider === 'gemini'

  const handleSelect = (model: any) => {
    setModelValue(model.id)
    setQuery(model.id)
    setSelectedModel(model)
    setIsOpen(false)
  }

  const handleClear = () => {
    setModelValue('')
    setQuery('')
    setSelectedModel(null)
    setIsOpen(true)
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
            <Bot size={18} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">AI Configuration</h2>
        </div>
        {apiKeyUsage?.limit !== null && apiKeyUsage && (
          <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
            <Activity size={14} className="text-gray-500" />
            <span className="text-gray-600">OpenRouter Usage:</span>
            <span className="font-semibold text-gray-900">${(apiKeyUsage.usage || 0).toFixed(4)} / ${apiKeyUsage.limit}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Provider select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="ai_provider">
            Provider
          </label>
          <select
            id="ai_provider"
            name="ai_provider"
            value={provider}
            onChange={(e) => { setProvider(e.target.value); setQuery(''); setModelValue(''); setSelectedModel(null) }}
            className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm"
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Model input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Model Name
          </label>

          {isDirectProvider ? (
            <>
              <input type="hidden" name="ai_model" value={modelValue} />
              <input
                type="text"
                value={modelValue}
                onChange={(e) => setModelValue(e.target.value)}
                placeholder="gemini-2.0-flash-exp"
                className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1.5">e.g. gemini-2.0-flash-exp, gemini-1.5-pro, gemini-2.5-pro</p>
            </>
          ) : (
            <>
              {/* Hidden input carries the actual value for form submit */}
              <input type="hidden" name="ai_model" value={modelValue} />

              <div ref={comboRef} className="relative">
                <div className="relative flex items-center">
                  <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={isLoading ? 'Loading models...' : 'Ketik untuk cari model...'}
                    disabled={isLoading}
                    className="w-full rounded-lg pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900 text-sm disabled:opacity-50"
                  />
                  {query ? (
                    <button type="button" onClick={handleClear} className="absolute right-3 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  ) : (
                    <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                  )}
                </div>

                {isOpen && filteredModels.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {filteredModels.slice(0, 100).map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelect(m)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${modelValue === m.id ? 'bg-violet-50' : ''}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                            <p className="text-[11px] text-gray-400 font-mono truncate">{m.id}</p>
                          </div>
                          {m.id.includes(':free') && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              Free
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    {filteredModels.length > 100 && (
                      <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
                        {filteredModels.length - 100} model lainnya — ketik lebih spesifik untuk mempersempit.
                      </div>
                    )}
                  </div>
                )}

                {isOpen && !isLoading && filteredModels.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm text-gray-400">
                    Tidak ada model yang cocok.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected model detail */}
      {selectedModel && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
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
              <p className="font-medium text-gray-900">
                {selectedModel.top_provider?.max_completion_tokens
                  ? selectedModel.top_provider.max_completion_tokens.toLocaleString()
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Input / 1M</p>
              <p className="font-medium text-gray-900">${(parseFloat(selectedModel.pricing?.prompt || '0') * 1_000_000).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Output / 1M</p>
              <p className="font-medium text-gray-900">${(parseFloat(selectedModel.pricing?.completion || '0') * 1_000_000).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
