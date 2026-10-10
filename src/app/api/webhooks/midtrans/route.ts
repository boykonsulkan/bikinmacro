import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notificationOutcome, verifyNotificationSignature } from '@/lib/midtrans/notification'

// Notifikasi pembayaran dari Midtrans (alur Snap dan Payment Link).
// Atur URL ini di dashboard Midtrans: Settings > Configuration > Payment Notification URL.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { order_id, gross_amount, transaction_status, fraud_status, custom_field1 } = body

    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() || ''
    if (!serverKey) {
      console.error('Midtrans webhook: MIDTRANS_SERVER_KEY belum diisi, notifikasi ditolak.')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    // Tanda tangan WAJIB valid. Tanpa ini siapa pun bisa memalsukan pembayaran.
    if (!verifyNotificationSignature(body, serverKey)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const outcome = notificationOutcome(transaction_status, fraud_status)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    if (outcome === 'failed') {
      // Pembayaran gagal, kadaluarsa, atau dibatalkan: tandai kalau masih pending.
      await supabase.from('payments').update({ status: 'failed' }).eq('midtrans_id', order_id).eq('status', 'pending')
      return NextResponse.json({ success: true })
    }
    if (outcome !== 'paid') return NextResponse.json({ success: true })

    // 1. Cari pembayaran berdasarkan order_id (alur checkout lewat API).
    const { data: payment } = await supabase
      .from('payments')
      .select('user_id, plan, status')
      .eq('midtrans_id', order_id)
      .maybeSingle()

    // Midtrans bisa mengirim notifikasi yang sama lebih dari sekali. Jangan tambah kredit dua kali.
    if (payment?.status === 'success') return NextResponse.json({ success: true, duplicate: true })

    const userId = payment?.user_id || custom_field1
    let plan = payment?.plan

    // 2. Kalau belum ada di DB (alur link statis), tebak paket dari nominal.
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
        let newPlan: string | undefined = plan
        let resetAt: string | undefined = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        if (plan === 'addon') {
          newLimit += 5
          newPlan = undefined
          resetAt = undefined
        } else {
          const { data: planSettings } = await supabase.from('plan_settings').select('credits_limit').eq('plan', plan).single()
          if (planSettings) newLimit = planSettings.credits_limit
        }

        const updateData: Record<string, unknown> = { credits_limit: newLimit }
        if (newPlan) updateData.plan = newPlan
        if (resetAt) updateData.reset_at = resetAt

        // Tandai sukses dulu (hanya kalau belum sukses). Kalau nggak ada baris yang berubah,
        // notifikasi lain sudah memprosesnya, jadi berhenti supaya kredit nggak dobel.
        if (payment) {
          const { data: claimed } = await supabase
            .from('payments')
            .update({ status: 'success' })
            .eq('midtrans_id', order_id)
            .neq('status', 'success')
            .select('id')
          if (!claimed || claimed.length === 0) return NextResponse.json({ success: true, duplicate: true })
        } else {
          await supabase.from('payments').insert({
            user_id: userId,
            plan,
            amount: parseFloat(gross_amount),
            status: 'success',
            midtrans_id: order_id,
          })
        }

        await supabase.from('users').update(updateData).eq('id', userId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 })
  }
}
