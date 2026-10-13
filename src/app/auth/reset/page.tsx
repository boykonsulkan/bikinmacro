import type { Metadata } from 'next'
import ResetForm from './ResetForm'

export const metadata: Metadata = {
  title: 'Atur ulang password | BikinMacro',
  robots: { index: false, follow: false },
  // Jangan kirim alamat halaman (yang memuat token di #) sebagai referrer ke situs lain.
  referrer: 'no-referrer',
}

export default function ResetPage() {
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mt-20 mx-auto">
      <ResetForm />
    </div>
  )
}
