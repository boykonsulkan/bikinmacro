'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Download, RefreshCw, Plus, Check, FileCode2, Home } from 'lucide-react'
import { codeToHtml } from 'shiki'
import MacroChat from './MacroChat'

const CATEGORIES = [
  'Data Processing',
  'Formatting & Styling',
  'Automasi & Looping',
  'Email & Reporting',
  'Import/Export',
  'Lainnya'
]

export default function GenerateForm({
  hasCredits,
  creditsRemaining,
  isAdmin,
  maxChatPerGeneration,
}: {
  hasCredits: boolean
  creditsRemaining: number
  isAdmin: boolean
  maxChatPerGeneration: number
}) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [isLoading, setIsLoading] = useState(false)
  const [outputHtml, setOutputHtml] = useState('')
  const [outputRaw, setOutputRaw] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState('')
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [chatMax, setChatMax] = useState(maxChatPerGeneration)
  const [viewMode, setViewMode] = useState<'initial' | 'chat'>('initial')

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    if (!hasCredits && !isAdmin) {
      router.push('/pricing')
      return
    }

    setIsLoading(true)
    setError('')
    // Only reset output if starting from scratch
    if (viewMode === 'initial') {
      setOutputHtml('')
      setOutputRaw('')
      setGenerationId(null)
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, category })
      })

      if (!res.ok) {
        if (res.status === 402) {
          router.push('/pricing')
          return
        }
        throw new Error('Gagal membuat macro. Silakan coba lagi.')
      }

      const data = await res.json()
      setOutputRaw(data.vba_code)
      setGenerationId(data.generation_id ?? null)
      setChatMax(data.max_chat_per_generation ?? maxChatPerGeneration)

      const html = await codeToHtml(data.vba_code, { lang: 'vb', theme: 'github-dark' })
      setOutputHtml(html)
      setViewMode('chat')

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChatCodeUpdate = (rawCode: string, highlightedHtml: string) => {
    setOutputRaw(rawCode)
    setOutputHtml(highlightedHtml)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputRaw)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const downloadFile = () => {
    const element = document.createElement('a')
    const file = new Blob([outputRaw], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = 'macro.bas'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const resetForm = () => {
    setPrompt('')
    setOutputHtml('')
    setOutputRaw('')
    setGenerationId(null)
    setViewMode('initial')
  }

  if (viewMode === 'chat' && generationId) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col pt-16">
        {/* Sub-header for Chat Mode */}
        <div className="bg-card border-b border-border px-6 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="text-muted hover:text-foreground transition-colors p-2 hover:bg-background rounded-lg flex items-center gap-2 text-sm font-medium"
              title="Back to Home"
            >
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <button 
              onClick={resetForm}
              className="text-muted hover:text-foreground transition-colors p-2 hover:bg-background rounded-lg flex items-center gap-2 text-sm font-medium"
              title="Start New"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">New Macro</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <div>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none mb-1">Editing</p>
              <h2 className="text-sm font-semibold truncate max-w-[150px] sm:max-w-md">
                {prompt.slice(0, 50)}{prompt.length > 50 ? '...' : ''}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium transition-colors"
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                {isCopied ? 'Copied' : 'Copy VBA'}
              </button>
              <button
                onClick={downloadFile}
                className="p-2 hover:bg-card border border-border rounded-xl text-muted hover:text-foreground transition-colors"
                title="Download .bas file"
              >
                <Download size={18} />
              </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Chat Refinement */}
          <div className="w-1/3 min-w-[350px] border-r border-border flex flex-col bg-background">
            <MacroChat
              generationId={generationId}
              maxChats={chatMax}
              onCodeUpdate={handleChatCodeUpdate}
              initialPrompt={prompt}
            />
          </div>

          {/* Right Panel: Code Artifact */}
          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
             <div className="p-4 sm:p-8 flex-1 overflow-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                   <div className="bg-[#0d1117] rounded-2xl shadow-2xl border border-white/5 overflow-hidden">
                      <div className="px-4 py-2 bg-[#161b22] border-b border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                           <FileCode2 size={12} /> Visual Basic for Applications
                         </span>
                         <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500/20 border border-orange-500/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40" />
                         </div>
                      </div>
                      <div className="p-6 text-sm font-mono overflow-x-auto">
                        {outputHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: outputHtml }} className="[&>pre]:!bg-transparent [&>pre]:!p-0" />
                        ) : (
                          <pre><code className="language-vb text-gray-300">{outputRaw}</code></pre>
                        )}
                      </div>
                   </div>

                   {/* Usage instructions in chat mode as a collapsible or small info box */}
                   <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Implementation Guide</h4>
                      <div className="grid grid-cols-3 gap-4 text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                         <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-1">
                            <span className="text-primary">Step 1</span>
                            Open VBA (Alt+F11)
                         </div>
                         <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-1">
                            <span className="text-primary">Step 2</span>
                            Insert Module
                         </div>
                         <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-1">
                            <span className="text-primary">Step 3</span>
                            Paste & Run (F5)
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-10">
      <div className="text-center mb-8">
         <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">Apa yang ingin Anda otomatisasi?</h1>
         <p className="text-lg text-muted">Deskripsikan tugas Excel Anda, biar kami yang buatkan macro-nya.</p>
      </div>

      <div className="bg-white border border-gray-200 p-8 rounded-[32px] shadow-xl shadow-black/5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
        
        <label className="block text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 ml-1">
          Instruksi Macro
        </label>
        
        <textarea
          className="w-full h-48 rounded-2xl px-6 py-5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-lg resize-none placeholder:text-gray-300 text-gray-900"
          placeholder="Contoh: Buat macro untuk memindahkan baris yang statusnya 'Done' di Kolom A ke Sheet baru bernama 'Archive'..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={isLoading}
        />
        
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-gray-100 text-gray-900"
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isLoading}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                 <RefreshCw size={14} />
              </div>
            </div>
            <span className="text-xs text-gray-400 font-medium">{prompt.length} karakter</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim() || (!hasCredits && !isAdmin)}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-lg shadow-black/10 active:scale-95"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} className="fill-current" />}
            {isLoading ? 'Menulis Kode...' : 'Generate Macro'}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <Plus className="rotate-45" size={16} />
            </div>
            {error}
          </div>
        )}

        {!hasCredits && !isAdmin && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-2xl text-sm text-center">
             Kuota Anda habis. <button onClick={() => router.push('/pricing')} className="font-bold underline">Upgrade Sekarang</button> untuk lanjut otomatisasi.
          </div>
        )}
      </div>

      {/* Trust badges or secondary info */}
      <div className="grid grid-cols-3 gap-6 pt-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center mx-auto">
            <Check size={20} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Excel 2016+</p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
            <FileCode2 size={20} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">VBA Ready</p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mx-auto">
            <Zap size={20} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Instant Fix</p>
        </div>
      </div>
    </div>
  )
}

import { Zap } from 'lucide-react'

