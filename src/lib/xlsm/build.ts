// Merakit file .xlsm berisi kode VBA tanpa Excel: template kosong (dibuat sekali pakai Excel) diambil, lalu isi
// modul "BikinMacro" diganti. Semua modul dijadikan "source-only" dan cache p-code dikosongkan, jadi Excel yang
// membuka file menyusun ulang kode dari teksnya sendiri. Murni JavaScript, jalan di serverless (tanpa Excel).
import * as CFB from 'cfb'
import { unzipSync, zipSync } from 'fflate'
import { compress, decompress } from './ovba'
import { TEMPLATE_B64, TEMPLATE_MODULE } from './template'

/** Karakter di luar ASCII yang umum muncul di teks AI, dipetakan ke code page Windows-1252 (default VBA). */
const CP1252: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a,
  '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
}

export function encodeVbaSource(code: string): Uint8Array {
  const text = code.replace(/\r\n?|\n/g, '\r\n')
  const out: number[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 63
    if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) out.push(cp)
    else out.push(CP1252[ch] ?? 63)
  }
  return Uint8Array.from(out)
}

/** Nama aliran modul dan lokasi MODULEOFFSET di aliran `dir` (yang sudah didekompres). */
function readModules(dir: Uint8Array): { stream: string; offsetAt: number }[] {
  const view = new DataView(dir.buffer, dir.byteOffset, dir.byteLength)
  const mods: { stream: string; offsetAt: number }[] = []
  let name = ''
  let p = 0
  while (p + 6 <= dir.length) {
    const id = view.getUint16(p, true)
    const size = view.getUint32(p + 2, true)
    if (id === 0x1a) name = String.fromCharCode(...dir.subarray(p + 6, p + 6 + size))
    if (id === 0x31) mods.push({ stream: name, offsetAt: p + 6 })
    p += 6 + size + (id === 0x09 ? 2 : 0) // PROJECTVERSION punya 2 byte tambahan di luar Size
  }
  return mods
}

const bytes = (b: unknown) => Uint8Array.from(b as ArrayLike<number>)

/** Siapkan isi modul: buang `Attribute VB_Name` bawaan AI, lalu pasang nama modul kita. */
export function moduleSource(code: string): string {
  const body = code.replace(/^\s*Attribute\s+VB_Name\s*=.*$/gim, '').replace(/^\s*\n/, '').trimEnd()
  return `Attribute VB_Name = "${TEMPLATE_MODULE}"\r\n${body}\r\n`
}

export function buildXlsm(code: string): Uint8Array {
  const zip = unzipSync(Uint8Array.from(Buffer.from(TEMPLATE_B64, 'base64')))
  const project = zip['xl/vbaProject.bin']
  if (!project) throw new Error('Template xlsm rusak: vbaProject.bin tidak ada')
  const cfb = CFB.read(Buffer.from(project), { type: 'buffer' })

  const dirEntry = CFB.find(cfb, '/VBA/dir')
  if (!dirEntry?.content) throw new Error('Template xlsm rusak: aliran dir tidak ada')
  const dir = decompress(bytes(dirEntry.content))
  const view = new DataView(dir.buffer, dir.byteOffset, dir.byteLength)

  for (const mod of readModules(dir)) {
    const entry = CFB.find(cfb, '/VBA/' + mod.stream)
    if (!entry?.content) continue
    const textOffset = view.getUint32(mod.offsetAt, true)
    // Ambil teks sumber (buang p-code di depannya) lalu simpan ulang tanpa p-code.
    const source =
      mod.stream === TEMPLATE_MODULE
        ? encodeVbaSource(moduleSource(code))
        : decompress(bytes(entry.content).subarray(textOffset))
    const packed = compress(source)
    entry.content = Buffer.from(packed)
    entry.size = packed.length
    view.setUint32(mod.offsetAt, 0, true)
  }
  const packedDir = compress(dir)
  dirEntry.content = Buffer.from(packedDir)
  dirEntry.size = packedDir.length

  // Versi 0xFFFF = "cache tidak cocok": Excel menyusun ulang dari teks. Aliran __SRP_n (cache) dikosongkan.
  const vbaProject = CFB.find(cfb, '/VBA/_VBA_PROJECT')
  if (vbaProject?.content) {
    const header = Buffer.from(vbaProject.content).subarray(0, 7)
    header.writeUInt16LE(0xffff, 2)
    vbaProject.content = header
    vbaProject.size = 7
  }
  for (const entry of cfb.FileIndex) {
    if (/^__SRP_\d+$/.test(entry.name)) {
      entry.content = Buffer.alloc(0)
      entry.size = 0
    }
  }

  zip['xl/vbaProject.bin'] = bytes(CFB.write(cfb, { type: 'buffer' }))
  return zipSync(zip)
}
