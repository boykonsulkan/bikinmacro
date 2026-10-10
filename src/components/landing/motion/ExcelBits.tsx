import type { ReactNode } from 'react'

/** Window Excel tiruan: title bar, Name Box + formula bar fx, isi, tab sheet. */
export function ExcelWindow({
  title,
  nameBox,
  formula,
  caret = false,
  sheets,
  activeSheet,
  bodyHeight,
  children,
  className = '',
}: {
  title: string
  nameBox: string
  formula: string
  caret?: boolean
  sheets: string[]
  activeSheet: string
  bodyHeight: number
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-soft ${className}`}
    >
      <div className="flex h-8 items-center gap-2 bg-navy px-3 text-white">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-white/30" />
          <span className="h-2 w-2 rounded-full bg-white/30" />
          <span className="h-2 w-2 rounded-full bg-white/30" />
        </span>
        <span className="truncate font-mono text-[11px] font-medium">{title}</span>
      </div>
      <div className="flex h-7 items-center gap-2 border-b border-excel-grid bg-excel-head px-2 text-[11px]">
        <span className="w-10 shrink-0 rounded border border-excel-grid bg-card px-1.5 py-0.5 text-center font-mono text-muted">
          {nameBox}
        </span>
        <span className="font-mono font-semibold italic text-muted">fx</span>
        <span className="min-w-0 flex-1 truncate font-mono text-card-foreground">
          {formula}
          {caret && <span className="caret-blink ml-px inline-block h-3 w-px translate-y-0.5 bg-card-foreground" />}
        </span>
      </div>
      <div className="relative overflow-hidden" style={{ height: bodyHeight }}>
        {children}
      </div>
      <div className="flex h-7 items-end gap-0.5 border-t border-excel-grid bg-excel-head px-2 text-[11px]">
        {sheets.map((name) => (
          <span
            key={name}
            className={
              name === activeSheet
                ? 'rounded-t border border-b-0 border-excel-grid bg-card px-3 py-1 font-semibold text-primary'
                : 'px-3 py-1 text-muted'
            }
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Kotak seleksi garis putus-putus bergerak (marching ants). */
export function Ants({
  style,
  className = '',
}: {
  style: React.CSSProperties
  className?: string
}) {
  return <div className={`marching-ants pointer-events-none absolute z-10 ${className}`} style={style} />
}

/** Kursor mouse. Posisi dalam persen/px dari container relatif. */
export function Pointer({
  left,
  top,
  opacity = 1,
  pressed = false,
}: {
  left: string
  top: number
  opacity?: number
  pressed?: boolean
}) {
  return (
    <svg
      viewBox="0 0 16 20"
      className="pointer-events-none absolute z-30 h-5 w-4 text-navy drop-shadow-sm dark:text-white"
      style={{
        left,
        top,
        opacity,
        transform: `scale(${pressed ? 0.85 : 1})`,
        transformOrigin: '2px 2px',
      }}
    >
      <path
        d="M2 1.5v14l3.6-3.4 2.4 5.3 2.2-1-2.4-5.2H13z"
        fill="currentColor"
        stroke="var(--card)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Cincin kecil yang melebar: efek klik. */
export function ClickRipple({ left, top, progress }: { left: string; top: number; progress: number }) {
  if (progress <= 0 || progress >= 1) return null
  return (
    <span
      className="pointer-events-none absolute z-20 rounded-full border-2 border-primary"
      style={{
        left,
        top,
        width: 28,
        height: 28,
        marginLeft: -12,
        marginTop: -12,
        opacity: 1 - progress,
        transform: `scale(${0.4 + progress * 1.1})`,
      }}
    />
  )
}
