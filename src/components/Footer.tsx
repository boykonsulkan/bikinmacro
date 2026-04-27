import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border py-12 px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground bg-card/30">
      <div className="flex flex-col items-center md:items-start gap-1">
        <p className="font-semibold text-foreground">BikinMacro</p>
        <p className="text-xs">Dari kalimat jadi macro. Tanpa coding.</p>
      </div>
      
      <div className="flex items-center gap-8">
        <Link href="/feedback" className="hover:text-primary transition-colors">
          Kirim Masukan
        </Link>
        <Link href="/help" className="hover:text-primary transition-colors">
          Bantuan
        </Link>
        <Link href="/pricing" className="hover:text-primary transition-colors">
          Harga
        </Link>
      </div>

      <p className="text-xs">
        &copy; {new Date().getFullYear()} BikinMacro. All rights reserved.
      </p>
    </footer>
  );
}
