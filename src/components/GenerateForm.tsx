'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Download, RefreshCw, Plus, Check, FileCode2, Home, Zap, ArrowLeft, ArrowRight } from 'lucide-react'
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

type QuestionType = 'text' | 'single' | 'multi'

interface Question {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  placeholder?: string
}

const QUESTIONS: Question[] = [
  {
    id: 'structure',
    text: 'Ceritakan struktur file Excel kamu',
    type: 'text',
    placeholder: 'Contoh: Ada 3 sheet, Sheet1 punya kolom Tanggal, Produk, Jumlah. Data mulai dari baris 2...',
  },
  {
    id: 'scope',
    text: 'Macro ini akan bekerja di mana?',
    type: 'single',
    options: ['Sheet aktif saja', 'Beberapa sheet tertentu', 'Semua sheet', 'Lintas file Excel'],
  },
  {
    id: 'actions',
    text: 'Aksi apa saja yang boleh dilakukan macro ini?',
    type: 'multi',
    options: ['Ubah atau hapus data', 'Buat sheet baru', 'Kirim email', 'Simpan atau export file', 'Format tampilan', 'Buat laporan atau pivot'],
  },
  {
    id: 'safety',
    text: 'Bagaimana macro harus bertindak sebelum mengubah data?',
    type: 'single',
    options: ['Langsung jalankan', 'Minta konfirmasi dulu', 'Backup otomatis dulu', 'Tampilkan preview dulu'],
  },
  {
    id: 'priority',
    text: 'Yang paling penting dari macro ini?',
    type: 'single',
    options: ['Kode sesimpel mungkin', 'Bisa dijalankan berulang kali', 'Mudah dimodifikasi nanti', 'Komentar penjelasan lengkap'],
  },
]

function buildEnrichedPrompt(basePrompt: string, answers: Record<string, string | string[]>): string {
  const details: string[] = []

  const structure = answers['structure']
  const scope = answers['scope']
  const actions = answers['actions']
  const safety = answers['safety']
  const priority = answers['priority']

  if (typeof structure === 'string' && structure.trim()) {
    details.push(`Struktur file Excel: ${structure.trim()}`)
  }
  if (typeof scope === 'string' && scope) {
    details.push(`Scope kerja macro: ${scope}`)
  }
  if (Array.isArray(actions) && actions.length > 0) {
    details.push(`Aksi yang diizinkan: ${actions.join(', ')}`)
  }
  if (typeof safety === 'string' && safety) {
    details.push(`Keamanan data: ${safety}`)
  }
  if (typeof priority === 'string' && priority) {
    details.push(`Prioritas utama: ${priority}`)
  }

  if (details.length === 0) return basePrompt
  return `${basePrompt}\n\nKonteks tambahan:\n${details.map(d => `- ${d}`).join('\n')}`
}

