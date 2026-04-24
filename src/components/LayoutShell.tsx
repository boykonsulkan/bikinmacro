'use client'

import { usePathname } from 'next/navigation'

export default function LayoutShell({
  children,
  navbar,
  footer,
}: {
  children: React.ReactNode
  navbar: React.ReactNode
  footer: React.ReactNode
}) {
  const pathname = usePathname()
  const isNorthRoute = pathname?.startsWith('/north')

  if (isNorthRoute) {
    return <div className="min-h-full flex flex-col">{children}</div>
  }

  return (
    <>
      {navbar}
      <main className="flex-1 flex flex-col">{children}</main>
      {footer}
    </>
  )
}
