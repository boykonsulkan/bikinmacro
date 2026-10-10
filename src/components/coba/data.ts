// Data statis demo "Coba gratis". Semua nama dan angka FIKTIF.
// Angka hasil komisi di bawah sama dengan yang dihitung ulang dan dites di
// scripts/demo/test-demo.ps1 (dari scripts/demo/demo-data.ps1).

export const SAMPLE_FILE = '/demo/Contoh_Rekap_Penjualan.xlsx'
export const SAMPLE_FILE_NAME = 'Contoh_Rekap_Penjualan.xlsx'
export const RESULT_FILE = '/demo/Proses_Rekap_Penjualan.xlsm'
export const RESULT_FILE_NAME = 'Proses_Rekap_Penjualan.xlsm'
export const RESULT_BAS = '/demo/Proses_Rekap_Penjualan.bas'

export const STEP_LABELS = ['Download contoh', 'Upload file', 'Download hasil']

export const TIERS = [
  { range: 'Di bawah Rp 50.000.000', persen: '1%' },
  { range: 'Rp 50.000.000 sampai Rp 99.999.999', persen: '2%' },
  { range: 'Rp 100.000.000 ke atas', persen: '3%' },
]

export const MODES = [
  {
    name: 'Hitung komisi per Sales',
    text: 'Total penjualan tiap Sales dikali persen dari sheet Aturan Komisi.',
  },
  {
    name: 'Pecah jadi file baru per nilai unik',
    text: 'Satu file Excel baru untuk tiap nilai unik di kolom pilihan, misalnya satu file per Sales.',
  },
  {
    name: 'Gabung beberapa file jadi satu',
    text: 'Pilih beberapa file sekaligus, datanya digabung ke satu tabel.',
  },
]

// Hasil mode "Hitung komisi per Sales" untuk file contoh. Selalu sama.
export const EXPECTED_KOMISI = [
  { sales: 'Andi', region: 'Jakarta', transaksi: 14, total: 133250000, persen: '3%', komisi: 3997500 },
  { sales: 'Budi', region: 'Jakarta', transaksi: 8, total: 75800000, persen: '2%', komisi: 1516000 },
  { sales: 'Citra', region: 'Surabaya', transaksi: 12, total: 108800000, persen: '3%', komisi: 3264000 },
  { sales: 'Dewi', region: 'Medan', transaksi: 2, total: 26750000, persen: '1%', komisi: 267500 },
  { sales: 'Eko', region: 'Surabaya', transaksi: 8, total: 77800000, persen: '2%', komisi: 1556000 },
]

// Ciri file contoh, dipakai buat ngecek file yang diupload.
export const FINGERPRINT = {
  dataSheet: 'Penjualan',
  ruleSheet: 'Aturan Komisi',
  header: ['No', 'Tanggal', 'Sales', 'Region', 'Produk', 'Qty', 'Harga', 'Nilai'],
  rowCount: 44,
  totalNilai: 422400000,
}

// Langkah "generate". Demo ini memakai file hasil yang sudah disiapkan,
// jadi progress cuma menampilkan apa yang dikerjakan, bukan proses AI live.
export const GENERATE_STEPS = [
  'Membaca sheet Penjualan',
  'Membaca sheet Aturan Komisi',
  'Menyusun sheet Mulai, Hasil, dan Petunjuk',
  'Menanam macro ke file .xlsm',
]
