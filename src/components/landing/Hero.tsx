import Link from 'next/link'
import { FileCheck2, Monitor, Wrench } from 'lucide-react'
import { TRY_FREE_HREF } from '@/lib/links'
import HeroWorkbookScene from './motion/HeroWorkbookScene'
import { btnOutline, btnPrimary, container, eyebrow } from './ui'

const POINTS = [
  { icon: FileCheck2, text: 'File .xlsm siap pakai' },
  { icon: Wrench, text: 'Error? Dibenerin gratis' },
  { icon: Monitor, text: 'Jalan di Excel Windows' },
]

export default function Hero() {
  return (
    <section className="bg-background">
      <div className={`${container} grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-24`}>
        <div>
          <p className={eyebrow}>Buat tim finance, admin, dan accounting</p>
          <h1 className="mt-4 font-serif text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Kerjaan Excel berjam jam, beres sekali klik.
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-muted sm:text-lg">
            Ceritain masalahnya dan upload contoh file. Kamu dapat file Excel yang langsung jalan, lengkap dengan
            tombol Jalankan. Nggak perlu buka VBA sama sekali.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={TRY_FREE_HREF} className={btnPrimary}>
              Coba 1 macro gratis, tanpa daftar
            </Link>
            <Link href="/#template" className={btnOutline}>
              Lihat template
            </Link>
          </div>

          <ul className="mt-8 flex flex-col gap-3 text-sm font-semibold text-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon size={18} strokeWidth={1.5} className="text-accent-ink" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <figure className="mx-auto w-full max-w-[520px]">
          <HeroWorkbookScene />
          <figcaption className="mt-3 text-center text-xs font-medium text-muted">
            Contoh tampilan file yang kamu download
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
