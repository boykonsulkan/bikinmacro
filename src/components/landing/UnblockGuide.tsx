import { ShieldAlert } from 'lucide-react'
import { container } from './ui'

const STEPS = [
  'Tutup file Excel-nya.',
  'Klik kanan file, pilih Properties.',
  'Centang Unblock di bagian bawah, lalu klik OK.',
  'Buka lagi file-nya, lalu klik Enable Content.',
]

export default function UnblockGuide() {
  return (
    <section className="bg-surface">
      <div className={`${container} pb-16 sm:pb-20`}>
        <div className="rounded-2xl border border-warning-border bg-warning-bg p-6 text-warning-ink sm:p-8">
          <div className="flex items-start gap-3">
            <ShieldAlert size={24} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-extrabold leading-snug sm:text-xl">
                Muncul bar merah &quot;macro diblokir&quot;? Itu normal.
              </h2>
              <p className="mt-1 text-sm font-medium leading-relaxed">
                Windows memang memblokir macro di file yang diunduh dari internet. Buka blokirnya sekali, selesai.
              </p>
            </div>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-xl bg-card/70 p-4 text-sm font-semibold">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning-ink text-xs font-bold text-warning-bg">
                  {i + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
