'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download, RefreshCw, Plus, Check, FileCode2 } from 'lucide-react'
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

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    if (!hasCredits && !isAdmin) {
      router.push('/pricing')
      return
    }

    setIsLoading(true)
    setError('')
    setOutputHtml('')
    setOutputRaw('')
    setGenerationId(null)

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

      const html = await codeToHtml(data.vba_code, { lang: 'vba', theme: 'github-dark' })
      setOutputHtml(html)

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
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border p-6 rounded-2xl">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Instruksi (Prompt)
            </label>
            <textarea
              className="w-full h-40 rounded-xl px-4 py-3 bg-background border border-border focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Contoh: Buat macro untuk otomatis filter baris kosong di kolom C lalu hapus baris tersebut"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            <div className="text-xs text-muted text-right mt-1">{prompt.length} karakter</div>

            <label className="block text-sm font-medium mt-4 mb-2 text-foreground">Kategori</label>
            <select
              className="w-full rounded-xl px-4 py-3 bg-background border border-border focus:outline-none focus:border-primary transition-colors appearance-none"
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={isLoading}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-900 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim() || (!hasCredits && !isAdmin)}
              className="w-full mt-6 bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <FileCode2 size={20} />}
              {isLoading ? 'Sedang membuat...' : 'Generate Macro'}
            </button>

            {!hasCredits && !isAdmin && (
              <div className="mt-3 text-center text-sm text-orange-400">
                Kuota habis. Silakan upgrade untuk melanjutkan.
              </div>
            )}
          </div>
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-4">
          {outputRaw ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col h-full">
              <div className="bg-background border-b border-border px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileCode2 size={16} /> macro.bas
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-card rounded-md text-muted hover:text-foreground transition-colors flex items-center gap-1 text-xs"
                  >
                    {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {isCopied ? 'Tersalin' : 'Salin'}
                  </button>
                  <button
                    onClick={downloadFile}
                    className="p-2 hover:bg-card rounded-md text-muted hover:text-foreground transition-colors flex items-center gap-1 text-xs"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-x-auto text-sm bg-gray-50 flex-1 custom-scrollbar text-foreground">
                {outputHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
                ) : (
                  <pre><code className="language-vba">{outputRaw}</code></pre>
                )}
              </div>

              <div className="border-t border-border p-4 bg-background flex justify-between">
                <button
                  onClick={() => handleGenerate()}
                  className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
                >
                  <RefreshCw size={16} /> Regenerate
                </button>
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium"
                >
                  <Plus size={16} /> Buat Baru
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-card/50 border border-border border-dashed rounded-2xl flex-1 flex flex-col items-center justify-center p-12 text-center text-muted">
              <FileCode2 size={48} className="mb-4 opacity-20" />
              <p>Output macro akan muncul di sini.</p>
            </div>
          )}
        </div>
      </div>

      {/* Usage instructions */}
      {outputRaw && (
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h4 className="font-medium text-foreground mb-3">Cara menggunakan macro ini?</h4>
          <ol className="list-decimal list-inside text-sm text-muted space-y-2">
            <li>Buka Microsoft Excel</li>
            <li>Tekan <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground">Alt</kbd> + <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground">F11</kbd> untuk membuka VBA Editor</li>
            <li>Klik menu <strong>Insert</strong> &gt; <strong>Module</strong></li>
            <li>Paste kode yang sudah disalin ke dalam jendela Module</li>
            <li>Tutup VBA Editor, kembali ke Excel</li>
            <li>Tekan <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground">Alt</kbd> + <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground">F8</kbd>, pilih macro, lalu klik <strong>Run</strong></li>
          </ol>
        </div>
      )}

      {/* Chat refinement — only shown after a macro is generated */}
      {generationId && (
        <MacroChat
          generationId={generationId}
          maxChats={chatMax}
          onCodeUpdate={handleChatCodeUpdate}
        />
      )}
    </div>
  )
}
