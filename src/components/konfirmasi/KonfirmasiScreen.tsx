'use client'

import { useState } from 'react'
import { FileSpreadsheet, Info, Pencil } from 'lucide-react'
import Stepper from './Stepper'
import type { KonfirmasiConfirmPayload, KonfirmasiPlan } from './types'

type Props = {
  plan: KonfirmasiPlan
  /** True kalau `plan` data dummy: tampilkan penanda. */
  isDummy?: boolean
  // TODO: sambungkan ke backend generator. Sekarang semuanya opsional dan
  // layar tetap bisa dirender tanpa handler.
  onConfirm?: (payload: KonfirmasiConfirmPayload) => void
  onEditPlan?: () => void
  onReplaceFile?: () => void
}

const card = 'rounded-2xl border border-border bg-card p-6 shadow-soft'
const cardTitle = 'text-xs font-semibold tracking-wide text-muted'

export default function KonfirmasiScreen({ plan, isDummy = false, onConfirm, onEditPlan, onReplaceFile }: Props) {
  const [choice, setChoice] = useState<string | undefined>(plan.decision?.default_option_id)
  const needsChoice = plan.decision !== null && !choice

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Stepper current={2} />

      {isDummy && (
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-ink">
          <Info size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          Data contoh. Layar ini belum tersambung ke generator.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Kiri: konteks */}
        <div className="flex flex-col gap-5">
          <section className={card}>
            <h2 className={cardTitle}>Permintaan kamu</h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-card-foreground">{plan.request_text}</p>
          </section>

          <section className={card}>
            <h2 className={cardTitle}>Contoh file</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-excel-head text-accent-ink">
                <FileSpreadsheet size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold text-card-foreground">{plan.sample_file.name}</p>
                <p className="text-xs font-medium text-muted">
                  {plan.sample_file.sheet_count} sheet, {plan.sample_file.row_count.toLocaleString('id-ID')} baris
                </p>
              </div>
              <button
                type="button"
                onClick={onReplaceFile}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground transition hover:border-foreground/30"
              >
                Ganti file
              </button>
            </div>
          </section>

          <section className={`${card} overflow-hidden !p-0`}>
            <h2 className={`${cardTitle} p-6 pb-3`}>Yang AI temukan</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Sheet dan header kolom baris 1 dari contoh file</caption>
                <thead className="bg-excel-head text-xs font-semibold text-muted">
                  <tr>
                    <th scope="col" className="px-6 py-2">Sheet</th>
                    <th scope="col" className="px-6 py-2">Header kolom</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.detected_sheets.map((s) => (
                    <tr key={s.name} className="border-t border-border align-top">
                      <th scope="row" className="whitespace-nowrap px-6 py-3 font-mono text-xs font-bold text-card-foreground">
                        {s.name}
                      </th>
                      <td className="px-6 py-3">
                        <ul className="flex flex-wrap gap-1.5">
                          {s.columns.map((c) => (
                            <li
                              key={c}
                              className="rounded border border-excel-grid bg-surface px-1.5 py-0.5 text-xs font-medium text-card-foreground"
                            >
                              {c}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Kanan: rencana */}
        <section className={`${card} flex flex-col gap-6 sm:p-8`}>
          <div>
            <p className="font-mono text-xs font-semibold text-accent-ink">{plan.output_file_name}</p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-card-foreground sm:text-3xl">
              Ini yang bakal dilakukan macro kamu
            </h1>
            <p className="mt-2 text-sm font-medium text-muted">
              Cek dulu. Kalau ada yang salah tangkap, ubah sebelum file dibuat.
            </p>
          </div>

          <ol className="flex flex-col gap-3">
            {plan.steps.map((s, i) => (
              <li key={s.id} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-base font-medium leading-snug text-card-foreground">{s.text}</span>
              </li>
            ))}
          </ol>

          {plan.decision && (
            <fieldset className="rounded-xl border border-warning-border bg-warning-bg p-5 text-warning-ink">
              <legend className="px-1 text-xs font-bold tracking-wide">Satu hal yang perlu kamu pilih</legend>
              <p className="text-sm font-bold leading-snug">{plan.decision.question}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {plan.decision.options.map((o) => {
                  const selected = choice === o.id
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setChoice(o.id)}
                      className={`rounded-lg border px-4 py-2.5 text-left text-sm font-bold transition ${
                        selected
                          ? 'border-action bg-action text-white'
                          : 'border-warning-border bg-card text-card-foreground hover:border-warning-ink/50'
                      }`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onEditPlan}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 text-sm font-bold text-foreground transition hover:border-foreground/30 active:scale-[0.98]"
            >
              <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
              Ubah rencana
            </button>
            <button
              type="button"
              disabled={needsChoice}
              onClick={() =>
                onConfirm?.({
                  plan_id: plan.plan_id,
                  decision_answers: plan.decision && choice ? { [plan.decision.id]: choice } : {},
                })
              }
              className="inline-flex h-12 items-center justify-center rounded-lg bg-action px-7 text-sm font-bold text-white shadow-glow transition hover:bg-action-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              Sudah benar, bikin file
            </button>
          </div>
          {needsChoice && (
            <p className="-mt-3 text-right text-xs font-medium text-muted">Pilih salah satu di atas dulu.</p>
          )}
        </section>
      </div>
    </div>
  )
}
