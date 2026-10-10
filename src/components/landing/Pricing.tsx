import Link from 'next/link'
import { Check, ShieldCheck } from 'lucide-react'
import { PAYMENT_LINK_BASIC } from '@/lib/links'
import { btnOutlineOnDark, btnPrimary, container } from './ui'

// Harga per use case, bukan langganan. 1 output = 1 file .xlsm untuk 1 use case.
// Revisi dilakukan lewat chat. Rp25.000 sudah pasti; harga paket lain adalah usulan.
// TODO: buat Midtrans Payment Link untuk paket "3 Output" lalu isi `href`
// (sekarang ke /help). Halaman /pricing masih memakai paket lama.
type Plan = {
  name: string
  price: string
  unit: string
  unitFirst?: boolean
  featured: boolean
  cta: string
  href: string
  external?: boolean
  items: string[]
}

const PLANS: Plan[] = [
  {
    name: '1 Output',
    price: 'Rp25.000',
    unit: 'per use case',
    featured: false,
    cta: 'Beli 1 output',
    href: PAYMENT_LINK_BASIC,
    external: true,
    items: [
      '1 file .xlsm siap pakai',
      'Upload contoh file kamu',
      '3 revisi lewat chat',
      'Error? Dibenerin gratis',
    ],
  },
  {
    name: '3 Output',
    price: 'Rp59.000',
    unit: 'per paket',
    featured: true,
    cta: 'Tanya paket ini',
    href: '/help',
    items: [
      '3 file .xlsm untuk 3 use case',
      'Upload contoh file kamu',
      '5 revisi lewat chat per output',
      'Error? Dibenerin gratis',
    ],
  },
  {
    name: 'Dibuatin',
    price: 'Rp750.000',
    unit: 'mulai dari',
    unitFirst: true,
    featured: false,
    cta: 'Ngobrol dulu',
    href: '/help',
    items: [
      'Untuk kasus rumit',
      'Dikerjakan praktisi finance',
      'Sesi serah terima',
    ],
  },
]

export default function Pricing({ xenditNotice = false }: { xenditNotice?: boolean }) {
  return (
    <section id="harga" className="scroll-mt-20 bg-navy text-white">
      <div className={`${container} py-16 sm:py-24`}>
        <p className="text-xs font-semibold tracking-wide text-primary">Harga</p>
        <h2 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Bayar per kerjaan, bukan langganan.
        </h2>
        <p className="mt-3 max-w-2xl text-base font-medium text-slate-300">
          Satu output adalah satu file Excel untuk satu use case. Mau ubah atau benerin? Tinggal chat.
        </p>

        <div className="mt-12 grid items-start gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const className = `mt-8 w-full ${p.featured ? btnPrimary : btnOutlineOnDark}`
            return (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-xl p-7 ${
                  p.featured ? 'border-2 border-primary bg-white/10' : 'border border-white/10 bg-white/5'
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-action px-3 py-1 text-xs font-bold text-white">
                    Paling worth
                  </span>
                )}
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-3 flex items-baseline gap-2">
                  {p.unitFirst && <span className="text-sm font-medium text-slate-300">{p.unit}</span>}
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  {!p.unitFirst && <span className="text-sm font-medium text-slate-300">{p.unit}</span>}
                </p>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-slate-100">
                      <Check size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>

                {p.external ? (
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {p.cta}
                  </a>
                ) : (
                  <Link href={p.href} className={className}>
                    {p.cta}
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-sm font-medium text-slate-300">
          Sudah bayar?{' '}
          <Link href="/pesan" className="font-bold text-white underline underline-offset-4">
            Isi form pesanan
          </Link>{' '}
          supaya kerjaan kamu mulai dibikin.
        </p>

        {xenditNotice && (
          <p className="mt-10 flex items-start gap-2 text-sm font-medium text-slate-300">
            <ShieldCheck size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Pembayaran diproses oleh <strong className="font-bold text-white">Xendit</strong> atas nama{' '}
              <strong className="font-bold text-white">konsulkan.com</strong>, parent brand dari BikinMacro.
            </span>
          </p>
        )}
      </div>
    </section>
  )
}
