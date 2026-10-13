'use client'

import { useId, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { FileSpreadsheet, ShieldCheck, X } from 'lucide-react'
import { FILE_LIMITS, buildStructure, columnKey, describeContext, sheetKey, toContext } from '@/lib/excel/structure'
import type { FileContext, FileStructure } from '@/lib/excel/structure'
import { track } from '@/lib/events/client'

const TYPE_STYLE: Record<string, string> = {
  angka: 'bg-blue-50 text-blue-700',
  tanggal: 'bg-violet-50 text-violet-700',
  teks: 'bg-gray-100 text-gray-600',
  campuran: 'bg-amber-50 text-amber-700',
  kosong: 'bg-gray-50 text-gray-400',
}

/**
 * Lampirkan contoh file Excel. File dibaca DI BROWSER dan nggak diunggah. Yang dikirim ke AI hanya nama sheet, header
 * kolom, jenis isi, jumlah baris, dan (kalau dicentang) beberapa contoh isi. Pengguna memilih persis apa yang ikut.
 */
export default function FileAttach({ onChange }: { onChange: (ctx: FileContext | null) => void }) {
  const inputId = useId()
  const [structure, setStructure] = useState<FileStructure | null>(null)
  const [fileName, setFileName] = useState('')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [includeSamples, setIncludeSamples] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const emit = (s: FileStructure | null, ex: Set<string>, samples: boolean) =>
    onChange(s ? toContext(s, { excluded: ex, includeSamples: samples }) : null)

  const reset = () => {
    setStructure(null)
    setFileName('')
    setExcluded(new Set())
    setIncludeSamples(false)
    setError('')
    onChange(null)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
      setError('Pakai file Excel berformat .xlsx. File .xls lama atau CSV belum didukung.')
      return
    }
    if (file.size > FILE_LIMITS.maxBytes) {
      setError(`File terlalu besar (maksimal ${FILE_LIMITS.maxBytes / 1024 / 1024} MB). Simpan salinan yang lebih kecil, misalnya 50 baris pertama.`)
      return
    }
    setBusy(true)
    try {
      const workbook = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[]
      const built = buildStructure(workbook)
      if (built.sheets.length === 0) {
        setError('Nggak menemukan tabel di file ini. Pastikan ada baris header di bagian atas sheet.')
        return
      }
      setStructure(built)
      setFileName(file.name)
      setExcluded(new Set())
      setIncludeSamples(false)
      emit(built, new Set(), false)
      track('file_attached', { sheets: built.sheets.length, columns: built.sheets.reduce((n, s) => n + s.columns.length, 0) })
    } catch {
      setError('File nggak bisa dibaca. Pastikan itu file Excel .xlsx yang nggak rusak dan nggak diberi password.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (key: string) => {
    if (!structure) return
    const next = new Set(excluded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExcluded(next)
    emit(structure, next, includeSamples)
  }

  const context = structure ? toContext(structure, { excluded, includeSamples }) : null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <FileSpreadsheet size={18} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Lampirkan contoh file Excel (opsional)</p>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            Biar macro-nya pakai nama sheet dan kolom yang persis sama dengan datamu. File ini{' '}
            <strong>dibaca di browsermu dan tidak diunggah</strong>.
          </p>
        </div>
        {structure && (
          <button onClick={reset} aria-label="Hapus lampiran" className="rounded-lg p-1 text-gray-400 hover:text-gray-900">
            <X size={16} />
          </button>
        )}
      </div>

      {!structure && (
        <div className="mt-4">
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:border-primary hover:bg-primary/5 ${busy ? 'opacity-60' : ''}`}
          >
            {busy ? 'Membaca file...' : 'Pilih file .xlsx'}
          </label>
          <input
            id={inputId}
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {structure && (
        <div className="mt-4 space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium leading-relaxed text-emerald-800">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>{fileName}</strong> dibaca di perangkatmu. Hanya yang kamu centang di bawah yang dikirim ke AI: nama sheet,
              header kolom, dan jenis isinya. Kolom yang berisi data sensitif tinggal dicabut centangnya.
            </span>
          </p>

          {structure.sheets.map((s) => {
            const sheetOff = excluded.has(sheetKey(s.name))
            return (
              <fieldset key={s.name} className="rounded-xl border border-gray-200 p-3">
                <legend className="px-1">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <input type="checkbox" checked={!sheetOff} onChange={() => toggle(sheetKey(s.name))} aria-label={`Sertakan sheet ${s.name}`} />
                    Sheet &quot;{s.name}&quot;
                    <span className="text-xs font-normal text-gray-400">
                      {s.rowCount} baris data, header di baris {s.headerRow}
                    </span>
                  </label>
                </legend>
                <ul className={`mt-2 grid gap-1.5 sm:grid-cols-2 ${sheetOff ? 'opacity-40' : ''}`}>
                  {s.columns.map((c) => (
                    <li key={c.col}>
                      <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={!sheetOff && !excluded.has(columnKey(s.name, c.col))}
                          disabled={sheetOff}
                          onChange={() => toggle(columnKey(s.name, c.col))}
                          aria-label={`Sertakan kolom ${c.header}`}
                        />
                        <span className="font-mono text-gray-400">{c.col}</span>
                        <span className="min-w-0 flex-1 truncate font-medium" title={c.header}>{c.header}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_STYLE[c.type]}`}>{c.type}</span>
                      </label>
                      {includeSamples && c.samples.length > 0 && !sheetOff && !excluded.has(columnKey(s.name, c.col)) && (
                        <p className="truncate pl-8 text-[11px] text-gray-400" title={c.samples.join(', ')}>
                          contoh: {c.samples.join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </fieldset>
            )
          })}

          {structure.truncated && (
            <p className="text-xs text-amber-700">
              File ini besar, jadi hanya {FILE_LIMITS.maxSheets} sheet pertama dan {FILE_LIMITS.maxColumns} kolom pertama per sheet yang dibaca.
            </p>
          )}

          <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 text-xs text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={includeSamples}
              onChange={(e) => {
                setIncludeSamples(e.target.checked)
                emit(structure, excluded, e.target.checked)
              }}
            />
            <span>
              Sertakan juga <strong>contoh isi</strong> (sampai {FILE_LIMITS.maxSamplesPerColumn} baris pertama per kolom). Membantu macro
              menebak format tanggal dan angka. <span className="text-amber-700">Jangan dicentang kalau datamu sensitif.</span>
            </span>
          </label>

          <p className="text-xs font-medium text-gray-500" aria-live="polite">
            {context
              ? `Yang akan dikirim ke AI: ${describeContext(context)}${includeSamples ? ', dengan contoh isi' : ', tanpa contoh isi'}.`
              : 'Belum ada kolom yang dipilih, jadi lampiran tidak dikirim.'}
          </p>
        </div>
      )}
    </div>
  )
}
