import Link from 'next/link'
import { Check, X } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-12">
      <div className="text-center mb-16 mt-8">
        <h1 className="text-4xl font-extrabold text-foreground mb-4">Pilih paket kamu</h1>
        <p className="text-lg text-muted">Upgrade untuk AI premium dan fitur lebih lengkap.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Addon Pack */}
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col">
          <h3 className="text-xl font-bold text-foreground mb-2">Macro Addon</h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-extrabold text-foreground">Rp 25.000</span>
          </div>
          <p className="text-sm text-muted mb-8">Sekali pakai</p>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> Standard AI model
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> 5 macro (sekali pakai)
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> 5 refinement chats
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> Tidak ada expiry
            </li>
            <li className="flex items-start gap-3 text-sm text-muted">
              <X size={18} className="text-muted/50 shrink-0 mt-0.5" /> No history
            </li>
          </ul>

          <Link 
            href={process.env.NEXT_PUBLIC_MIDTRANS_LINK_ADDON || "#"} 
            target="_blank"
            className="w-full bg-card hover:bg-border text-foreground border border-border py-3 rounded-xl font-medium transition-colors text-center"
          >
            Beli Sekarang
          </Link>
        </div>

        {/* Starter */}
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col relative">
          <h3 className="text-xl font-bold text-foreground mb-2">Starter</h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-extrabold text-foreground">Rp 79.000</span>
            <span className="text-muted text-sm">/bulan</span>
          </div>
          <p className="text-sm text-muted mb-8">Buat yang mulai sering.</p>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> Premium AI model
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> 20 macro / bulan
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> 10 refinement chats
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> History ✓
            </li>
            <li className="flex items-start gap-3 text-sm text-muted">
              <X size={18} className="text-muted/50 shrink-0 mt-0.5" /> No templates
            </li>
          </ul>

          <Link 
            href={process.env.NEXT_PUBLIC_MIDTRANS_LINK_STARTER || "#"} 
            target="_blank"
            className="w-full bg-card hover:bg-border text-foreground border border-border py-3 rounded-xl font-medium transition-colors text-center"
          >
            Pilih Starter
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col relative shadow-lg shadow-primary/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <span>✨</span> Paling Worth
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-2">Pro</h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-extrabold text-foreground">Rp 149.000</span>
            <span className="text-muted text-sm">/bulan</span>
          </div>
          <p className="text-sm text-muted mb-8">Unlimited, semua akses.</p>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> Premium AI model
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> Unlimited macro
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> Unlimited refinements
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> History ✓
            </li>
            <li className="flex items-start gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" /> Templates ✓
            </li>
          </ul>

          <Link 
            href={process.env.NEXT_PUBLIC_MIDTRANS_LINK_PRO || "#"} 
            target="_blank"
            className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-medium transition-colors text-center shadow-lg shadow-primary/20"
          >
            Pilih Pro
          </Link>
        </div>
      </div>

      <p className="text-center text-muted text-sm mt-12">
        Semua harga dalam Rupiah. Pembayaran diproses dengan aman via Midtrans.
      </p>
    </div>
  )
}
