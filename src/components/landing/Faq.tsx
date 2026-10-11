import { ChevronDown } from 'lucide-react'
import { container, eyebrow, sectionHeading } from './ui'

// Jawaban "Data saya aman?" menjelaskan perilaku produk saat ini (permintaan dan kode disimpan di akun, dibaca admin,
// diproses penyedia AI). Kalau kebijakan data berubah, ubah teks ini.
const ITEMS = [
  {
    q: 'Data saya aman?',
    a: 'Macro jalan di Excel di laptop kamu sendiri, jadi isi file kerja kamu nggak dikirim ke kami. Yang kami simpan adalah permintaan dan kode macro yang kamu buat, supaya muncul di Riwayat dan bisa kamu lanjutkan. Tim BikinMacro bisa membacanya untuk memperbaiki produk, dan teks permintaan diproses penyedia AI untuk membuat macro. Jadi cukup sebut nama sheet dan kolom, jangan tulis data sensitif seperti nomor rekening atau gaji asli.',
  },
  {
    q: 'Pakai Excel yang mana?',
    a: 'Excel desktop di Windows. Excel versi web belum bisa jalanin macro.',
  },
  {
    q: 'Kalau macronya salah?',
    a: 'Tempel pesan error-nya, atau ceritain hasil yang meleset, di chat. AI memperbaiki macro-nya sesuai jatah revisi paketmu (Addon 5, Starter 10, Pro 50 per macro). Untuk kasus yang rumit, ada layanan Dibuatin.',
  },
  {
    q: 'Habis bayar, gimana?',
    a: 'Paket langsung aktif di akunmu begitu pembayaran berhasil. Buka halaman Generate dan mulai bikin macro. Kalau belum aktif setelah beberapa menit, hubungi kami lewat halaman Bantuan.',
  },
  {
    q: 'Apa bedanya file .bas dan .xlsm?',
    a: 'File .bas berisi kode yang kamu import ke Excel sendiri. Ini cara paling stabil dan yang kami sarankan. File .xlsm adalah workbook kosong yang sudah berisi macro, masih tahap uji. Setelah macro terpasang, simpan filemu sebagai Excel Macro-Enabled Workbook (.xlsm), bukan .xlsx biasa, kalau tidak macro-nya hilang.',
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
