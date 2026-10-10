import CekFileScene from './motion/CekFileScene'
import CeritainScene from './motion/CeritainScene'
import DownloadScene from './motion/DownloadScene'
import ErrorFixScene from './motion/ErrorFixScene'
import { container, eyebrow, sectionHeading } from './ui'

const STEPS = [
  {
    title: 'Ceritain masalahnya',
    text: 'Tulis kerjaan kamu pakai bahasa sehari hari, kayak ngomong ke rekan kerja.',
    Scene: CeritainScene,
  },
  {
    title: 'AI cek file kamu',
    text: 'Upload contoh file. AI baca header dan kolomnya, jadi macro nyambung ke data aslimu.',
    Scene: CekFileScene,
  },
  {
    title: 'Download dan klik',
    text: 'Dapat file Excel siap jalan. Buka, isi pengaturan, klik Jalankan.',
    Scene: DownloadScene,
  },
  {
    title: 'Error? Tempel aja',
    text: 'Macro error? Tempel pesan error-nya, versi baru dikirim gratis.',
    Scene: ErrorFixScene,
  },
]

export default function Steps() {
  return (
    <section className="bg-background">
      <div className={`${container} py-16 sm:py-20`}>
        <p className={eyebrow}>Cara kerja</p>
        <h2 className={`${sectionHeading} mt-3 max-w-2xl`}>Empat langkah, tanpa buka VBA.</h2>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ title, text, Scene }, i) => (
            <li
              key={title}
              data-replay-host
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-soft-hover"
            >
              <Scene />
              <div className="flex flex-1 flex-col gap-2 p-6">
                <span className="text-xs font-semibold tracking-wide text-accent-ink">Langkah {i + 1}</span>
                <h3 className="text-lg font-bold leading-snug text-card-foreground">{title}</h3>
                <p className="text-sm font-medium leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
