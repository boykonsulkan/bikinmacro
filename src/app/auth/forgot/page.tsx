import type { Metadata } from 'next'
import ForgotForm from './ForgotForm'

export const metadata: Metadata = {
  title: 'Lupa password | BikinMacro',
  robots: { index: false, follow: false },
}

export default function ForgotPage() {
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mt-20 mx-auto">
      <ForgotForm />
    </div>
  )
}
