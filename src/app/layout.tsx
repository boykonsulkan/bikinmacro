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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LayoutShell navbar={<Navbar />} footer={<Footer />}>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
