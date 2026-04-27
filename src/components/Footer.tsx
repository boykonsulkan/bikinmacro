import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="w-full max-w-6xl mx-auto px-3 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <Link href="/" className="font-bold text-xl text-primary tracking-tight">
          BikinMacro
        </Link>

        <div className="flex items-center gap-6 text-muted">
          <Link href="/feedback" className="hover:text-foreground transition-colors font-medium">
            Kirim Masukan
          </Link>
          <Link href="/help" className="hover:text-foreground transition-colors font-medium">
            Bantuan
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors font-medium">
            Harga
          </Link>
        </div>

        <p className="text-muted text-xs">
          &copy; {new Date().getFullYear()} BikinMacro
        </p>
      </div>
    </footer>
  );
}
