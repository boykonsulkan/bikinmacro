'use client'

import { Check, Download, FileSpreadsheet } from 'lucide-react'
import { cardPreview } from '../ui'
import { DOWNLOAD_STEPS } from './steps'
import LoopScene from './LoopScene'
import { Ants, ClickRipple, Pointer } from './ExcelBits'
import { easeInOut, easeOut, lerp, ramp } from './timeline'

/* TEKS CONTOH: ubah di sini. */
export const DOWNLOAD_SCENE = {
  fileName: 'Rekap Multi File.xlsm',
  folderLabel: 'Folder sumber',
  folderValue: 'C:\\Laporan\\Cabang',
  button: 'Jalankan',
  done: 'Selesai',
  label:
    'Contoh: kamu download file Rekap Multi File.xlsm, buka sheet Mulai, lalu klik tombol Jalankan dan hasilnya langsung jadi.',
}


export default function DownloadScene() {
  return (
    <LoopScene className={cardPreview} steps={DOWNLOAD_STEPS} label={DOWNLOAD_SCENE.label} replayOnHover>
      {(f) => {
        const s = f.start
        const t = f.t

        // Tahap 1: ikon file jatuh ke area download.
        const fall = ramp(t, 100, s.buka - 100)
        const fallY = lerp(-8, 84, fall * fall)
        const stage1 = 1 - ramp(t, s.buka, s.buka + 400)
        const trayDone = ramp(t, s.buka - 500, s.buka - 100)

        // Tahap 2: workbook terbuka di sheet Mulai.
        const open = easeOut(ramp(t, s.buka, s.buka + 500))
        const cursor = easeInOut(ramp(t, s.klik, s.klik + 700))
        const pressAt = s.klik + 850
        const pressed = t >= pressAt && t < pressAt + 150
        const done = easeOut(ramp(t, s.selesai, s.selesai + 300))

        return (
          <div className="relative h-full overflow-hidden">
            {/* Tahap 1 */}
            <div className="absolute inset-0" style={{ opacity: stage1 }}>
              <div
                className="absolute left-1/2 flex w-[170px] -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 shadow-soft"
                style={{ top: fallY, opacity: 1 - ramp(t, s.buka - 300, s.buka - 100) }}
              >
                <FileSpreadsheet size={20} className="shrink-0 text-accent-ink" strokeWidth={1.5} />
                <span className="truncate font-mono text-[10px] font-semibold text-card-foreground">
                  {DOWNLOAD_SCENE.fileName}
                </span>
              </div>
              <div className="absolute inset-x-3 bottom-3 flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5">
                <Download size={14} className="shrink-0 text-muted" strokeWidth={1.5} />
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-card-foreground" style={{ opacity: trayDone }}>
                  {DOWNLOAD_SCENE.fileName}
                </span>
                <span className="h-1.5 w-12 overflow-hidden rounded-full bg-navy">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${trayDone * 100}%` }} />
                </span>
              </div>
            </div>

            {/* Tahap 2 */}
            <div
              className="absolute inset-3 overflow-hidden rounded-lg border border-border bg-card shadow-soft"
              style={{ opacity: open, transform: `translateY(${(1 - open) * 8}px)` }}
            >
              <div className="flex h-6 items-center bg-navy px-2 font-mono text-[9px] font-medium text-white">
                <span className="truncate">{DOWNLOAD_SCENE.fileName}</span>
              </div>
              <div className="grid grid-cols-[40%_1fr] border-b border-excel-grid text-[10px]">
                <span className="border-r border-excel-grid px-2 py-1.5 text-muted">{DOWNLOAD_SCENE.folderLabel}</span>
                <span className="truncate px-2 py-1.5 font-mono font-medium text-input-ink">{DOWNLOAD_SCENE.folderValue}</span>
              </div>
              <div className="relative px-2 pt-2">
                <div
                  className="flex h-8 items-center justify-center rounded-md bg-action text-xs font-bold text-white"
                  style={{ transform: pressed ? 'scale(0.97)' : 'none', transition: 'transform 80ms' }}
                >
                  {DOWNLOAD_SCENE.button}
                </div>
                <Ants style={{ left: 4, right: 4, top: 4, height: 36, opacity: ramp(t, s.klik, s.klik + 200) }} />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex h-5 items-end gap-0.5 border-t border-excel-grid bg-excel-head px-2 text-[9px]">
                <span className="rounded-t border border-b-0 border-excel-grid bg-card px-2 py-0.5 font-semibold text-accent-ink">
                  Mulai
                </span>
                <span className="px-2 py-0.5 text-muted">Hasil</span>
                <span className="px-2 py-0.5 text-muted">Petunjuk</span>
              </div>
              <Pointer
                left={`${lerp(80, 56, cursor)}%`}
                top={lerp(30, 66, cursor)}
                opacity={ramp(t, s.klik, s.klik + 150) * (1 - done)}
                pressed={pressed}
              />
              <ClickRipple left="56%" top={80} progress={ramp(t, pressAt, pressAt + 300)} />

              {/* Centang sukses */}
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-card/85"
                style={{ opacity: done }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-action text-white"
                  style={{ transform: `scale(${0.6 + done * 0.4})` }}
                >
                  <Check size={22} strokeWidth={3} />
                </span>
                <span className="text-[11px] font-bold text-card-foreground">{DOWNLOAD_SCENE.done}</span>
              </div>
            </div>
          </div>
        )
      }}
    </LoopScene>
  )
}
