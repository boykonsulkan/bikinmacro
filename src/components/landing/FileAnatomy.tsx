import { BookOpen, Code2, Play, Table2 } from 'lucide-react'
import { container, eyebrow, sectionHeading } from './ui'

const SHEETS = [
  {
    icon: Play,
    name: 'Mulai',
    text: 'Isian pengaturan dan tombol Jalankan. Cuma di sini kamu perlu ngapa ngapain.',
  },
  {
    icon: Table2,
    name: 'Hasil',
    text: 'Tempat output macro, rapi dan siap kamu olah lagi.',
  },
  {
    icon: BookOpen,
    name: 'Petunjuk',
    text: 'Cara pakai dalam bahasa awam, plus kemungkinan error dan cara beresinnya.',
  },
  {
    icon: Code2,
    name: 'Bonus .bas',
    text: 'Kode VBA-nya buat kamu yang udah jago dan mau ngoprek sendiri.',
  },
]

export default function FileAnatomy() {
  return (
    <section className="bg-background">
      <div className={`${container} py-16 sm:py-20`}>
        <p className={eyebrow}>Hasil akhirnya</p>
        <h2 className={`${sectionHeading} mt-3 max-w-2xl`}>Isi file yang kamu download</h2>

        <dl className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SHEETS.map(({ icon: Icon, name, text }) => (
            <div key={name} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-excel-head text-accent-ink">
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <dt className="mt-4 font-mono text-base font-bold text-card-foreground">{name}</dt>
              <dd className="mt-2 text-sm font-medium leading-relaxed text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
