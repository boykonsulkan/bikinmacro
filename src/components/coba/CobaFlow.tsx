'use client'

import { useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, Download, FileCode2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import Stepper from '@/components/konfirmasi/Stepper'
import {
  EXPECTED_KOMISI,
  GENERATE_STEPS,
  MODES,
  RESULT_BAS,
  RESULT_FILE,
  RESULT_FILE_NAME,
  SAMPLE_FILE,
  SAMPLE_FILE_NAME,
  STEP_LABELS,
  TIERS,
} from './data'
import { validateSample } from './validate'
import type { ValidateResult } from './validate'

type Check =
  | { status: 'idle' }
  | { status: 'reading'; name: string }
  | { status: 'ok'; name: string; rows: number }
  | { status: 'error'; name: string; message: string }

type Gen = 'idle' | 'running' | 'done'

const card = 'rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8'
const h2 = 'text-xl font-extrabold tracking-tight text-card-foreground sm:text-2xl'
const btnPrimary =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-action px-7 text-sm font-bold text-white shadow-glow transition hover:bg-action-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'
const btnOutline =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 text-sm font-bold text-foreground transition hover:border-foreground/30 active:scale-[0.98]'

const rupiah = (n: number) => n.toLocaleString('id-ID')

export default function CobaFlow() {
  const [downloaded, setDownloaded] = useState(false)
  const [check, setCheck] = useState<Check>({ status: 'idle' })
  const [gen, setGen] = useState<Gen>('idle')
  const [genStep, setGenStep] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Progress "generate": satu langkah tiap 650 ms.
  useEffect(() => {
    if (gen !== 'running') return
    const id = setTimeout(() => {
      if (genStep + 1 >= GENERATE_STEPS.length) setGen('done')
      setGenStep((s) => s + 1)
    }, 650)
    return () => clearTimeout(id)
  }, [gen, genStep])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setGen('idle')
    setGenStep(0)
    setCheck({ status: 'reading', name: file.name })
    const result: ValidateResult = await validateSample(file)
    setCheck(
      result.ok
        ? { status: 'ok', name: file.name, rows: result.rows }
        : { status: 'error', name: file.name, message: result.message },
    )
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(false)
    void handleFile(e.dataTransfer.files?.[0])
  }

  const current = gen === 'done' || check.status === 'ok' ? 3 : downloaded ? 2 : 1

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-semibold tracking-wide text-accent-ink">Coba gratis</p>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
        Coba satu macro, langsung jalan di Excel kamu.
      </h1>
      <p className="mt-4 text-base font-medium leading-relaxed text-muted">
        Download file contoh, upload ke sini, lalu ambil file Excel yang sudah berisi macro. Demo ini selalu memakai
        file contoh yang sama dan file hasilnya sudah disiapkan, jadi hasilnya selalu sama dan bisa kamu cek sendiri.
        Nggak perlu daftar.
      </p>

      <div className="mt-8">
        <Stepper current={current} steps={STEP_LABELS} />
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {/* 1. Download contoh */}
        <section className={card} aria-labelledby="coba-1">
          <h2 id="coba-1" className={h2}>1. Download file contoh</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
            Isinya rekap penjualan 5 Sales (data fiktif) dan satu sheet aturan komisi. Aturannya:
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Aturan komisi di file contoh</caption>
              <thead className="bg-excel-head text-xs font-semibold text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2">Total penjualan per Sales</th>
                  <th scope="col" className="px-4 py-2 text-right">Komisi</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.range} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium text-card-foreground">{t.range}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-card-foreground">{t.persen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs font-medium text-muted">
            Persen berlaku untuk seluruh total penjualan Sales itu, bukan per bagian.
          </p>

          <a href={SAMPLE_FILE} download onClick={() => setDownloaded(true)} className={`${btnOutline} mt-5`}>
            <FileSpreadsheet size={18} strokeWidth={1.5} aria-hidden="true" />
            Download {SAMPLE_FILE_NAME}
          </a>
        </section>

        {/* 2. Upload */}
        <section className={card} aria-labelledby="coba-2">
          <h2 id="coba-2" className={h2}>2. Upload file contoh</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
            File dicek langsung di browser kamu dan nggak dikirim ke mana mana.
          </p>

          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
              dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-foreground/30'
            }`}
          >
            <Upload size={24} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
            <span className="text-sm font-bold text-card-foreground">Pilih file atau tarik ke sini</span>
            <span className="text-xs font-medium text-muted">Format .xlsx</span>
            <input
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>

          <div aria-live="polite" className="mt-4">
            {check.status === 'reading' && (
              <p className="flex items-center gap-2 text-sm font-semibold text-muted">
                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Mengecek {check.name}
              </p>
            )}
            {check.status === 'ok' && (
              <p className="flex items-start gap-2 text-sm font-semibold text-card-foreground">
                <Check size={18} strokeWidth={3} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
                <span>
                  <span className="font-mono">{check.name}</span> cocok. {check.rows} baris penjualan dan aturan komisi
                  ketemu.
                </span>
              </p>
            )}
            {check.status === 'error' && (
              <p className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-bg p-3 text-sm font-semibold text-warning-ink">
                <AlertCircle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{check.message}</span>
              </p>
            )}
          </div>
        </section>

        {/* 3. Bikin file dan download */}
        <section className={card} aria-labelledby="coba-3">
          <h2 id="coba-3" className={h2}>3. Bikin file Excel-nya</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
            Hasilnya file .xlsm berisi sheet Mulai, Hasil, Opsi, dan Petunjuk, lengkap dengan macro dan tombol Jalankan.
          </p>

          {gen === 'idle' && (
            <button
              type="button"
              disabled={check.status !== 'ok'}
              onClick={() => {
                setGenStep(0)
                setGen('running')
              }}
              className={`${btnPrimary} mt-5`}
            >
              Bikin file
            </button>
          )}
          {gen === 'idle' && check.status !== 'ok' && (
            <p className="mt-2 text-xs font-medium text-muted">Upload file contoh dulu.</p>
          )}

          {gen !== 'idle' && (
            <ol className="mt-5 flex flex-col gap-2" aria-live="polite">
              {GENERATE_STEPS.map((label, i) => {
                const done = i < genStep
                const active = i === genStep && gen === 'running'
                return (
                  <li
                    key={label}
                    className={`flex items-center gap-2.5 text-sm font-semibold ${
                      done || active ? 'text-card-foreground' : 'text-muted'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        done ? 'bg-action text-white' : 'border border-border'
                      }`}
                    >
                      {done ? (
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                      ) : active ? (
                        <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      ) : null}
                    </span>
                    {label}
                  </li>
                )
              })}
            </ol>
          )}

          {gen === 'done' && (
            <div className="mt-6 flex flex-col gap-6">
              <div className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-accent-ink">File kamu sudah jadi</p>
                  <p className="mt-1 truncate font-mono text-sm font-bold text-card-foreground">{RESULT_FILE_NAME}</p>
                </div>
                <a href={RESULT_FILE} download className={btnPrimary}>
                  <Download size={18} aria-hidden="true" />
                  Download .xlsm
                </a>
              </div>

              <div>
                <h3 className="text-base font-bold text-card-foreground">Cara coba</h3>
                <ol className="mt-3 flex flex-col gap-2 text-sm font-medium leading-relaxed text-card-foreground">
                  <li>1. Buka file .xlsm. Kalau muncul bar merah &quot;macro diblokir&quot;, ikuti langkah di bawah dulu.</li>
                  <li>2. Di sheet Mulai, pilih Mode proses dari daftar. Pilihannya ada di sheet Opsi.</li>
                  <li>3. Klik Jalankan, lalu pilih {SAMPLE_FILE_NAME} di pop up yang muncul.</li>
                  <li>4. Lihat hasilnya di sheet Hasil.</li>
                </ol>
                <ul className="mt-4 flex flex-col gap-2">
                  {MODES.map((m) => (
                    <li key={m.name} className="rounded-lg bg-surface p-3 text-sm">
                      <span className="font-bold text-card-foreground">{m.name}.</span>{' '}
                      <span className="font-medium text-muted">{m.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-base font-bold text-card-foreground">Hasil yang harus kamu dapat</h3>
                <p className="mt-1 text-sm font-medium text-muted">
                  Kalau memilih mode Hitung komisi per Sales, sheet Hasil akan berisi ini. Selalu sama.
                </p>
                <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[34rem] text-left text-sm">
                    <caption className="sr-only">Hasil komisi per Sales untuk file contoh</caption>
                    <thead className="bg-excel-head text-xs font-semibold text-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2">Sales</th>
                        <th scope="col" className="px-3 py-2">Region</th>
                        <th scope="col" className="px-3 py-2 text-right">Transaksi</th>
                        <th scope="col" className="px-3 py-2 text-right">Total penjualan</th>
                        <th scope="col" className="px-3 py-2 text-right">Komisi</th>
                        <th scope="col" className="px-3 py-2 text-right">Komisi (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EXPECTED_KOMISI.map((r) => (
                        <tr key={r.sales} className="border-t border-border">
                          <th scope="row" className="px-3 py-2 font-bold text-card-foreground">{r.sales}</th>
                          <td className="px-3 py-2 text-card-foreground">{r.region}</td>
                          <td className="px-3 py-2 text-right text-card-foreground">{r.transaksi}</td>
                          <td className="px-3 py-2 text-right font-mono text-card-foreground">{rupiah(r.total)}</td>
                          <td className="px-3 py-2 text-right text-card-foreground">{r.persen}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-card-foreground">{rupiah(r.komisi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-warning-border bg-warning-bg p-5 text-warning-ink">
                <h3 className="text-base font-extrabold">Muncul bar merah &quot;macro diblokir&quot;? Itu normal.</h3>
                <ol className="mt-3 flex flex-col gap-1.5 text-sm font-semibold">
                  <li>1. Tutup file Excel-nya.</li>
                  <li>2. Klik kanan file, pilih Properties.</li>
                  <li>3. Centang Unblock di bagian bawah, lalu klik OK.</li>
                  <li>4. Buka lagi file-nya, lalu klik Enable Content.</li>
                </ol>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <a href={RESULT_BAS} download className="inline-flex items-center gap-2 text-sm font-bold text-accent-ink hover:underline">
                  <FileCode2 size={18} strokeWidth={1.5} aria-hidden="true" />
                  Bonus: download kode VBA (.bas)
                </a>
                <Link href="/auth/register" className={btnOutline}>
                  Bikin macro buat kerjaan kamu
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
