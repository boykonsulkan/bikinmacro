import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Syarat Penggunaan | BikinMacro',
  description: 'Aturan pemakaian BikinMacro, termasuk batasan hasil AI dan tahap beta.',
}

export default function SyaratPage() {
  return (
    <LegalPage
      title="Syarat Penggunaan"
      updated="12 Oktober 2026"
      intro="Dengan memakai BikinMacro kamu setuju dengan syarat berikut. Kami menulisnya sesederhana mungkin."
      sections={[
        {
          title: 'Layanan dan tahap beta',
          body: [
            'BikinMacro membantu membuat macro Excel VBA dari deskripsi kamu dengan bantuan AI. Layanan ini masih dalam tahap beta: fitur, batas pemakaian, dan tampilan bisa berubah. Unduhan file Excel (.xlsm) masih tahap uji, jadi file .bas yang kami sarankan.',
          ],
        },
        {
          title: 'Hasil dari AI bisa salah',
          body: [
            'Macro dihasilkan AI dan tidak dijamin benar atau cocok dengan datamu. Sebelum dipakai untuk pekerjaan penting, coba dulu di salinan file dan simpan cadangan. Kamu bertanggung jawab atas pemakaian macro di file dan komputermu.',
            'Macro hanya berjalan di Excel desktop Windows. Setelah memasang macro, simpan file sebagai Excel Macro-Enabled Workbook (.xlsm), bukan .xlsx biasa.',
          ],
        },
        {
          title: 'Yang tidak boleh dilakukan',
          body: [
            'Memakai layanan untuk membuat program berbahaya, mengakses sistem atau data tanpa izin, mengunduh atau menjalankan program lain, atau mencoba menembus pembatasan layanan. Permintaan seperti ini ditolak otomatis, dan akun yang berulang kali melanggar dapat dibatasi atau dihentikan.',
            'Satu akun untuk satu orang. Jangan membagikan akunmu atau memakai banyak akun untuk menghindari batas pemakaian.',
          ],
        },
        {
          title: 'Paket, kuota, dan pembayaran',
          body: [
            'Jumlah macro dan jatah revisi chat mengikuti paket yang kamu pilih, seperti tertera di halaman Harga. Pembayaran diproses lewat Midtrans. Kalau ada kendala pembayaran atau paket belum aktif, hubungi kami lewat halaman Bantuan.',
            'Akses beta yang diberikan lewat undangan bersifat sementara dan dapat dicabut atau diakhiri.',
          ],
        },
        {
          title: 'Data kamu',
          body: [
            'Cara kami menyimpan dan memakai data dijelaskan di Kebijakan Privasi. Kode macro yang dibuat untukmu boleh kamu pakai bebas untuk pekerjaanmu sendiri.',
          ],
        },
        {
          title: 'Batas tanggung jawab',
          body: [
            'Layanan disediakan apa adanya. Sejauh diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung, termasuk kehilangan data atau waktu akibat macro yang tidak berjalan sebagaimana mestinya.',
          ],
        },
        {
          title: 'Perubahan syarat',
          body: ['Syarat ini bisa berubah. Tanggal pembaruan di atas menunjukkan versi terbaru, dan perubahan penting kami umumkan lewat email.'],
        },
      ]}
    />
  )
}
