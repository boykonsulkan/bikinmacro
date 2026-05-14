import { Check, X, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import PricingButton from './PricingButton'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const { data: adminSettings } = await supabase
    .from('admin_settings')
    .select('payment_provider')
    .eq('id', 1)
    .single()

  const isXendit = adminSettings?.payment_provider === 'xendit'

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

          <PricingButton 
            plan="addon"
            label={isLoggedIn ? 'Beli Sekarang' : 'Login untuk Membeli'}
            isLoggedIn={isLoggedIn}
            className="w-full bg-card hover:bg-border text-foreground border border-border py-3 rounded-xl font-medium transition-colors text-center"
          />
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

          <PricingButton 
            plan="starter"
            label={isLoggedIn ? 'Pilih Starter' : 'Login untuk Membeli'}
            isLoggedIn={isLoggedIn}
            className="w-full bg-card hover:bg-border text-foreground border border-border py-3 rounded-xl font-medium transition-colors text-center"
          />
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

          <PricingButton 
            plan="pro"
            label={isLoggedIn ? 'Pilih Pro' : 'Login untuk Membeli'}
            isLoggedIn={isLoggedIn}
            className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-medium transition-colors text-center shadow-lg shadow-primary/20"
          />
        </div>
      </div>

      <div className="mt-12 space-y-3 text-center">
        <p className="text-muted text-sm">Semua harga dalam Rupiah.</p>
        {isXendit ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <ShieldCheck size={14} className="shrink-0" />
            Pembayaran diproses oleh <strong className="mx-1">Xendit</strong> atas nama
            <strong className="mx-1">konsulkan.com</strong> — parent brand dari BikinMacro.
            Xendit terdaftar dan diawasi oleh Bank Indonesia.
          </div>
        ) : (
          <p className="text-muted text-xs">Pembayaran diproses dengan aman dan terenkripsi.</p>
        )}
      </div>
    </div>
  )
}
