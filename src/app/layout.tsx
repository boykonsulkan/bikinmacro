import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LayoutShell from "@/components/LayoutShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BikinMacro | Excel VBA AI Generator",
  description: "Dari kalimat jadi macro. Tanpa coding.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
    ],
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
      className={`${inter.variable} h-full antialiased`}
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
