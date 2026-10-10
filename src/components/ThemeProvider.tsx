'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

// `forcedTheme` dipakai untuk tamu (belum login): mereka nggak punya tombol tema,
// jadi preferensi gelap yang nyangkut di browser nggak boleh mengubah tampilan mereka.
export function ThemeProvider({
  children,
  forcedTheme,
}: {
  children: React.ReactNode
  forcedTheme?: 'light' | 'dark'
}) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  )
}
