import Link from 'next/link'

export type LegalSection = { title: string; body: string[] }

/** Kerangka halaman dokumen legal (privasi, syarat). Isinya ditulis di masing-masing halaman. */
export default function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm font-medium text-muted">Terakhir diperbarui: {updated}</p>
      <p className="mt-6 text-base font-medium leading-relaxed text-foreground">{intro}</p>

      <div className="mt-8 flex flex-col gap-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold text-foreground">{s.title}</h2>
            <div className="mt-2 flex flex-col gap-3 text-sm font-medium leading-relaxed text-muted">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm font-medium text-muted">
        Ada pertanyaan? Hubungi kami lewat{' '}
        <Link href="/help" className="font-bold text-accent-ink underline">
          halaman Bantuan
        </Link>
        .
      </p>
    </div>
  )
}
