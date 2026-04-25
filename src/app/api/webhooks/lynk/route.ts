import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-lynk-signature') || req.headers.get('X-Lynk-Signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const payload = await req.json()
    
    // Only process payment.received
    if (payload.event !== 'payment.received') {
      return NextResponse.json({ received: true })
    }

    const messageData = payload.data?.message_data
    if (!messageData) {
      return NextResponse.json({ error: 'Missing message_data' }, { status: 400 })
    }

    const refId = messageData.refId || ''
    const amount = messageData.totals?.grandTotal?.toString() || ''
    const message_id = payload.data?.message_id || ''
    
    // signatureString = amount + refId + message_id + secretKey
    const secretKey = process.env.LYNK_MERCHANT_KEY
    if (!secretKey) {
      console.error('LYNK_MERCHANT_KEY is missing in env')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const signatureString = amount + refId + message_id + secretKey
    const calculatedSignature = crypto
      .createHash('sha256')
      .update(signatureString)
      .digest('hex')

    if (calculatedSignature !== signature) {
      console.error('Invalid Lynk.id signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const customerEmail = messageData.customer?.email
    const totalPrice = messageData.totals?.totalPrice || 0
    
    let plan = 'unknown'
    if (totalPrice === 25000) plan = 'addon'
    else if (totalPrice === 79000) plan = 'starter'
    else if (totalPrice === 149000) plan = 'pro'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Match the user by email from Lynk.id
    if (customerEmail && plan !== 'unknown') {
      const { data: user } = await supabase
        .from('users')
        .select('id, credits_limit')
        .eq('email', customerEmail)
        .single()

      if (user) {
        let newLimit = user.credits_limit
        let newPlan = plan
        let resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        if (plan === 'addon') {
          newLimit += 5
          newPlan = undefined as any
          resetAt = undefined as any
        } else {
          const { data: planSettings } = await supabase
            .from('plan_settings')
            .select('credits_limit')
            .eq('plan', plan)
            .single()
            
          if (planSettings) {
            newLimit = planSettings.credits_limit
          }
        }

        const updateData: any = { credits_limit: newLimit }
        if (newPlan) updateData.plan = newPlan
        if (resetAt) updateData.reset_at = resetAt

        await supabase.from('users').update(updateData).eq('id', user.id)

        // Prevent duplicate payment entry by refId
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('midtrans_id', refId) // reusing midtrans_id for Lynk.id refId
          .single()

        if (!existingPayment) {
          await supabase.from('payments').insert({
            user_id: user.id,
            plan: plan,
            amount: totalPrice,
            status: 'success',
            midtrans_id: refId
          })
        }
      } else {
        console.warn(`User with email ${customerEmail} not found. Could not link Lynk.id payment.`)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Lynk webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
