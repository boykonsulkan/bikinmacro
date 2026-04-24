'use client'

import { useRef, useState, useEffect } from 'react'
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
}: {
  generationId: string
  maxChats: number
  onCodeUpdate: (rawCode: string, highlightedHtml: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [chatsUsed, setChatsUsed] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatsRemaining = maxChats - chatsUsed
  const isExhausted = maxChats > 0 && chatsRemaining <= 0

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

      const html = await codeToHtml(data.vba_code, { lang: 'vba', theme: 'github-dark' })
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
    <div className="bg-card border border-border rounded-2xl overflow-hidden mt-8">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background">
        <div className="flex items-center gap-2.5">
          <MessageSquare size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Modifikasi dengan Chat</span>
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
      {messages.length > 0 && (
        <div ref={scrollRef} className="p-4 space-y-3 max-h-64 overflow-y-auto bg-background/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-card border border-border text-foreground rounded-bl-sm'
              }`}>
                {m.role === 'assistant' && (
                  <span className="block text-xs text-muted mb-1">Perubahan diterapkan</span>
                )}
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border px-3.5 py-2 rounded-2xl rounded-bl-sm flex items-center gap-2 text-sm text-muted">
                <RefreshCw size={12} className="animate-spin" />
                Memproses...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 my-2 p-3 bg-red-900/20 border border-red-900 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        {maxChats === 0 ? (
          <p className="text-sm text-muted text-center py-1">
            Chat refinement saat ini dinonaktifkan oleh admin.
          </p>
        ) : isExhausted ? (
          <div className="flex items-center justify-center gap-2 py-1 text-sm text-muted">
            <Lock size={14} />
            <span>Batas chat ({maxChats}x) sudah habis untuk macro ini.</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Deskripsikan perubahan yang diinginkan..."
              disabled={isLoading}
              className="flex-1 rounded-xl px-4 py-2.5 bg-background border border-border focus:outline-none focus:border-primary transition-colors text-sm text-foreground placeholder:text-muted disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-primary hover:bg-primary-hover disabled:bg-primary/40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        )}
        {messages.length === 0 && !isExhausted && maxChats > 0 && (
          <p className="text-xs text-muted mt-2">
            Contoh: "Tambahkan validasi input di kolom B", "Ubah nama sheet menjadi 'Data'"
          </p>
        )}
      </div>
    </div>
  )
}
