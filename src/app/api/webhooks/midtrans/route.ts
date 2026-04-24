import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Midtrans notification signature key validation
    // signature_key = SHA512(order_id + status_code + gross_amount + server_key)
    const { order_id, status_code, gross_amount, signature_key, transaction_status, custom_field1 } = body

    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    
    // Hash validation
    const hash = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex')

    if (hash !== signature_key) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      // Payment successful
      // Assume custom_field1 contains user_id and plan e.g., "user_id|plan"
      // or we look up the order_id in our payments table
      
      const supabase = await createClient()

      // For this MVP, let's assume we can parse it from custom_field1
      if (custom_field1) {
        const [userId, plan] = custom_field1.split('|')
        
        let newLimit = 3
        let newPlan = plan

        if (plan === 'addon') newLimit = 5
        if (plan === 'starter') newLimit = 20
        if (plan === 'pro') newLimit = 9999

        await supabase.from('users').update({ 
          plan: newPlan,
          credits_limit: newLimit,
          reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }).eq('id', userId)

        await supabase.from('payments').insert({
          user_id: userId,
          plan: newPlan,
          amount: parseFloat(gross_amount),
          status: 'success',
          mayar_ref: order_id // using mayar_ref column for midtrans ref
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 })
  }
}