function countAnswered(answers: Record<string, string | string[]>): number {
  return QUESTIONS.filter(q => {
    const a = answers[q.id]
    if (!a) return false
    if (Array.isArray(a)) return a.length > 0
    return a.trim().length > 0
  }).length
}

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
  const [viewMode, setViewMode] = useState<'initial' | 'questions' | 'chat'>('initial')
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  const handleGenerate = async (enrichedPrompt: string) => {
    if (!enrichedPrompt.trim()) return

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
        body: JSON.stringify({ prompt: enrichedPrompt, category })
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
      setChatMax(data.max_chat_per_generation ?? maxChatPerGeneration)

      const html = await codeToHtml(data.vba_code, { lang: 'vb', theme: 'github-dark' })
      setOutputHtml(html)
      setViewMode('chat')

      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setViewMode('questions')
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
    setAnswers({})
    setViewMode('initial')
    setError('')
  }

  const setSingleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const toggleMultiAnswer = (questionId: string, value: string) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [questionId]: next }
    })
  }

  const skipQuestion = (questionId: string) => {
    setAnswers(prev => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  // --- Chat view ---
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
          <div className="w-1/3 min-w-[350px] border-r border-border flex flex-col bg-background">
            <MacroChat
              generationId={generationId}
              maxChats={chatMax}
              onCodeUpdate={handleChatCodeUpdate}
              initialPrompt={prompt}
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

  // --- Questions view ---
  if (viewMode === 'questions') {
    const answeredCount = countAnswered(answers)

    return (
      <div className="max-w-2xl mx-auto py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Beberapa pertanyaan</h1>
            <span className="text-sm font-semibold text-gray-400 tabular-nums">
              {answeredCount}/{QUESTIONS.length}
            </span>
          </div>
          <p className="text-base text-muted">
            Biar macro-nya lebih tepat. Jawab yang kamu tahu — boleh lewati jika tidak relevan.
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {QUESTIONS.map((q, idx) => {
            const answer = answers[q.id]
            const hasAnswer = Array.isArray(answer) ? answer.length > 0 : !!(answer as string)?.trim()

            return (
              <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    <span className="text-gray-400 mr-2">{idx + 1}.</span>
                    {q.text}
                    {q.type === 'multi' && (
                      <span className="ml-2 text-xs font-normal text-gray-400">(boleh pilih beberapa)</span>
                    )}
                  </p>
                  {hasAnswer && (
                    <button
                      onClick={() => skipQuestion(q.id)}
                      className="shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
                    >
                      Lewati
                    </button>
                  )}
                  {!hasAnswer && (
                    <span className="shrink-0 text-xs text-gray-300 font-medium">Lewati</span>
                  )}
                </div>

                {q.type === 'text' && (
                  <textarea
                    className="w-full h-24 rounded-xl px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-sm resize-none placeholder:text-gray-300 text-gray-900"
                    placeholder={q.placeholder}
                    value={(answer as string) || ''}
                    onChange={e => setSingleAnswer(q.id, e.target.value)}
                  />
                )}

                {(q.type === 'single' || q.type === 'multi') && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => {
                      const isSelected = q.type === 'multi'
                        ? (answer as string[] || []).includes(opt)
                        : answer === opt

                      return (
                        <button
                          key={opt}
                          onClick={() =>
                            q.type === 'multi'
                              ? toggleMultiAnswer(q.id, opt)
                              : setSingleAnswer(q.id, isSelected ? '' : opt)
                          }
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                            isSelected
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                          }`}
                        >
                          {isSelected && <Check size={12} className="inline mr-1.5 -mt-0.5" />}
                          {opt}
                        </button>
                      )
                    })}
                    <button
                      className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all"
                    >
                      + Lainnya
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-center gap-3">
            <Plus className="rotate-45 shrink-0" size={16} />
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => { setViewMode('initial'); setError('') }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>

          <button
            onClick={() => {
              const enriched = buildEnrichedPrompt(prompt, answers)
              handleGenerate(enriched)
            }}
            disabled={isLoading || (!hasCredits && !isAdmin)}
            className="flex items-center gap-3 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-black/10 active:scale-95"
          >
            {isLoading
              ? <><RefreshCw className="animate-spin" size={18} /> Menulis Kode...</>
              : <><Zap size={18} className="fill-current" /> Generate Macro</>
            }
          </button>
        </div>
      </div>
    )
  }

  // --- Initial view ---
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
            onClick={() => setViewMode('questions')}
            disabled={!prompt.trim() || (!hasCredits && !isAdmin)}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-lg shadow-black/10 active:scale-95"
          >
            Lanjutkan
            <ArrowRight size={18} />
          </button>
        </div>

        {!hasCredits && !isAdmin && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-2xl text-sm text-center">
            Kuota Anda habis.{' '}
            <button onClick={() => router.push('/pricing')} className="font-bold underline">
              Upgrade Sekarang
            </button>{' '}
            untuk lanjut otomatisasi.
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
