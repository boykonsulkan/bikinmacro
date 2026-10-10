import { FileSpreadsheet } from 'lucide-react'

/* TEKS CONTOH: ubah daftar nama file di sini. */
export const TEMPLATE_FILES = [
  'RekapMultiFile.xlsm',
  'PecahPerRegion.xlsm',
  'KirimSlipGaji.xlsm',
  'RekonBank.xlsm',
  'ExportKePDF.xlsm',
  'BersihinData.xlsm',
]

function Chip({ name }: { name: string }) {
  return (
    <li className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-mono text-xs font-medium text-card-foreground shadow-soft">
      <FileSpreadsheet size={14} className="text-accent-ink" strokeWidth={1.5} aria-hidden="true" />
      {name}
    </li>
  )
}

/**
 * Chip nama file yang jalan pelan ke kiri. Berhenti saat di-hover (CSS),
 * dan statis (wrap biasa) kalau prefers-reduced-motion. Salinan kedua cuma
 * buat loop mulus, jadi disembunyikan dari screen reader.
 */
export default function TemplateMarquee() {
  return (
    <div className="marquee overflow-hidden motion-reduce:overflow-visible">
      <div className="marquee-track flex w-max motion-reduce:w-auto motion-reduce:flex-wrap">
        <ul className="flex gap-3 pr-3 motion-reduce:flex-wrap" aria-label="Contoh template">
          {TEMPLATE_FILES.map((n) => (
            <Chip key={n} name={n} />
          ))}
        </ul>
        <ul className="flex gap-3 pr-3 motion-reduce:hidden" aria-hidden="true">
          {TEMPLATE_FILES.map((n) => (
            <Chip key={n} name={n} />
          ))}
        </ul>
      </div>
    </div>
  )
}
