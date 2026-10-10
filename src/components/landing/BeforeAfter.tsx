import { ArrowRightLeft, FileCheck2, Hourglass } from 'lucide-react'
import { container } from './ui'

const ITEMS = [
  {
    icon: Hourglass,
    label: 'Sebelum',
    text: 'Buka file cabang satu per satu, copy paste, cek header, terus ulang lagi bulan depan.',
    featured: false,
  },
  {
    icon: FileCheck2,
    label: 'Sesudah',
    text: 'Taruh semua file di satu folder, klik Jalankan. Rekap jadi sebelum kopi kamu dingin.',
    featured: true,
  },
  {
    icon: ArrowRightLeft,
    label: 'Bedanya sama AI chat biasa',
    text: 'Kamu dapat file yang jalan, bukan potongan kode yang harus dirakit sendiri.',
    featured: false,
  },
]

export default function BeforeAfter() {
  return (
    <section className="bg-navy text-white">
      <div className={`${container} py-16 sm:py-20`}>
        <div className="grid gap-4 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, label, text, featured }) => (
            <div
              key={label}
              className={`rounded-xl p-7 ${
                featured ? 'border-2 border-primary bg-white/5' : 'border border-white/10 bg-white/5'
              }`}
            >
              <Icon size={24} strokeWidth={1.5} className={featured ? 'text-primary' : 'text-slate-300'} aria-hidden="true" />
              <h2 className="mt-4 text-xs font-semibold tracking-wide text-slate-300">{label}</h2>
              <p className="mt-2 text-base font-medium leading-relaxed text-white sm:text-lg">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
