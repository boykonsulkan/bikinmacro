import type { Metadata } from "next";
import { Geist_Mono, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LayoutShell from "@/components/LayoutShell";
import "./globals.css";

// Font mengikuti Pelajarin: Jakarta untuk UI, Geist Mono untuk kode dan nama file,
// Playfair khusus headline hero.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const SITE_TITLE = "BikinMacro: File Excel otomatis, sekali klik";
const SITE_DESCRIPTION =
  "Ceritain kerjaan Excel kamu, upload contoh file, dapat file .xlsm yang langsung jalan dengan tombol Jalankan. Buat tim finance, admin, dan accounting.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bikinmacro.my.id"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "BikinMacro",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";
import PaymentManager from "@/components/PaymentManager";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const midtransUrl = process.env.NEXT_PUBLIC_MIDTRANS_MODE === 'production'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <Script 
          src={midtransUrl} 
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="beforeInteractive"
        />
        <ThemeProvider>
          <PaymentManager />
          <LayoutShell navbar={<Navbar />} footer={<Footer />}>
            {children}
          </LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
