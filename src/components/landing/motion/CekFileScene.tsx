'use client'

import { cardPreview } from '../ui'
import { CEK_FILE_STEPS } from './steps'
import LoopScene from './LoopScene'
import { easeOut, ramp } from './timeline'

/* TEKS CONTOH: ubah di sini. `used` = label chip, null = kolom diabaikan. */
export const CEK_FILE_SCENE = {
  columns: [
    { header: 'Tanggal', used: 'Tanggal', cells: ['01/10', '02/10', '03/10', '04/10'] },
    { header: 'Customer', used: 'Customer', cells: ['PT Aru', 'CV Bima', 'UD Citra', 'PT Dika'] },
    { header: 'Kode', used: null, cells: ['A-01', 'A-02', 'B-07', 'B-09'] },
    { header: 'Qty', used: 'Qty', cells: ['12', '8', '30', '5'] },
    { header: 'Nilai', used: 'Nilai', cells: ['2,4jt', '1,6jt', '6jt', '1jt'] },
    { header: 'Catatan', used: null, cells: ['-', 'urgent', '-', '-'] },
  ],
  ignored: 'diabaikan',
  label:
    'Contoh: AI membaca baris header file kamu, mengenali kolom Tanggal, Customer, Qty, dan Nilai, lalu mengabaikan kolom yang tidak dipakai.',
}


const N = CEK_FILE_SCENE.columns.length

export default function CekFileScene() {
  return (
    <LoopScene className={cardPreview} steps={CEK_FILE_STEPS} label={CEK_FILE_SCENE.label} replayOnHover>
      {(f) => {
        const sweep = ramp(f.t, f.start.sapu + 100, f.start.sapu + 1300)
        const sweepOpacity = 1 - ramp(f.t, f.start.chip, f.start.chip + 400)
        const fade = easeOut(ramp(f.t, f.start.pudar, f.start.pudar + 500))
        let usedIdx = 0

        return (
          <div className="flex h-full flex-col justify-center gap-1.5 px-3">
            {/* Chip label di atas tiap kolom */}
            <div className="grid h-5" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
              {CEK_FILE_SCENE.columns.map((col) => {
                if (!col.used) return <span key={col.header} />
                const at = f.start.chip + usedIdx++ * 380
                const show = easeOut(ramp(f.t, at, at + 220))
                return (
                  <span key={col.header} className="flex justify-center">
                    <span
                      className="whitespace-nowrap rounded-full bg-action px-1.5 py-0.5 text-[9px] font-bold leading-none text-white"
                      style={{ opacity: show, transform: `translateY(${(1 - show) * 5}px) scale(${0.85 + show * 0.15})` }}
                    >
                      {col.used}
                    </span>
                  </span>
                )
              })}
            </div>

            {/* Grid mini 6 kolom x 5 baris (1 header + 4 data) */}
            <div className="relative overflow-hidden rounded border border-excel-grid bg-card">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
                {CEK_FILE_SCENE.columns.map((col) => (
                  <div
                    key={col.header}
                    className="border-r border-excel-grid last:border-r-0"
                    style={{ opacity: col.used ? 1 : 1 - fade * 0.8 }}
                  >
                    <div className="truncate border-b border-excel-grid bg-excel-head px-1 py-1 text-[9px] font-bold leading-none text-card-foreground">
                      {col.header}
                    </div>
                    {col.cells.map((cell, i) => (
                      <div
                        key={i}
                        className="truncate border-b border-excel-grid px-1 py-1 text-[9px] leading-none text-muted last:border-b-0"
                      >
                        {cell}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Garis sorot menyapu baris header */}
              <div
                className="pointer-events-none absolute left-0 top-0 h-[17px] bg-primary/25"
                style={{ width: `${sweep * 100}%`, opacity: sweepOpacity, borderRight: '2px solid var(--primary)' }}
              />

              {/* Label "diabaikan" vertikal di kolom yang tidak dipakai */}
              {CEK_FILE_SCENE.columns.map((col, i) =>
                col.used ? null : (
                  <span
                    key={col.header}
                    className="pointer-events-none absolute bottom-0 top-[17px] flex items-center justify-center text-[9px] font-semibold text-muted"
                    style={{
                      left: `${(i / N) * 100}%`,
                      width: `${100 / N}%`,
                      opacity: fade,
                      writingMode: 'vertical-rl',
                    }}
                  >
                    {CEK_FILE_SCENE.ignored}
                  </span>
                ),
              )}
            </div>
          </div>
        )
      }}
    </LoopScene>
  )
}
