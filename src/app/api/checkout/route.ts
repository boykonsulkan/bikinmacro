import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkKeys } from '@/lib/midtrans/keys'
import { serviceClient } from '@/lib/orders/server'
import { PLAN_RANK, PURCHASE_BLOCK_MESSAGE, purchaseState } from '@/lib/invites/rules'
const midtransClient = require('midtrans-client')

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json()

    // Cuma boleh upgrade: paket yang sama atau di bawah paket sekarang ditolak di server (tombol di /pricing
    // cuma tampilan). Admin dikecualikan supaya bisa menguji pembayaran.
    if (typeof plan === 'string' && (PLAN_RANK[plan] ?? 0) > 0) {
      const { data: current } = await supabase.from('users').select('plan, role').eq('id', user.id).single()
      const state = purchaseState(current?.plan, current?.role, plan)
      if (state !== 'available') {
        return NextResponse.json({ error: PURCHASE_BLOCK_MESSAGE[state] }, { status: 400 })
      }
    }

    // Fetch payment configuration
    const { data: adminSettings } = await supabase
      .from('admin_settings')
      .select('payment_provider, lynk_url_addon, lynk_url_starter, lynk_url_pro, xendit_url_addon, xendit_url_starter, xendit_url_pro')
      .eq('id', 1)
      .single()

    const provider = adminSettings?.payment_provider || 'midtrans'

    // Static payment link providers (Xendit & Lynk) — just return the URL
    if (provider === 'xendit' || provider === 'lynk.id') {
      const urls = provider === 'xendit'
        ? { addon: (adminSettings as any)?.xendit_url_addon, starter: (adminSettings as any)?.xendit_url_starter, pro: (adminSettings as any)?.xendit_url_pro }
        : { addon: adminSettings?.lynk_url_addon, starter: adminSettings?.lynk_url_starter, pro: adminSettings?.lynk_url_pro }

      const redirect_url = urls[plan as 'addon' | 'starter' | 'pro'] || ''
      if (!redirect_url) {
        return NextResponse.json({ error: `URL pembayaran untuk paket ${plan} belum dikonfigurasi admin.` }, { status: 500 })
      }

      return NextResponse.json({ redirect_url, provider })
    }
    
    // Determine price for Midtrans
    let amount = 0
    let planLabel = ''
    if (plan === 'addon') {
      amount = 25000
      planLabel = 'Macro Addon (5 Pack)'
    } else if (plan === 'starter') {
      amount = 79000
      planLabel = 'Starter Plan (Monthly)'
    } else if (plan === 'pro') {
      amount = 149000
      planLabel = 'Pro Plan (Monthly)'
    } else {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim()
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim()

    // Mode (sandbox atau produksi) ditentukan dari awalan key, dan harus satu lingkungan.
    const keyCheck = checkKeys(serverKey, clientKey)
    if (!keyCheck.ok) {
      console.error('Midtrans key check failed:', keyCheck.error)
      return NextResponse.json({ error: 'Konfigurasi pembayaran belum lengkap. Hubungi admin.' }, { status: 500 })
    }

    const snap = new midtransClient.Snap({
      isProduction: keyCheck.production,
      serverKey: serverKey,
      clientKey: clientKey
    })

    const orderId = `BM-${user.id.slice(0, 8)}-${Date.now()}`

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      item_details: [{
        id: plan,
        price: amount,
        quantity: 1,
        name: planLabel
      }],
      customer_details: {
        first_name: user.email?.split('@')[0],
        email: user.email
      },
      // Expiry 30 minutes
      expiry: {
        duration: 30,
        unit: 'minutes'
      }
    }

    const transaction = await snap.createTransaction(parameter)

    // Save pending payment to DB
    await serviceClient().from('payments').insert({
      user_id: user.id,
      plan: plan,
      amount: amount,
      status: 'pending',
      midtrans_id: orderId
    })

    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
      expiry: Date.now() + 30 * 60 * 1000 // 30 minutes from now
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Gagal membuat pembayaran. Coba lagi atau hubungi admin.' }, { status: 500 })
  }
}
