'use client'

import { Check } from 'lucide-react'
import { HERO_STEPS } from './steps'
import LoopScene from './LoopScene'
import type { SceneFrame } from './LoopScene'
import { Ants, ClickRipple, ExcelWindow, Pointer } from './ExcelBits'
import { easeInOut, easeOut, lerp, ramp, rupiah, typed } from './timeline'

/* ------------------------------------------------------------------
 * TEKS CONTOH. Ubah isi di sini. Semua nama dan angka FIKTIF.
 * ------------------------------------------------------------------ */
export const HERO_SCENE = {
  fileName: 'Rekap Multi File.xlsm',
  title: 'REKAP MULTI FILE',
  folder: 'C:\\Laporan\\Cabang\\Oktober',
  settings: [
    { label: 'Folder sumber', value: null }, // null = diketik di animasi
    { label: 'Sheet yang diambil', value: 'Sales' },
    { label: 'Baris header', value: '1' },
    { label: 'Hasil ditaruh di', value: 'Rekap' },
  ],
  files: ['JKT.xlsx', 'SBY.xlsx', 'MDN.xlsx'],
  rows: [
    { cabang: 'JKT', tanggal: '01/10/25', customer: 'PT Contoh Abadi', nilai: 12450000 },
    { cabang: 'JKT', tanggal: '03/10/25', customer: 'CV Maju Contoh', nilai: 8300000 },
    { cabang: 'SBY', tanggal: '02/10/25', customer: 'PT Sinar Contoh', nilai: 15200000 },
    { cabang: 'SBY', tanggal: '07/10/25', customer: 'UD Contoh Jaya', nilai: 4750000 },
    { cabang: 'MDN', tanggal: '04/10/25', customer: 'PT Nusa Contoh', nilai: 9900000 },
    { cabang: 'MDN', tanggal: '09/10/25', customer: 'CV Contoh Mandiri', nilai: 6125000 },
  ],
  done: 'Selesai. 24 file digabung ke sheet Rekap.',
  label:
    'Contoh file Excel yang kamu download. Kamu isi folder sumber, klik tombol Jalankan, lalu semua file cabang digabung otomatis ke satu sheet Rekap.',
}


const HEAD_H = 20
const ROW_H = 28
const FOLDER_TOP = HEAD_H + 2 * ROW_H // baris 3
const BUTTON_TOP = HEAD_H + 6 * ROW_H + 2 // baris 7
const STATUS_TOP = HEAD_H + 6 * ROW_H + 44 // baris 8
const COLS = '24px 42% 1fr'

function Cell({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 items-center border-b border-r border-excel-grid px-2 text-[11px] ${className}`}>
      {children}
    </div>
  )
}

function RowNo({ n }: { n: number }) {
  return (
    <div className="flex items-center justify-center border-b border-r border-excel-grid bg-excel-head text-[10px] text-muted">
      {n}
    </div>
  )
}

function MulaiSheet({ f }: { f: SceneFrame }) {
  const t = f.t
  const s = f.start
  const folder = typed(HERO_SCENE.folder, t, 400, 16)

  // Posisi kotak seleksi: dari isian folder, pindah ke tombol Jalankan.
  const move = easeInOut(ramp(t, s.klik + 150, s.klik + 650))
  const antsOpacity = ramp(t, 250, 450)

  const pressed = t >= s.klik + 650 && t < s.klik + 800
  const cursorOpacity = ramp(t, 0, 300) * (1 - ramp(t, s.proses, s.proses + 300))
  const cursorMove = easeInOut(ramp(t, s.klik, s.klik + 500))

  // Progress bar + label file yang sedang dibuka.
  const prog = ramp(t, s.proses, s.rekap)
  const fileIdx = Math.min(HERO_SCENE.files.length - 1, Math.floor(prog * HERO_SCENE.files.length))
  const status = t >= s.proses ? `Membuka ${HERO_SCENE.files[fileIdx]}` : 'Siap dijalankan'

  return (
    <>
      <div className="grid text-[10px] text-muted" style={{ gridTemplateColumns: COLS, height: HEAD_H }}>
        <div className="border-b border-r border-excel-grid bg-excel-head" />
        <div className="flex items-center justify-center border-b border-r border-excel-grid bg-excel-head">A</div>
        <div className="flex items-center justify-center border-b border-r border-excel-grid bg-excel-head">B</div>
      </div>

      {/* Baris 1: judul */}
      <div className="grid" style={{ gridTemplateColumns: COLS, height: ROW_H }}>
        <RowNo n={1} />
        <Cell className="col-span-2 font-bold tracking-wide text-navy dark:text-foreground">{HERO_SCENE.title}</Cell>
      </div>
      {/* Baris 2: header kolom */}
      <div className="grid bg-excel-head font-semibold" style={{ gridTemplateColumns: COLS, height: ROW_H }}>
        <RowNo n={2} />
        <Cell>Pengaturan</Cell>
        <Cell>Isian</Cell>
      </div>
      {/* Baris 3 sampai 6: isian */}
      {HERO_SCENE.settings.map((row, i) => (
        <div key={row.label} className="grid" style={{ gridTemplateColumns: COLS, height: ROW_H }}>
          <RowNo n={i + 3} />
          <Cell>{row.label}</Cell>
          <Cell className="font-mono font-medium text-input-ink">
            <span className="truncate">{row.value ?? folder}</span>
          </Cell>
        </div>
      ))}

      {/* Baris 7: tombol */}
      <div className="grid" style={{ gridTemplateColumns: COLS, height: 44 }}>
        <RowNo n={7} />
        <div className="col-span-2 flex items-center border-b border-excel-grid px-1.5">
          <div
            className="flex h-9 w-full items-center justify-center rounded-md bg-action text-sm font-bold text-white shadow-glow"
            style={{
              transform: pressed ? 'scale(0.97) translateY(1px)' : 'none',
              transition: 'transform 80ms',
            }}
          >
            Jalankan
          </div>
        </div>
      </div>

      {/* Baris 8: status */}
      <div className="grid" style={{ gridTemplateColumns: COLS, height: ROW_H }}>
        <RowNo n={8} />
        <div className="col-span-2 flex items-center gap-3 border-b border-excel-grid px-2 text-[11px]">
          <span className="min-w-0 flex-1 truncate text-muted">{status}</span>
          <span className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-navy">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${prog * 100}%` }}
            />
          </span>
        </div>
      </div>

      {/* Kotak seleksi */}
      <Ants
        style={{
          opacity: antsOpacity,
          top: lerp(FOLDER_TOP, BUTTON_TOP, move),
          height: lerp(ROW_H, 40, move),
          left: `calc(${lerp(42, 0, move)}% + ${lerp(24, 28, move)}px)`,
          right: lerp(0, 4, move),
        }}
      />
      <ClickRipple left="72%" top={BUTTON_TOP + 20} progress={ramp(t, s.klik + 650, s.klik + 900)} />
      <Pointer
        left={`${lerp(62, 72, cursorMove)}%`}
        top={lerp(FOLDER_TOP + 12, BUTTON_TOP + 18, cursorMove)}
        opacity={cursorOpacity}
        pressed={pressed}
      />
    </>
  )
}

