import Link from 'next/link'
import { Check, ShieldCheck } from 'lucide-react'
import { btnOutlineOnDark, btnPrimary, container } from './ui'

// TODO: isi harga dan jumlah macro. Placeholder [HARGA] / [JUMLAH] sengaja
// dibiarkan terlihat. Tombol sementara ke /pricing (paket di sana masih
// Addon/Starter/Pro) dan /help; sesuaikan setelah paket baru ditetapkan.
const PLANS = [
  {
    name: 'Template',
    price: '[HARGA]',
    unit: 'sekali beli',
    featured: false,
    cta: 'Lihat harga',
    href: '/pricing',
    items: [
      'Pilih satu dari template siap pakai',
      'File .xlsm lengkap: sheet Mulai, Hasil, Petunjuk',
      'Error? Dibenerin gratis',
    ],
  },
  {
    name: 'Pro',
    price: '[HARGA]',
    unit: 'per bulan',
    featured: true,
    cta: 'Pilih Pro',
    href: '/pricing',
    items: [
      '[JUMLAH] macro custom per bulan',
      'Upload contoh file',
      'Debug tanpa batas',
      'Semua template',
    ],
  },
  {
    name: 'Dibuatin',
    price: '[HARGA]',
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
          Bayar sesuai kebutuhan kerjaan kamu.
        </h2>

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

              <Link href={p.href} className={`mt-8 w-full ${p.featured ? btnPrimary : btnOutlineOnDark}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

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
