import { Check } from 'lucide-react'

const DEFAULT_STEPS = ['Ceritain', 'Cek rencana', 'Download']

/** Stepper bernomor. `current` mulai dari 1. */
export default function Stepper({ current, steps = DEFAULT_STEPS }: { current: number; steps?: string[] }) {
  return (
    <ol aria-label="Tahapan" className="flex items-center gap-2 sm:gap-3">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? 'bg-action text-white'
                  : active
                    ? 'bg-navy text-white'
                    : 'border border-border bg-card text-muted'
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : n}
            </span>
            <span className={`text-sm font-bold ${active ? 'text-foreground' : 'hidden text-muted sm:inline'}`}>
              {label}
              {done && <span className="sr-only"> (selesai)</span>}
            </span>
            {n < steps.length && <span className="h-px w-4 bg-border sm:w-10" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
