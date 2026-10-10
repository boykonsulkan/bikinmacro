import type { Metadata } from 'next'
import Link from 'next/link'
import PesanForm from '@/components/pesan/PesanForm'
import { PAYMENT_LINK_BASIC } from '@/lib/links'

export const metadata: Metadata = {
  title: 'Pesan macro | BikinMacro',
  description: 'Sudah bayar? Isi form ini supaya kerjaan kamu mulai dibikin.',
  robots: { index: false, follow: false },
}

const STEPS = [
  'Bayar paket kamu lewat Midtrans.',
  'Isi form ini dengan nomor order dan cerita kerjaan kamu.',
  'Pantau status dan chat revisi di halaman pesanan.',
]

export default function PesanPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-semibold tracking-wide text-accent-ink">Pesan macro</p>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
        Sudah bayar? Ceritain kerjaan kamu.
      </h1>

      <ol className="mt-6 flex flex-col gap-2 text-sm font-medium text-muted">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-sm font-medium text-muted">
        Belum bayar?{' '}
        <a href={PAYMENT_LINK_BASIC} target="_blank" rel="noopener noreferrer" className="font-bold text-accent-ink underline">
          Bayar paket 1 Output (Rp25.000)
        </a>
        . Untuk paket lain,{' '}
        <Link href="/help" className="font-bold text-accent-ink underline">
          tanya dulu di Bantuan
        </Link>
        .
      </p>

      <div className="mt-8">
        <PesanForm />
      </div>
    </div>
  )
}
