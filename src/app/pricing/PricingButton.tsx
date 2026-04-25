'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface PricingButtonProps {
  plan: string
  label: string
  isLoggedIn: boolean
  className?: string
}

export default function PricingButton({ plan, label, isLoggedIn, className }: PricingButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      })

      const data = await res.json()
      
      if (data.error) {
        alert(data.error)
        return
      }

      // Dispatch custom event to PaymentManager
      window.dispatchEvent(new CustomEvent('start-payment', { 
        detail: {
          token: data.token,
          order_id: data.order_id,
          plan: plan,
          expiry: data.expiry
        }
      }))

    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat membuat pesanan.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : label}
    </button>
  )
}
