import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi | BikinMacro',
  description: 'Data apa yang BikinMacro simpan, untuk apa, dan siapa saja yang memprosesnya.',
}

export default function PrivasiPage() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      updated="12 Oktober 2026"
      intro="BikinMacro membuat macro Excel VBA dari deskripsi kamu. Halaman ini menjelaskan data apa yang kami simpan, untuk apa dipakai, dan siapa saja yang ikut memprosesnya."
      sections={[
        {
          title: 'Data yang kami simpan',
          body: [
            'Akun: alamat email dan password. Password disimpan dalam bentuk terenkripsi oleh penyedia autentikasi kami, kami tidak bisa membacanya.',
            'Pemakaian: permintaan macro yang kamu tulis, kode macro hasilnya, dan percakapan chat revisi. Ini yang muncul di Riwayat.',
            'Catatan aktivitas: kejadian seperti kapan kamu terakhir masuk, membuat macro, menyalin kode, atau mengunduh file. Isi permintaan tidak disalin ke catatan ini.',
            'Pembayaran: nomor order, paket, dan nominal. Data kartu atau rekening diproses langsung oleh Midtrans dan tidak kami simpan.',
            'Isi file kerja Excel kamu tidak dikirim ke kami. Macro berjalan di Excel di komputermu sendiri.',
          ],
        },
        {
          title: 'Untuk apa data dipakai',
          body: [
            'Menjalankan layanan: membuat dan merevisi macro, menampilkan riwayat, memproses pembayaran, dan mengaktifkan paket.',
            'Keamanan: mendeteksi penyalahgunaan, misalnya permintaan di luar topik atau kode berbahaya.',
            'Riset dan pengembangan platform: tim BikinMacro dapat membaca permintaan dan hasilnya untuk memahami kebutuhan pengguna dan memperbaiki produk. Data tidak dijual dan tidak akan disalahgunakan.',
          ],
        },
        {
          title: 'Pihak yang ikut memproses data',
          body: [
            'Supabase (database dan autentikasi), Vercel (hosting), Midtrans (pembayaran), dan Resend (pengiriman email).',
            'Penyedia model AI (misalnya OpenRouter, OpenAI, atau Google) menerima teks permintaan dan chat kamu supaya macro bisa dibuat. Karena itu, jangan menulis data sensitif seperti nomor rekening, gaji asli, atau data pribadi orang lain di permintaan. Cukup sebut nama sheet dan kolom.',
          ],
        },
        {
          title: 'Berapa lama data disimpan dan cara menghapusnya',
          body: [
            'Data disimpan selama akunmu aktif. Kamu bisa meminta penghapusan akun dan seluruh datanya lewat halaman Bantuan. Catatan pembayaran bisa kami simpan lebih lama bila diwajibkan untuk pembukuan.',
          ],
        },
        {
          title: 'Perubahan kebijakan',
          body: [
            'Kalau kebijakan ini berubah, tanggal pembaruan di atas ikut berubah. Perubahan penting akan kami umumkan lewat email.',
          ],
        },
      ]}
    />
  )
}
