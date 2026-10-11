import type { Metadata } from 'next'
import ActivationForm from './ActivationForm'

export const metadata: Metadata = {
  title: 'Aktifkan akun beta | BikinMacro',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

// Link undangan: https://bikinmacro.my.id/aktivasi#TOKEN. Token ada di bagian #, jadi halaman dirender di browser
// dan token nggak pernah sampai ke log server. Membuka link TIDAK mengaktifkan apa pun; aktivasi baru terjadi saat tombol diklik
// (supaya pemindai link di email nggak menghanguskan undangan).
export default function AktivasiPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 sm:py-16">
      <ActivationForm />
    </div>
  )
}
