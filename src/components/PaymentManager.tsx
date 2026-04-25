'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertCircle, CheckCircle2, XCircle, ArrowRight, Loader2, X } from 'lucide-react'

declare global {
  interface Window {
    snap: any
  }
}

interface ActivePayment {
  token: string
  order_id: string
  plan: string
  expiry: number
}

export default function PaymentManager() {
  const router = useRouter()
  const [activePayment, setActivePayment] = useState<ActivePayment | null>(null)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle')
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isChecking, setIsChecking] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('active_payment')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.expiry > Date.now()) {
        setActivePayment(parsed)
      } else {
        localStorage.removeItem('active_payment')
      }
    }

    // Listen for custom event to start new payment
    const handleStartPayment = (e: any) => {
      const data = e.detail
      setActivePayment(data)
      localStorage.setItem('active_payment', JSON.stringify(data))
      openSnap(data.token)
    }

    window.addEventListener('start-payment', handleStartPayment)
    return () => window.removeEventListener('start-payment', handleStartPayment)
  }, [])

  // Timer logic
  useEffect(() => {
    if (!activePayment) return

    const tick = () => {
      const remaining = Math.max(0, Math.floor((activePayment.expiry - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        setStatus('error')
        setActivePayment(null)
        localStorage.removeItem('active_payment')
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activePayment])

  const openSnap = (token: string) => {
    if (!window.snap) return

    window.snap.pay(token, {
      onSuccess: (result: any) => {
        console.log('success', result)
        checkPaymentStatus(activePayment?.order_id || result.order_id)
      },
      onPending: (result: any) => {
        console.log('pending', result)
        setShowFollowUp(true)
      },
      onError: (result: any) => {
        console.log('error', result)
        setStatus('error')
        setActivePayment(null)
        localStorage.removeItem('active_payment')
      },
      onClose: () => {
        console.log('customer closed the popup without finishing the payment')
        setShowFollowUp(true)
      }
    })
  }

  const checkPaymentStatus = async (orderId: string) => {
    setIsChecking(true)
    try {
      const res = await fetch(`/api/payments/status?order_id=${orderId}`)
      const data = await res.json()
      if (data.status === 'success') {
        setStatus('success')
        setActivePayment(null)
        localStorage.removeItem('active_payment')
        router.refresh()
      } else {
        setShowFollowUp(true)
      }
    } catch (err) {
      setShowFollowUp(true)
    } finally {
      setIsChecking(false)
    }
  }

  const cancelPayment = () => {
    setActivePayment(null)
    localStorage.removeItem('active_payment')
    setShowFollowUp(false)
    setStatus('idle')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h2>
          <p className="text-gray-500 mb-8">Selamat! Akun Anda telah di-upgrade. Silakan nikmati fitur premium sekarang.</p>
          <button 
            onClick={() => { setStatus('idle'); router.push('/generate') }}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            Mulai Sekarang <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
            <XCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Gagal</h2>
          <p className="text-gray-500 mb-8">Maaf, terjadi kesalahan atau waktu pembayaran habis. Silakan coba lagi.</p>
          <button 
            onClick={() => setStatus('idle')}
            className="w-full bg-gray-100 text-gray-900 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Countdown Bar */}
      {activePayment && !showFollowUp && (
        <div className="sticky top-0 z-[50] w-full bg-black text-white px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Selesaikan pembayaran <strong>Paket {activePayment.plan}</strong></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono bg-white/10 px-2 py-1 rounded">
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
            <button 
              onClick={() => openSnap(activePayment.token)}
              className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-200 transition-all"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowUp && activePayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <AlertCircle size={24} />
              </div>
              <button onClick={() => setShowFollowUp(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Pembayaran Belum Selesai</h3>
            <p className="text-gray-500 text-sm mb-6">
              Anda menutup jendela pembayaran. Ingin melanjutkan pembayaran atau membatalkan pesanan ini?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={cancelPayment}
                className="w-full py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm border border-gray-100"
              >
                Batalkan
              </button>
              <button 
                onClick={() => { setShowFollowUp(false); openSnap(activePayment.token) }}
                className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all text-sm flex items-center justify-center gap-2"
              >
                {isChecking ? <Loader2 className="animate-spin" size={16} /> : 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
