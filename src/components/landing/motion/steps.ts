import type { SceneStep } from './LoopScene'

// Durasi tiap langkah animasi (ms). Ubah angka di sini untuk atur timing.
// Loop = jumlah durasi + jeda 1500 ms di frame akhir (default LoopScene).

export const HERO_STEPS: SceneStep[] = [
  { id: 'ketik', duration: 2000 },
  { id: 'klik', duration: 900 },
  { id: 'proses', duration: 1700 },
  { id: 'rekap', duration: 2200 },
  { id: 'selesai', duration: 600 },
]

export const CERITAIN_STEPS: SceneStep[] = [
  { id: 'ketik', duration: 2600 },
  { id: 'tab', duration: 600 },
  { id: 'rencana', duration: 2000 },
]

export const CEK_FILE_STEPS: SceneStep[] = [
  { id: 'sapu', duration: 1400 },
  { id: 'chip', duration: 1800 },
  { id: 'pudar', duration: 1000 },
  { id: 'diam', duration: 800 },
]

export const DOWNLOAD_STEPS: SceneStep[] = [
  { id: 'turun', duration: 1600 },
  { id: 'buka', duration: 800 },
  { id: 'klik', duration: 1400 },
  { id: 'selesai', duration: 1000 },
]

export const ERROR_FIX_STEPS: SceneStep[] = [
  { id: 'error', duration: 1700 },
  { id: 'hapus', duration: 500 },
  { id: 'ketik', duration: 1300 },
  { id: 'beres', duration: 1500 },
]
