import { ChevronDown } from 'lucide-react'
import { container, eyebrow, sectionHeading } from './ui'

// TODO: jawaban "Data saya aman?" harus dicek ulang sama kebijakan data yang
// beneran berlaku (apa yang disimpan, berapa lama, provider AI yang dipakai).
const ITEMS = [
  {
    q: 'Data saya aman?',
    a: 'Macro-nya jalan di Excel di laptop kamu sendiri, jadi file kerja kamu nggak dikirim ke mana mana pas macro dijalankan. Buat contoh file yang kamu upload, hapus atau samarkan isi yang sensitif. Struktur sheet dan header kolom aja sudah cukup. [KONFIRMASI: sesuaikan dengan kebijakan penyimpanan data]',
  },
  {
    q: 'Pakai Excel yang mana?',
    a: 'Excel desktop di Windows. Excel versi web belum bisa jalanin macro.',
  },
  {
    q: 'Kalau macronya salah?',
    a: 'Tempel pesan error-nya, atau ceritain hasil yang meleset. Kami benerin dan kirim versi barunya, gratis.',
  },
  {
    q: 'Perlu install sesuatu?',
    a: 'Nggak perlu install apa apa. Cukup Excel desktop yang sudah ada di laptop kamu.',
  },
]

export default function Faq() {
  return (
    <section className="bg-surface">
      <div className={`${container} py-16 sm:py-20`}>
        <div className="mx-auto max-w-2xl">
          <p className={eyebrow}>FAQ</p>
          <h2 className={`${sectionHeading} mt-3`}>Pertanyaan yang sering muncul</h2>

          <div className="mt-8 flex flex-col gap-3">
            {ITEMS.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-card shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-5 text-base font-bold text-card-foreground [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    size={20}
                    strokeWidth={1.5}
                    className="shrink-0 text-muted transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-5 pb-5 text-sm font-medium leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
