'use client'

import { usePathname } from 'next/navigation'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

// Aturan tema:
// - Default selalu terang. Tema sistem (OS) nggak dipakai, supaya nggak tiba-tiba gelap.
// - storageKey baru: preferensi gelap lama dari versi sebelumnya (kunci 'theme') nggak ikut terbawa,
//   jadi semua orang mulai dari terang dan toggle di menu profil tetap bisa dipakai.
// - Tamu (belum login) dipaksa terang lewat `forcedTheme`: mereka nggak punya tombol tema.
// - Area admin (/north) dibuat untuk tampilan terang, jadi selalu terang.
export function ThemeProvider({
  children,
  forcedTheme,
}: {
  children: React.ReactNode
  forcedTheme?: 'light' | 'dark'
}) {
  const pathname = usePathname()
  const forced = forcedTheme ?? (pathname?.startsWith('/north') ? 'light' : undefined)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="bm-theme"
      forcedTheme={forced}
    >
      {children}
    </NextThemesProvider>
  )
}
