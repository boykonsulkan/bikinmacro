'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

const TABS = [
  {
    id: 'bas',
    label: 'Import file .bas',
    badge: 'Disarankan',
    steps: [
      'Unduh file .bas dari tombol Unduh di kanan atas.',
      'Buka file Excel kamu, lalu tekan Alt + F11 untuk membuka editor VBA.',
      'Di menu atas klik File, lalu Import File, dan pilih macro.bas tadi.',
      'Tekan F5 untuk menjalankan, atau jalankan dari Developer, lalu Macros.',
    ],
  },
  {
    id: 'copy',
    label: 'Salin & tempel',
    steps: [
      'Klik Copy VBA di kanan atas.',
      'Di Excel tekan Alt + F11, lalu klik Insert, lalu Module.',
      'Tempel kodenya di jendela putih yang terbuka (Ctrl + V).',
      'Tekan F5 untuk menjalankan.',
    ],
  },
  {
    id: 'xlsm',
    label: 'File Excel',
    badge: 'Beta',
    steps: [
      'Unduh Excel (.xlsm) dari tombol Unduh. Isinya workbook kosong yang sudah memuat macro ini.',
      'Buka file-nya. Kalau muncul peringatan kuning, klik Enable Content.',
      'Salin datamu ke sheet di dalamnya, lalu jalankan dari Developer, lalu Macros.',
      'Fitur ini masih tahap uji. Kalau gagal dibuka, pakai cara import .bas.',
    ],
  },
] as const

export default function UsageGuide() {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('bas')
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]

  return (
    <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">Cara memakai macro ini</h4>

      <div role="tablist" className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-2 ${
              active === t.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {t.label}
            {'badge' in t && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${active === t.id ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <ol role="tabpanel" className="space-y-2">
        {tab.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
            <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Simpan sebagai file macro.</strong> Setelah macro dipasang, pakai Save As dan pilih tipe{' '}
          <strong>Excel Macro-Enabled Workbook (*.xlsm)</strong>. Kalau disimpan sebagai .xlsx biasa, macro-nya hilang
          dan tidak bisa dijalankan lagi.
        </p>
      </div>
    </div>
  )
}
