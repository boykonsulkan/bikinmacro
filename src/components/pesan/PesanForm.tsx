'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, Copy, Loader2 } from 'lucide-react'
import { ORDER_LIMITS, PLANS, PLAN_KEYS } from '@/lib/orders/config'
import type { PlanKey } from '@/lib/orders/config'
import { saveOrderToken } from './format'

type Created = { code: string; token: string }
type FieldErrors = Partial<Record<'email' | 'plan' | 'midtransOrderId' | 'description' | 'file', string>>

const input =
  'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground placeholder:text-muted/70'
const label = 'text-sm font-bold text-foreground'
const hint = 'text-xs font-medium text-muted'
const err = 'text-xs font-semibold text-danger'

export default function PesanForm({ defaultPlan }: { defaultPlan?: PlanKey }) {
  const [plan, setPlan] = useState<PlanKey | ''>(defaultPlan ?? '')
  const [description, setDescription] = useState('')
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState<Created | null>(null)
  const [copied, setCopied] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      const res = await fetch('/api/orders', { method: 'POST', body: new FormData(e.currentTarget) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        saveOrderToken(data.code, data.token)
        setCreated({ code: data.code, token: data.token })
      } else {
        setErrors(data.fieldErrors ?? {})
        setFormError(data.error ?? 'Pesanan belum terkirim. Coba lagi.')
      }
    } catch {
      setFormError('Koneksi bermasalah. Coba kirim lagi.')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    const link = `${window.location.origin}/pesanan/${created.code}#${created.token}`
    return (
      <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-soft sm:p-8" role="status">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-accent-ink">
          <Check size={16} strokeWidth={3} aria-hidden="true" />
          Pesanan terkirim
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-card-foreground">
          Kode pesanan kamu: <span className="font-mono">{created.code}</span>
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-muted">
          Kami cek pembayarannya dulu, lalu kerjaan kamu mulai dibikin. Pantau status dan chat revisi lewat link di
          bawah.
        </p>

        <div className="mt-5 rounded-xl border border-warning-border bg-warning-bg p-4 text-warning-ink">
          <p className="text-sm font-bold">Simpan link ini sekarang. Cuma muncul sekali.</p>
          <p className="mt-1 text-xs font-medium">
            Siapa pun yang punya link ini bisa membuka pesanan kamu, jadi jangan dibagikan. Link juga disimpan di
            browser ini.
          </p>
          <p className="mt-3 break-all rounded-lg bg-card/70 p-3 font-mono text-xs font-semibold">{link}</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(link).then(() => setCopied(true))
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-warning-border bg-card px-3 py-2 text-xs font-bold text-card-foreground"
          >
            <Copy size={14} aria-hidden="true" />
            {copied ? 'Link tersalin' : 'Salin link'}
          </button>
        </div>

        <Link
          href={`/pesanan/${created.code}#${created.token}`}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-action px-7 text-sm font-bold text-white shadow-glow transition hover:bg-action-hover active:scale-[0.98]"
        >
          Buka halaman pesanan
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input}
          placeholder="nama@perusahaan.com" aria-invalid={!!errors.email} aria-describedby="email-hint" />
        <p id="email-hint" className={errors.email ? err : hint}>
          {errors.email ?? 'Pakai email yang sama dengan saat bayar di Midtrans.'}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={label}>Paket yang kamu beli</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {PLAN_KEYS.map((k) => (
            <label
              key={k}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
                plan === k ? 'border-action bg-action/5' : 'border-border hover:border-foreground/30'
              }`}
            >
              <input type="radio" name="plan" value={k} checked={plan === k} onChange={() => setPlan(k)} className="sr-only" />
              <span className="font-bold text-card-foreground">{PLANS[k].label}</span>
              <span className="text-xs font-medium text-muted">
                {PLANS[k].price ? `Rp${PLANS[k].price.toLocaleString('id-ID')}` : 'Harga sesuai kesepakatan'}
              </span>
            </label>
          ))}
        </div>
        {errors.plan && <p className={err}>{errors.plan}</p>}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="midtransOrderId" className={label}>Nomor order Midtrans</label>
        <input id="midtransOrderId" name="midtransOrderId" required className={`${input} font-mono`}
          placeholder="Contoh: ORDER-12345" autoComplete="off" aria-invalid={!!errors.midtransOrderId} aria-describedby="order-hint" />
        <p id="order-hint" className={errors.midtransOrderId ? err : hint}>
          {errors.midtransOrderId ?? 'Ada di halaman sukses dan di email struk dari Midtrans. Kami pakai ini buat cek pembayaran.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className={label}>Ceritain kerjaan kamu</label>
        <textarea id="description" name="description" required rows={6} className={`${input} resize-y`}
          value={description} onChange={(e) => setDescription(e.target.value)} maxLength={ORDER_LIMITS.description.max + 200}
          placeholder="Contoh: Tiap bulan saya dapat 20 file penjualan dari cabang, formatnya sama. Saya mau semuanya digabung ke satu sheet dan dihitung komisi tiap sales sesuai aturan di file kedua."
          aria-invalid={!!errors.description} aria-describedby="desc-hint" />
        <p id="desc-hint" className={errors.description ? err : hint}>
          {errors.description ?? `Yang kamu mau macro-nya lakuin, hasil yang kamu harapkan, dan aturan khususnya. ${description.trim().length}/${ORDER_LIMITS.description.max}`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="file" className={label}>Contoh file kamu (.xlsx)</label>
        <input id="file" name="file" type="file" accept=".xlsx" required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          className="block w-full text-sm font-medium text-card-foreground file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-card file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-foreground"
          aria-invalid={!!errors.file} aria-describedby="file-hint" />
        <p id="file-hint" className={errors.file ? err : hint}>
          {errors.file ?? (fileName ? `Dipilih: ${fileName}` : `Maksimal ${Math.round(ORDER_LIMITS.sampleFileMaxBytes / 1024 / 1024)} MB. Hapus atau samarkan data sensitif, struktur sheet dan header kolom aja sudah cukup.`)}
        </p>
      </div>

      {/* Honeypot: disembunyikan dari manusia dan screen reader. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Kontak tambahan
          <input name="kontak_tambahan" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-bg p-3 text-sm font-semibold text-warning-ink">
          <AlertCircle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-action px-7 text-sm font-bold text-white shadow-glow transition hover:bg-action-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {busy ? 'Mengirim...' : 'Kirim pesanan'}
      </button>
    </form>
  )
}
