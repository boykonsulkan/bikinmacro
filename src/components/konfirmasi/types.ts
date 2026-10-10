/**
 * Kontrak data layar "Konfirmasi rencana".
 * Bentuk ini yang harus dikirim backend generator ke layar, setelah user
 * ngetik permintaan + upload contoh file dan sebelum file dibuat.
 * Dokumentasi lengkap: docs/konfirmasi-contract.md
 */
export type KonfirmasiPlan = {
  /** ID rencana. Dikirim balik saat user konfirmasi atau ubah rencana. */
  plan_id: string

  /** Permintaan user, apa adanya. */
  request_text: string

  sample_file: {
    name: string
    sheet_count: number
    /** Total baris di semua sheet. */
    row_count: number
  }

  /** Hasil baca file contoh: tiap sheet dan header kolom di baris 1. */
  detected_sheets: {
    name: string
    /** Nomor baris header yang terdeteksi (biasanya 1). */
    header_row: number
    /** Nama kolom di baris header, urut dari kiri. */
    columns: string[]
  }[]

  /** Nama file output, contoh "Rekap_Multi_File.xlsm". */
  output_file_name: string

  /** Langkah macro dalam bahasa awam, urut. */
  steps: { id: string; text: string }[]

  /** Satu pertanyaan yang harus dijawab user. null kalau nggak ada. */
  decision: {
    id: string
    question: string
    options: { id: string; label: string }[]
    /** Opsi yang terpilih dari awal. Boleh dikosongkan. */
    default_option_id?: string
  } | null
}

/** Yang dikirim balik layar saat user klik "Sudah benar, bikin file". */
export type KonfirmasiConfirmPayload = {
  plan_id: string
  /** id pertanyaan -> id opsi yang dipilih. Kosong kalau decision null. */
  decision_answers: Record<string, string>
}
