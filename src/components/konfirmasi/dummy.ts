import type { KonfirmasiPlan } from './types'

/**
 * DATA DUMMY. Cuma buat tampilan sementara, bukan hasil generator beneran.
 * TODO: ganti dengan data dari backend (lihat docs/konfirmasi-contract.md).
 */
export const DUMMY_PLAN: KonfirmasiPlan = {
  plan_id: 'dummy-plan-001',
  request_text:
    'Gabungin semua file penjualan cabang di satu folder jadi satu sheet Rekap. Tambahin kolom Cabang dari nama file.',
  sample_file: {
    name: 'Penjualan_JKT_Oktober.xlsx',
    sheet_count: 3,
    row_count: 1240,
  },
  detected_sheets: [
    {
      name: 'Sales',
      header_row: 1,
      columns: ['Tanggal', 'Customer', 'Kode', 'Qty', 'Nilai', 'Catatan'],
    },
    { name: 'Ringkasan', header_row: 1, columns: ['Cabang', 'Total'] },
    { name: 'Master', header_row: 1, columns: ['Kode', 'Nama Produk'] },
  ],
  output_file_name: 'Rekap_Multi_File.xlsm',
  steps: [
    { id: 's1', text: 'Buka semua file .xlsx di folder yang kamu pilih.' },
    { id: 's2', text: 'Ambil sheet Sales dari tiap file, mulai dari baris 2.' },
    { id: 's3', text: 'Gabung semuanya jadi satu sheet Rekap, lalu tambah kolom Cabang dari nama file.' },
    { id: 's4', text: 'Tulis jumlah file dan jumlah baris yang berhasil digabung di sheet Hasil.' },
  ],
  decision: {
    id: 'header_beda',
    question: 'Kalau ada file yang header-nya beda dari contoh, macro harus gimana?',
    options: [
      { id: 'lewati', label: 'Lewati file itu dan kasih tahu aku' },
      { id: 'berhenti', label: 'Berhenti dan tampilkan pesan error' },
    ],
  },
}
