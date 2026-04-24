'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Eye, Copy, X } from 'lucide-react'

type Generation = {
  id: string
  prompt: string
  category: string
  output_vba: string
  created_at: string
}

export default function HistoryList({ generations }: { generations: Generation[] }) {
  const [selectedMacro, setSelectedMacro] = useState<Generation | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredGenerations = generations.filter(g => 
    g.prompt.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (g.category && g.category.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Cari berdasarkan instruksi..."
        className="w-full sm:max-w-md rounded-xl px-4 py-2 bg-card border border-border focus:outline-none focus:border-primary transition-colors mb-6"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {filteredGenerations.length === 0 ? (
        <div className="bg-card/50 border border-border border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center text-muted">
          <p>Belum ada riwayat macro ditemukan.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredGenerations.map(gen => (
            <div key={gen.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">
                    {gen.category || 'Lainnya'}
                  </span>
                  <span className="text-xs text-muted">
                    {format(new Date(gen.created_at), 'dd MMM yyyy, HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">
                  {gen.prompt}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <button 
                  onClick={() => setSelectedMacro(gen)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-background hover:bg-border border border-border px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Eye size={16} /> Lihat
                </button>
                <button 
                  onClick={() => copyToClipboard(gen.output_vba, gen.id)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy size={16} /> {copiedId === gen.id ? 'Tersalin' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Drawer */}
      {selectedMacro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h3 className="font-semibold text-lg">Detail Macro</h3>
              <button onClick={() => setSelectedMacro(null)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">Instruksi User</h4>
                <p className="bg-background border border-border p-4 rounded-lg text-sm text-foreground">
                  {selectedMacro.prompt}
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs uppercase tracking-wider text-muted font-semibold">Kode VBA</h4>
                  <button 
                    onClick={() => copyToClipboard(selectedMacro.output_vba, 'modal')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy size={14} /> {copiedId === 'modal' ? 'Tersalin' : 'Salin Kode'}
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm text-foreground custom-scrollbar border border-border">
                  <code>{selectedMacro.output_vba}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