function RekapSheet({ f }: { f: SceneFrame }) {
  const t = f.t
  const s = f.start
  const cols = '24px 56px 64px 1fr 82px'
  const toast = easeOut(ramp(t, s.selesai, s.selesai + 300))

  return (
    <>
      <div className="grid text-[10px] text-muted" style={{ gridTemplateColumns: cols, height: HEAD_H }}>
        {['', 'A', 'B', 'C', 'D'].map((c) => (
          <div key={c} className="flex items-center justify-center border-b border-r border-excel-grid bg-excel-head">
            {c}
          </div>
        ))}
      </div>
      <div className="grid bg-excel-head font-semibold" style={{ gridTemplateColumns: cols, height: ROW_H }}>
        <RowNo n={1} />
        <Cell>Cabang</Cell>
        <Cell>Tanggal</Cell>
        <Cell>Customer</Cell>
        <Cell className="justify-end">Nilai</Cell>
      </div>
      {HERO_SCENE.rows.map((r, i) => {
        const appear = s.rekap + 300 + i * 250
        const visible = ramp(t, appear, appear + 150)
        const value = r.nilai * easeOut(ramp(t, appear + 100, appear + 600))
        return (
          <div key={i} className="grid" style={{ gridTemplateColumns: cols, height: ROW_H }}>
            <RowNo n={i + 2} />
            <Cell>
              <span style={{ opacity: visible }}>{r.cabang}</span>
            </Cell>
            <Cell>
              <span className="truncate" style={{ opacity: visible }}>{r.tanggal}</span>
            </Cell>
            <Cell>
              <span className="truncate" style={{ opacity: visible }}>{r.customer}</span>
            </Cell>
            <Cell className="justify-end font-mono">
              <span style={{ opacity: visible }}>{rupiah(value)}</span>
            </Cell>
          </div>
        )
      })}
      <div
        className="absolute inset-x-2 bottom-2 z-20 flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-[11px] font-semibold text-white shadow-soft-hover"
        style={{ opacity: toast, transform: `translateY(${(1 - toast) * 8}px)` }}
      >
        <Check size={14} className="shrink-0 text-primary" strokeWidth={3} />
        <span className="min-w-0 truncate">{HERO_SCENE.done}</span>
      </div>
    </>
  )
}

export default function HeroWorkbookScene() {
  return (
    <LoopScene steps={HERO_STEPS} poster={2600} label={HERO_SCENE.label}>
      {(f) => {
        const onRekap = f.t >= f.start.rekap
        const typingNow = f.t >= 300 && f.t < f.start.klik
        const afterClick = f.t >= f.start.klik + 650
        const folder = typed(HERO_SCENE.folder, f.t, 400, 16)

        const nameBox = onRekap ? 'A1' : afterClick ? 'B7' : 'B3'
        const formula = onRekap ? 'Cabang' : afterClick ? 'Jalankan' : folder

        return (
          <ExcelWindow
            title={HERO_SCENE.fileName}
            nameBox={nameBox}
            formula={formula}
            caret={!onRekap && typingNow}
            sheets={['Mulai', 'Rekap', 'Petunjuk']}
            activeSheet={onRekap ? 'Rekap' : 'Mulai'}
            bodyHeight={STATUS_TOP + ROW_H + 2}
          >
            {onRekap ? <RekapSheet f={f} /> : <MulaiSheet f={f} />}
          </ExcelWindow>
        )
      }}
    </LoopScene>
  )
}
