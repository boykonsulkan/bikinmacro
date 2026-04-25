import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
const midtransClient = require('midtrans-client')

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json()
    
    // Determine price
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

    const snap = new midtransClient.Snap({
      isProduction: process.env.NEXT_PUBLIC_MIDTRANS_MODE === 'production',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
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
      },
      usage_limit: 1
    }

    const transaction = await snap.createTransaction(parameter)

    // Save pending payment to DB
    await supabase.from('payments').insert({
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
