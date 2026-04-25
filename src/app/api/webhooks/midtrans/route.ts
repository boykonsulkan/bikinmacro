import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { order_id, status_code, gross_amount, signature_key, transaction_status, custom_field1 } = body
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    
    const hash = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex')

    if (serverKey && hash !== signature_key) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // 1. Try to find the payment by order_id (direct API flow)
      let { data: payment } = await supabase
        .from('payments')
        .select('user_id, plan')
        .eq('midtrans_id', order_id)
        .single()

      let userId = payment?.user_id || custom_field1
      let plan = payment?.plan

      // 2. If no plan in DB (static link flow fallback), determine by amount
      if (!plan) {
        const amount = parseFloat(gross_amount)
        if (amount === 25000) plan = 'addon'
        else if (amount === 79000) plan = 'starter'
        else if (amount === 149000) plan = 'pro'
        else plan = 'unknown'
      }

      if (userId && plan && plan !== 'unknown') {
        const { data: user } = await supabase.from('users').select('credits_limit').eq('id', userId).single()
        
        if (user) {
          let newLimit = user.credits_limit
          let newPlan = plan
          let resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

          if (plan === 'addon') {
            newLimit += 5
            newPlan = undefined as any
            resetAt = undefined as any
          } else {
            const { data: planSettings } = await supabase.from('plan_settings').select('credits_limit').eq('plan', plan).single()
            if (planSettings) {
              newLimit = planSettings.credits_limit
            }
          }

          const updateData: any = { credits_limit: newLimit }
          if (newPlan) updateData.plan = newPlan
          if (resetAt) updateData.reset_at = resetAt

          await supabase.from('users').update(updateData).eq('id', userId)

          // Update existing payment or insert new one
          if (payment) {
            await supabase.from('payments').update({ status: 'success' }).eq('midtrans_id', order_id)
          } else {
            await supabase.from('payments').insert({
              user_id: userId,
              plan: plan,
              amount: parseFloat(gross_amount),
              status: 'success',
              midtrans_id: order_id
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 })
  }
}
