import type { Metadata } from 'next'
import CekFileScene from '@/components/landing/motion/CekFileScene'
import CeritainScene from '@/components/landing/motion/CeritainScene'
import DownloadScene from '@/components/landing/motion/DownloadScene'
import ErrorFixScene from '@/components/landing/motion/ErrorFixScene'
import HeroWorkbookScene from '@/components/landing/motion/HeroWorkbookScene'
import { CEK_FILE_STEPS, CERITAIN_STEPS, DOWNLOAD_STEPS, ERROR_FIX_STEPS, HERO_STEPS } from '@/components/landing/motion/steps'
import TemplateMarquee from '@/components/landing/motion/TemplateMarquee'
import type { SceneStep } from '@/components/landing/motion/LoopScene'

// Halaman internal untuk cek dan atur timing animasi. Tidak ada di navigasi.
export const metadata: Metadata = {
  title: 'Dev: animasi',
  robots: { index: false, follow: false },
}

const HOLD = 1500 // sama dengan default `hold` di LoopScene

function Timing({ steps }: { steps: SceneStep[] }) {
  const total = steps.reduce((s, x) => s + x.duration, 0)
  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3 font-mono text-[11px] text-muted">
      <p className="font-semibold text-foreground">
        Loop {((total + HOLD) / 1000).toFixed(1)} dtk ({(total / 1000).toFixed(1)} + jeda {HOLD / 1000})
      </p>
      <ul className="mt-1">
        {steps.map((s) => (
          <li key={s.id}>
            {s.id}: {s.duration} ms
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DevAnimationsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-foreground">Animasi landing page</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Semua scene berdampingan. Durasi tiap langkah ada di konstanta STEPS di file scene-nya. Teks contoh ada di
        konstanta *_SCENE di file yang sama. Scene baru jalan saat masuk layar.
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-foreground">1. Hero: HeroWorkbookScene</h2>
        <div className="max-w-[520px]">
          <HeroWorkbookScene />
          <Timing steps={HERO_STEPS} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-bold text-foreground">2. Kartu fitur</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'A. CeritainScene', Scene: CeritainScene, steps: CERITAIN_STEPS },
            { name: 'B. CekFileScene', Scene: CekFileScene, steps: CEK_FILE_STEPS },
            { name: 'C. DownloadScene', Scene: DownloadScene, steps: DOWNLOAD_STEPS },
            { name: 'D. ErrorFixScene', Scene: ErrorFixScene, steps: ERROR_FIX_STEPS },
          ].map(({ name, Scene, steps }) => (
            <div key={name} data-replay-host>
              <p className="mb-2 text-xs font-semibold text-muted">{name}</p>
              <div className="overflow-hidden rounded-2xl border border-border">
                <Scene />
              </div>
              <Timing steps={steps} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-bold text-foreground">3. TemplateMarquee</h2>
        <TemplateMarquee />
      </section>
    </div>
  )
}
