import Link from 'next/link'
import { TRY_FREE_HREF } from '@/lib/links'
import { btnPrimary, container } from './ui'

export default function FinalCTA() {
  return (
    <section className="bg-navy text-white">
      <div className={`${container} flex flex-col items-center py-20 text-center sm:py-28`}>
        <h2 className="max-w-2xl font-serif text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
          Kerjaan berulang bulan depan, biar Excel yang kerjain.
        </h2>
        <Link href={TRY_FREE_HREF} className={`${btnPrimary} mt-10`}>
          Coba 1 macro gratis
        </Link>
      </div>
    </section>
  )
}
