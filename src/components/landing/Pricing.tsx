import Link from 'next/link'
import { Check, ShieldCheck } from 'lucide-react'
import { SIGNUP_HREF, TRY_FREE_HREF } from '@/lib/links'
import { btnOutlineOnDark, btnPrimary, container } from './ui'

// Paket di sini harus sama dengan yang dijual di /pricing dan dibatasi di plan_settings (database):
//   addon   Rp25.000 sekali bayar   5 macro,   5 chat per macro
//   starter Rp79.000 per bulan      20 macro,  10 chat per macro, riwayat
//   pro     Rp149.000 per bulan     tanpa batas wajar (999), 50 chat per macro, riwayat
// Harga ada di src/app/api/checkout/route.ts. Kalau salah satunya berubah, ubah di semua tempat ini.
// Pembelian dilakukan setelah login lewat /pricing, jadi tombol di sini mengarah ke sana.
type Plan = {
  name: string
  price: string
  unit: string
  featured: boolean
  cta: string
  href: string
  items: string[]
}

const PLANS: Plan[] = [
  {
    name: 'Macro Addon',
    price: 'Rp25.000',
    unit: 'sekali bayar',
    featured: false,
    cta: 'Pilih Addon',
    href: '/pricing',
    items: ['5 macro, tanpa kedaluwarsa', '5 revisi lewat chat per macro', 'Unduh .bas atau Excel .xlsm (beta)'],
  },
  {
    name: 'Starter',
    price: 'Rp79.000',
    unit: 'per bulan',
    featured: false,
    cta: 'Pilih Starter',
    href: '/pricing',
    items: ['20 macro per bulan', '10 revisi lewat chat per macro', 'Riwayat macro tersimpan', 'Unduh .bas atau Excel .xlsm (beta)'],
  },
  {
    name: 'Pro',
    price: 'Rp149.000',
    unit: 'per bulan',
    featured: true,
    cta: 'Pilih Pro',
    href: '/pricing',
    items: ['Macro tanpa batas (batas wajar berlaku)', '50 revisi lewat chat per macro', 'Riwayat macro tersimpan', 'Unduh .bas atau Excel .xlsm (beta)'],
  },
]

export default function Pricing({ xenditNotice = false }: { xenditNotice?: boolean }) {
  return (
    <section id="harga" className="scroll-mt-20 bg-navy text-white">
      <div className={`${container} py-16 sm:py-24`}>
        <p className="text-xs font-semibold tracking-wide text-primary">Harga</p>
        <h2 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Pilih sesuai seberapa sering kamu butuh macro.
        </h2>
        <p className="mt-3 max-w-2xl text-base font-medium text-slate-300">
          Mulai gratis dengan 3 macro. Butuh sesekali? Addon sekali bayar. Sering pakai? Starter atau Pro bulanan.
        </p>

        <div className="mt-12 grid items-start gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
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
                <span className="text-3xl font-extrabold">{p.price}</span>
                <span className="text-sm font-medium text-slate-300">{p.unit}</span>
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-slate-100">
                    <Check size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link href={p.href} className={`mt-8 w-full ${p.featured ? btnPrimary : btnOutlineOnDark}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold">Dibuatin, untuk kasus rumit</h3>
            <p className="mt-1 text-sm font-medium text-slate-300">
              Mulai dari Rp750.000. Dikerjakan praktisi finance, ada sesi serah terima.{' '}
              <Link href="/pesan" className="font-bold text-white underline underline-offset-4">
                Sudah bayar? Isi form pesanan
              </Link>
              .
            </p>
          </div>
          <Link href="/help" className={`shrink-0 ${btnOutlineOnDark}`}>
            Ngobrol dulu
          </Link>
        </div>

        <p className="mt-8 text-sm font-medium text-slate-300">
          Belum yakin?{' '}
          <Link href={TRY_FREE_HREF} className="font-bold text-white underline underline-offset-4">
            Coba demo tanpa daftar
          </Link>{' '}
          atau{' '}
          <Link href={SIGNUP_HREF} className="font-bold text-white underline underline-offset-4">
            daftar gratis
          </Link>{' '}
          dan dapat 3 macro. Macro jalan di Excel desktop Windows.
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
