'use client'

import { Check } from 'lucide-react'
import { cardPreview } from '../ui'
import { CERITAIN_STEPS } from './steps'
import LoopScene from './LoopScene'
import { easeOut, ramp, typed } from './timeline'

/* TEKS CONTOH: ubah di sini. */
export const CERITAIN_SCENE = {
  request: 'Gabungin semua file penjualan cabang jadi satu',
  tabs: ['Rencana', 'File'],
  plan: [
    'Buka semua file di folder cabang',
    'Ambil sheet Sales dari tiap file',
    'Gabung jadi satu sheet Rekap',
  ],
  label:
    'Contoh: kamu cukup menulis "Gabungin semua file penjualan cabang jadi satu", lalu muncul rencana langkah yang akan dikerjakan macro.',
}


export default function CeritainScene() {
  return (
    <LoopScene className={cardPreview} steps={CERITAIN_STEPS} label={CERITAIN_SCENE.label} replayOnHover>
      {(f) => {
        const text = typed(CERITAIN_SCENE.request, f.t, 300, 20)
        const typing = f.t < f.start.tab
        const tabs = easeOut(ramp(f.t, f.start.tab, f.start.tab + 300))

        return (
          <div className="flex h-full flex-col gap-1.5 p-3">
            <div className="flex min-h-10 items-start gap-2 rounded-md border border-excel-grid bg-card px-2 py-1.5">
              <span className="font-mono text-[11px] font-semibold italic text-muted">fx</span>
              <span className="min-w-0 flex-1 text-[11px] leading-snug text-card-foreground">
                {text}
                {typing && <span className="caret-blink ml-px inline-block h-3 w-px translate-y-0.5 bg-card-foreground" />}
              </span>
            </div>

            <div className="flex gap-1.5" style={{ opacity: tabs, transform: `translateY(${(1 - tabs) * 4}px)` }}>
              {CERITAIN_SCENE.tabs.map((tab, i) => (
                <span
                  key={tab}
                  className={
                    i === 0
                      ? 'rounded-full bg-navy px-2.5 py-0.5 text-[10px] font-semibold text-white'
                      : 'rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold text-muted'
                  }
                >
                  {tab}
                </span>
              ))}
            </div>

            <ul className="flex flex-col gap-1">
              {CERITAIN_SCENE.plan.map((line, i) => {
                const at = f.start.rencana + i * 600
                const show = easeOut(ramp(f.t, at, at + 250))
                const check = ramp(f.t, at + 300, at + 450)
                return (
                  <li
                    key={line}
                    className="flex items-center gap-1.5 text-[11px] leading-4 text-card-foreground"
                    style={{ opacity: show, transform: `translateY(${(1 - show) * 6}px)` }}
                  >
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-action text-white"
                      style={{ opacity: 0.25 + check * 0.75 }}
                    >
                      <Check size={9} strokeWidth={3.5} style={{ opacity: check }} />
                    </span>
                    <span className="truncate">{line}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      }}
    </LoopScene>
  )
}
