import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SIGNUP_HREF } from '@/lib/links'
import TemplateMarquee from './motion/TemplateMarquee'
import { container, eyebrow, sectionHeading } from './ui'

const USE_CASES = [
  {
    fn: 'RekapFileCabang',
    slug: 'rekap-file-cabang',
    title: 'Rekap file cabang',
    text: 'Gabung puluhan file cabang jadi satu sheet rekap dalam sekali klik.',
  },
  {
    fn: 'PecahPerRegion',
    slug: 'pecah-per-region',
    title: 'Pecah per region atau sales',
    text: 'Satu data besar dipecah jadi file atau sheet terpisah untuk tiap region atau sales.',
  },
  {
    fn: 'KirimSlipGaji',
    slug: 'kirim-slip-gaji',
    title: 'Kirim slip gaji per email',
    text: 'Slip gaji tiap karyawan dibikin dan dikirim ke email masing masing otomatis.',
  },
  {
    fn: 'RekonBank',
    slug: 'rekonsiliasi-bank',
    title: 'Rekonsiliasi bank',
    text: 'Cocokkan mutasi rekening koran dengan catatan buku, yang selisih langsung ditandai.',
  },
  {
    fn: 'ExportKePDF',
    slug: 'export-laporan-pdf',
    title: 'Export laporan ke PDF',
    text: 'Simpan tiap laporan jadi PDF dengan nama file rapi, tanpa Save As satu per satu.',
  },
  {
    fn: 'BersihinData',
    slug: 'bersihin-data-export',
    title: 'Bersihin data export sistem',
    text: 'Rapikan spasi, format tanggal, dan baris kosong dari hasil export sistem.',
  },
]

export default function UseCases() {
  return (
    <>
      <section id="use-case" className="scroll-mt-20 bg-surface">
        <div className={`${container} py-16 sm:py-20`}>
          <p className={eyebrow}>Use case</p>
          <h2 className={`${sectionHeading} mt-3 max-w-2xl`}>Kerjaan nyata, bukan contoh mainan.</h2>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <li key={u.slug}>
                <Link
                  href={`${SIGNUP_HREF}?template=${u.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-hover"
                >
                  <code className="w-fit rounded bg-excel-head px-2 py-1 font-mono text-xs font-semibold text-accent-ink">
                    {u.fn}
                  </code>
                  <h3 className="text-lg font-bold leading-snug text-card-foreground">{u.title}</h3>
                  <p className="flex-1 text-sm font-medium leading-relaxed text-muted">{u.text}</p>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-accent-ink">
                    Bikin macro ini
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="template" className="scroll-mt-20 bg-background">
        <div className={`${container} py-12 sm:py-14`}>
          <p className={eyebrow}>Template</p>
          <h2 className="mt-3 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Mulai dari template yang udah jadi.
          </h2>
          <div className="mt-6">
            <TemplateMarquee />
          </div>
        </div>
      </section>
    </>
  )
}
