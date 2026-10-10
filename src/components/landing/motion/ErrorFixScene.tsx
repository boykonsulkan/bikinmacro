'use client'

import { Check, TriangleAlert } from 'lucide-react'
import { cardPreview } from '../ui'
import { ERROR_FIX_STEPS } from './steps'
import LoopScene from './LoopScene'
import { easeOut, ramp, typed } from './timeline'

/* TEKS CONTOH: ubah di sini. */
export const ERROR_FIX_SCENE = {
  errorBanner: "Run time error '9': Subscript out of range",
  fixedBanner: 'Beres. Versi baru sudah dikirim.',
  // Baris kode editor. Baris `broken` yang disorot lalu diganti `fixed`.
  before: ['Sub RekapMulti()', '  Set wb = Workbooks.Open(f)'],
  broken: '  Set ws = wb.Sheets("Sales")',
  fixed: '  Set ws = wb.Sheets(1)',
  after: ['  ws.UsedRange.Copy', 'End Sub'],
  label:
    'Contoh: macro error "Subscript out of range". Kamu tempel pesan error-nya, baris kode yang salah diganti, dan macro langsung jalan lagi.',
}


const KEYWORD_SPLIT = /\b(Sub|End|Set|Dim|As|For|Next|If|Then)\b/
const KEYWORD_ONLY = /^(Sub|End|Set|Dim|As|For|Next|If|Then)$/

function Code({ line }: { line: string }) {
  // Pewarnaan sederhana: keyword dan string.
  return (
    <>
      {line.split(/("[^"]*")/).map((part, i) =>
        part.startsWith('"') ? (
          <span key={i} className="text-vbe-string">{part}</span>
        ) : (
          part.split(KEYWORD_SPLIT).map((seg, j) =>
            KEYWORD_ONLY.test(seg) ? (
              <span key={`${i}-${j}`} className="text-vbe-keyword">{seg}</span>
            ) : (
              <span key={`${i}-${j}`}>{seg}</span>
            ),
          )
        ),
      )}
    </>
  )
}

export default function ErrorFixScene() {
  return (
    <LoopScene className={cardPreview} steps={ERROR_FIX_STEPS} label={ERROR_FIX_SCENE.label} replayOnHover>
      {(f) => {
        const s = f.start
        const t = f.t
        const { broken, fixed } = ERROR_FIX_SCENE

        const banner = easeOut(ramp(t, 150, 550))
        const fixedState = t >= s.beres
        const hl = ramp(t, 700, 900)

        // Baris bermasalah: dihapus mundur, lalu ketik baris baru.
        const erase = ramp(t, s.hapus, s.hapus + 450)
        const keep = Math.round(broken.length * (1 - erase))
        const line =
          t < s.hapus
            ? broken
            : t < s.ketik
              ? broken.slice(0, keep)
              : typed(fixed, t, s.ketik, 18)
        const typing = t >= s.hapus && t < s.beres

        return (
          <div className="flex h-full flex-col bg-vbe-bg">
            <div
              className={`flex h-7 shrink-0 items-center gap-1.5 px-2.5 text-[10px] font-semibold text-white ${
                fixedState ? 'bg-action' : 'bg-danger/90'
              }`}
              style={{ opacity: banner, transform: `translateY(${(banner - 1) * 8}px)` }}
            >
              {fixedState ? (
                <Check size={12} strokeWidth={3} className="shrink-0" />
              ) : (
                <TriangleAlert size={12} className="shrink-0" />
              )}
              <span className="truncate">{fixedState ? ERROR_FIX_SCENE.fixedBanner : ERROR_FIX_SCENE.errorBanner}</span>
            </div>

            <div className="flex-1 overflow-hidden py-2 font-mono text-[10px] leading-[18px] text-vbe-text">
              {ERROR_FIX_SCENE.before.map((l) => (
                <div key={l} className="whitespace-pre px-3">
                  <Code line={l} />
                </div>
              ))}
              <div
                className={`whitespace-pre px-3 ${hl > 0 ? 'text-black' : ''}`}
                style={{
                  background:
                    hl > 0 ? (fixedState ? 'var(--vbe-hl-ok)' : 'var(--vbe-hl-warn)') : 'transparent',
                }}
              >
                {line}
                {typing && <span className="caret-blink inline-block h-3 w-px translate-y-0.5 bg-black" />}
                {!line && ' '}
              </div>
              {ERROR_FIX_SCENE.after.map((l) => (
                <div key={l} className="whitespace-pre px-3">
                  <Code line={l} />
                </div>
              ))}
            </div>
          </div>
        )
      }}
    </LoopScene>
  )
}
