import type { Metadata } from 'next'
import OrderView from '@/components/pesan/OrderView'

export const metadata: Metadata = {
  title: 'Pesanan kamu | BikinMacro',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

// Halaman pesanan dirender di browser: token rahasia ada di bagian # URL,
// jadi server nggak pernah melihatnya dan nggak tercatat di log.
export default async function PesananPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <OrderView code={code.toUpperCase()} />
    </div>
  )
}
