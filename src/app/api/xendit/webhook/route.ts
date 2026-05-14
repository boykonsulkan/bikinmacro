import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const callbackToken = req.headers.get('x-callback-token')
    const expectedToken = process.env.XENDIT_CALLBACK_TOKEN

    if (expectedToken && callbackToken !== expectedToken) {
      console.error('Invalid Xendit callback token')
      return NextResponse.json({ error: 'Invalid callback token' }, { status: 401 })
    }

    const body = await req.json()

    // Only process paid invoices
    if (body.status !== 'PAID') {
      return NextResponse.json({ received: true })
    }

    const externalId: string = body.external_id || body.id || ''

    // Ignore payments not originating from BikinMacro (prefix BM-)
    if (!externalId.startsWith('BM-')) {
      return NextResponse.json({ received: true })
    }

    const paidAmount: number = body.paid_amount || body.amount || 0
    const customerEmail: string = body.payer_email || body.customer?.email || ''

    let plan = 'unknown'
    if (paidAmount === 25000) plan = 'addon'
    else if (paidAmount === 79000) plan = 'starter'
    else if (paidAmount === 149000) plan = 'pro'

    if (!customerEmail || plan === 'unknown') {
      console.warn('Xendit webhook: could not determine plan or email', { paidAmount, customerEmail })
      return NextResponse.json({ received: true })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user } = await supabase
      .from('users')
      .select('id, credits_limit')
      .eq('email', customerEmail)
      .single()

    if (!user) {
      console.warn(`Xendit webhook: user not found for email ${customerEmail}`)
      return NextResponse.json({ received: true })
    }

    // Prevent duplicate processing
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('midtrans_id', externalId)
      .single()

    if (existingPayment) {
      return NextResponse.json({ received: true })
    }

    let newLimit = user.credits_limit
    let newPlan: string | undefined = plan
    let resetAt: string | undefined = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    if (plan === 'addon') {
      newLimit += 5
      newPlan = undefined
      resetAt = undefined
    } else {
      const { data: planSettings } = await supabase
        .from('plan_settings')
        .select('credits_limit')
        .eq('plan', plan)
        .single()
      if (planSettings) newLimit = planSettings.credits_limit
    }

    const updateData: Record<string, unknown> = { credits_limit: newLimit }
    if (newPlan) updateData.plan = newPlan
    if (resetAt) updateData.reset_at = resetAt

    await supabase.from('users').update(updateData).eq('id', user.id)

    await supabase.from('payments').insert({
      user_id: user.id,
      plan,
      amount: paidAmount,
      status: 'success',
      midtrans_id: externalId
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Xendit webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
