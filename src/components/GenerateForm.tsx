'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Download, RefreshCw, Plus, Check, FileCode2, Home, Zap, ChevronRight, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { highlightVba } from '@/lib/highlight'
import MacroChat from './MacroChat'
import UsageGuide from './UsageGuide'
import FileAttach from './FileAttach'
import type { FileContext } from '@/lib/excel/structure'
import { track } from '@/lib/events/client'

const CATEGORIES = [
  'Data Processing',
  'Formatting & Styling',
  'Automasi & Looping',
  'Email & Reporting',
  'Import/Export',
  'Lainnya'
]

const QUESTIONS = [
  {
    id: 'sheet',
    label: 'Sheet mana yang akan diproses?',
    placeholder: 'Contoh: Sheet1, Data, Master',
    type: 'text',
  },
  {
    id: 'columns',
    label: 'Kolom atau data apa yang terlibat?',
    placeholder: 'Contoh: Kolom A (Nama), B (Status), C (Tanggal)',
    type: 'text',
  },
  {
    id: 'rowcount',
    label: 'Perkiraan jumlah baris data?',
    type: 'radio',
    options: ['< 100 baris', '100 – 1.000 baris', '> 1.000 baris', 'Tidak tahu'],
  },
  {
    id: 'destructive',
    label: 'Apakah macro ini akan mengubah atau menghapus data yang ada?',
    type: 'radio',
    options: ['Ya, akan mengubah data', 'Tidak, hanya membaca', 'Hanya output ke sheet baru'],
  },
  {
    id: 'output',
    label: 'Output yang diharapkan?',
    placeholder: 'Contoh: File Excel baru, laporan di sheet terpisah, pesan pop-up',
    type: 'text',
  },
]

export type ResumeState = {
  id: string
  prompt: string
  code: string
  chats: { role: 'user' | 'assistant'; content: string; explain?: boolean }[]
}

