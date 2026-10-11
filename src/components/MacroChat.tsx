'use client'

import { Fragment, useRef, useState, useEffect } from 'react'
import { Send, MessageSquare, RefreshCw, Lock } from 'lucide-react'
import { codeToHtml } from 'shiki'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function MacroChat({
  generationId,
  maxChats,
  onCodeUpdate,
  initialPrompt,
  initialMessages,
}: {
  generationId: string
  maxChats: number
  onCodeUpdate: (rawCode: string, highlightedHtml: string) => void
  initialPrompt?: string
  /** Riwayat chat yang dimuat ulang dari database (setelah refresh), tanpa pesan permintaan awal. */
  initialMessages?: ChatMessage[]
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages && initialPrompt ? [{ role: 'user', content: initialPrompt }, ...initialMessages] : [],
  )
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [chatsUsed, setChatsUsed] = useState(() => (initialMessages ?? []).filter((m) => m.role === 'user').length)
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatsRemaining = maxChats - chatsUsed
  const isExhausted = maxChats > 0 && chatsRemaining <= 0

  // Add initial prompt to messages if it's new
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      setMessages([{ role: 'user', content: initialPrompt }])
    }
  }, [initialPrompt])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isExhausted || isLoading) return

    setInput('')
    setError('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: generationId, message: text })
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 402) {
          setError('Batas chat sudah habis untuk macro ini.')
        } else {
          setError(data.error || 'Gagal memproses permintaan.')
        }
        setMessages(prev => prev.slice(0, -1))
        return
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      setChatsUsed(data.chats_used)

      const html = await codeToHtml(data.vba_code, { lang: 'vb', theme: 'github-dark' })
      onCodeUpdate(data.vba_code, html)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-2.5">
          <MessageSquare size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Chat Refinement</span>
        </div>
        {maxChats > 0 ? (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            isExhausted
              ? 'bg-red-100 text-red-600'
              : chatsRemaining <= 3
              ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-700'
          }`}>
            {isExhausted ? 'Habis' : `${chatsRemaining} / ${maxChats} tersisa`}
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            Chat dinonaktifkan
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar bg-background">
        {messages.map((m, i) => (
          <Fragment key={i}>
          <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary text-white rounded-br-sm shadow-sm'
                : 'bg-card border border-border text-foreground rounded-bl-sm shadow-sm'
            }`}>
              {m.role === 'assistant' && (
                <span className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">BikinMacro AI</span>
              )}
              {m.content}
            </div>
          </div>
          {i === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[90%] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-card border border-border text-foreground shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">BikinMacro AI</span>
                <p>Macro kamu sudah jadi. Cara memasangnya:</p>
                <ol className="list-decimal pl-5 my-2 space-y-1">
                  <li>Klik Unduh lalu pilih File .bas (disarankan).</li>
                  <li>Di Excel tekan Alt + F11, lalu File, Import File, pilih macro.bas.</li>
                  <li>Tekan F5 untuk menjalankan.</li>
                </ol>
                <p>Atau klik Copy VBA, lalu di editor VBA pilih Insert, Module dan tempel kodenya.</p>
                <p className="mt-2 font-semibold">
                  Penting: simpan hasilnya lewat Save As bertipe Excel Macro-Enabled Workbook (.xlsm), bukan .xlsx
                  biasa, supaya macro-nya tidak hilang.
                </p>
                <p className="mt-2">Ada bagian kode yang bikin bingung? Tanya di sini, aku jelaskan.</p>
              </div>
            </div>
          )}
          </Fragment>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2 text-sm text-muted shadow-sm">
              <RefreshCw size={12} className="animate-spin" />
              Memikirkan perubahan...
            </div>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-900/10 border border-red-900/20 text-red-500 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Input bar - bottom fixed */}
      <div className="p-4 border-t border-border bg-card/30">
        {maxChats === 0 ? (
          <p className="text-xs text-muted text-center py-2">
            Chat refinement saat ini dinonaktifkan oleh admin.
          </p>
        ) : isExhausted ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted">
            <Lock size={12} />
            <span>Batas chat ({maxChats}x) sudah habis untuk macro ini.</span>
          </div>
        ) : (
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Berikan instruksi perubahan..."
              disabled={isLoading}
              className="w-full rounded-2xl pl-4 pr-12 py-3 bg-background border border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm text-foreground placeholder:text-muted disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-hover disabled:bg-primary/40 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { AlertCircle } from 'lucide-react'