export default function GenerateForm({
  hasCredits,
  creditsRemaining,
  isAdmin,
  maxChatPerGeneration,
  resume = null,
}: {
  hasCredits: boolean
  creditsRemaining: number
  isAdmin: boolean
  maxChatPerGeneration: number
  resume?: ResumeState | null
}) {
  const router = useRouter()
  const [prompt, setPrompt] = useState(resume?.prompt ?? '')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [isLoading, setIsLoading] = useState(false)
  const [outputHtml, setOutputHtml] = useState('')
  const [outputRaw, setOutputRaw] = useState(resume?.code ?? '')
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState('')
  const [generationId, setGenerationId] = useState<string | null>(resume?.id ?? null)
  const [chatMax, setChatMax] = useState(maxChatPerGeneration)
  const [viewMode, setViewMode] = useState<'initial' | 'questions' | 'chat'>(resume ? 'chat' : 'initial')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fileContext, setFileContext] = useState<FileContext | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  // Setelah refresh, kode dimuat dari database tanpa warna: warnai di sini.
  useEffect(() => {
    if (!resume) return
    let cancelled = false
    highlightVba(resume.code).then((html) => {
      if (!cancelled) setOutputHtml(html)
    })
    return () => {
      cancelled = true
    }
  }, [resume])

  useEffect(() => {
    if (!resume) track('generate_view')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Simpan id generasi di URL supaya refresh kembali ke chat yang sama (tanpa memuat ulang halaman).
  const rememberGeneration = (id: string | null) => {
    window.history.replaceState(null, '', id ? `/generate?g=${encodeURIComponent(id)}` : '/generate')
  }

  const handleGoToQuestions = () => {
    if (!prompt.trim()) return
    if (!hasCredits && !isAdmin) {
      router.push('/pricing')
      return
    }
    setError('')
    track('questions_step')
    setViewMode('questions')
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    setError('')
    track('generate_submit')

    const extras = QUESTIONS
      .filter(q => answers[q.id]?.trim())
      .map(q => `${q.label} → ${answers[q.id]}`)
      .join('\n')

    const fullPrompt = extras
      ? `${prompt.trim()}\n\nDetail tambahan:\n${extras}`
      : prompt.trim()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, category, ...(fileContext ? { file_context: fileContext } : {}) })
      })

      if (!res.ok) {
        if (res.status === 402) {
          router.push('/pricing')
          return
        }
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Gagal membuat macro. Silakan coba lagi.')
      }

      const data = await res.json()
      setOutputRaw(data.vba_code)
      setGenerationId(data.generation_id ?? null)
      if (data.generation_id) rememberGeneration(data.generation_id)
      setChatMax(data.max_chat_per_generation ?? maxChatPerGeneration)

      const html = await highlightVba(data.vba_code)
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
    track('copy_code')
    navigator.clipboard.writeText(outputRaw)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const saveBlob = (blob: Blob, filename: string) => {
    const element = document.createElement('a')
    element.href = URL.createObjectURL(blob)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(element.href)
  }

  const downloadBas = () => {
    track('download_bas')
    setMenuOpen(false)
    setExportError('')
    saveBlob(new Blob([outputRaw], { type: 'text/plain' }), 'macro.bas')
  }

  const downloadXlsm = async () => {
    if (!generationId) return
    setMenuOpen(false)
    setExportError('')
    setExporting(true)
    try {
      const res = await fetch(`/api/export/xlsm?generation_id=${encodeURIComponent(generationId)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal membuat file Excel. Unduh versi .bas sebagai gantinya.')
      }
      saveBlob(await res.blob(), 'BikinMacro.xlsm')
    } catch (err: any) {
      setExportError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const resetForm = () => {
    setPrompt('')
    setOutputHtml('')
    setOutputRaw('')
    setGenerationId(null)
    rememberGeneration(null)
    setAnswers({})
    setFileContext(null)
    setViewMode('initial')
  }

  // ── Questions step ──────────────────────────────────────────────
  if (viewMode === 'questions') {
    return (
      <div className="space-y-8 max-w-2xl mx-auto py-10">
        <div className="text-center mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Langkah 2 dari 2</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Detail macro kamu</h1>
          <p className="text-muted text-sm">Jawab beberapa pertanyaan singkat agar hasil lebih akurat. Bisa dilewati.</p>
        </div>

        {/* Prompt recap */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <FileCode2 size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 leading-relaxed">{prompt}</p>
        </div>

        <div className="space-y-5">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-3">{q.label}</p>
              {q.type === 'text' ? (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm text-gray-900 placeholder:text-gray-300"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {q.options!.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: prev[q.id] === opt ? '' : opt }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        answers[q.id] === opt
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <FileAttach onChange={setFileContext} />

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-center gap-3">
            <Plus className="rotate-45 shrink-0" size={16} />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setViewMode('initial')}
            className="px-6 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Kembali
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white px-8 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/10 active:scale-95"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} className="fill-current" />}
            {isLoading ? 'Menulis Kode...' : 'Generate Macro'}
          </button>
        </div>
      </div>
    )
  }

  // ── Chat / result step ──────────────────────────────────────────
  if (viewMode === 'chat' && generationId) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col pt-16">
        <div className="bg-card border-b border-border px-6 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted hover:text-foreground transition-colors p-2 hover:bg-background rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={resetForm}
              className="text-muted hover:text-foreground transition-colors p-2 hover:bg-background rounded-lg flex items-center gap-2 text-sm font-medium"
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
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                disabled={exporting}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-card transition-colors disabled:opacity-50"
              >
                {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {exporting ? 'Menyiapkan...' : 'Unduh'}
                <ChevronDown size={14} />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-10 p-2">
                  <button role="menuitem" onClick={downloadBas} className="w-full text-left p-3 rounded-xl hover:bg-gray-50 flex gap-3">
                    <FileCode2 size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        File .bas
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Disarankan</span>
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">Import ke Excel milikmu. Paling stabil.</span>
                    </span>
                  </button>
                  <button role="menuitem" onClick={downloadXlsm} className="w-full text-left p-3 rounded-xl hover:bg-gray-50 flex gap-3">
                    <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-gray-500" />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        Excel .xlsm
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Beta</span>
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">Workbook kosong yang sudah berisi macro. Masih tahap uji.</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {exportError && (
          <div role="alert" className="bg-red-50 border-b border-red-100 text-red-600 px-6 py-2 text-sm shrink-0">{exportError}</div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/3 min-w-[350px] border-r border-border flex flex-col bg-background">
            <MacroChat
              generationId={generationId}
              maxChats={chatMax}
              onCodeUpdate={handleChatCodeUpdate}
              initialPrompt={prompt}
              initialMessages={resume?.chats}
            />
          </div>

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

                <UsageGuide />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Initial step ────────────────────────────────────────────────
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
        />

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-gray-100 text-gray-900"
                value={category}
                onChange={e => setCategory(e.target.value)}
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
            onClick={handleGoToQuestions}
            disabled={!prompt.trim() || (!hasCredits && !isAdmin)}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-lg shadow-black/10 active:scale-95"
          >
            <span>Lanjut</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {!hasCredits && !isAdmin && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-2xl text-sm text-center">
            Kuota Anda habis. <button onClick={() => router.push('/pricing')} className="font-bold underline">Upgrade Sekarang</button> untuk lanjut otomatisasi.
          </div>
        )}
      </div>

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
