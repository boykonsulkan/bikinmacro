// Tes pembuat .xlsm: npx tsx scripts/test-xlsm.ts
import * as CFB from 'cfb'
import { unzipSync } from 'fflate'
import { buildXlsm, encodeVbaSource, moduleSource } from '../src/lib/xlsm/build'
import { compress, decompress } from '../src/lib/xlsm/ovba'
import { TEMPLATE_MODULE } from '../src/lib/xlsm/template'

let fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok ? '' : '  ' + detail))
  if (!ok) fail++
}
const u8 = (b: unknown) => Uint8Array.from(b as ArrayLike<number>)
const text = (u: Uint8Array) => Buffer.from(u).toString('latin1')
const moduleText = (xlsm: Uint8Array) => {
  const cfb = CFB.read(Buffer.from(unzipSync(xlsm)['xl/vbaProject.bin']), { type: 'buffer' })
  return text(decompress(u8(CFB.find(cfb, '/VBA/' + TEMPLATE_MODULE)!.content)))
}

const SAMPLE = 'Sub Halo()\n    MsgBox "Selamat datang – café ‘ok’"\nEnd Sub'
const out = buildXlsm(SAMPLE)
const zip = unzipSync(out)
check('hasil adalah zip dengan vbaProject.bin', !!zip['xl/vbaProject.bin'] && !!zip['[Content_Types].xml'])
check('workbook.xml tetap ada', !!zip['xl/workbook.xml'])

const t = moduleText(out)
check('modul berisi kode kita', t.includes('Sub Halo()') && t.includes('End Sub'))
check('nama modul dipasang', t.startsWith(`Attribute VB_Name = "${TEMPLATE_MODULE}"\r\n`))
check('baris baru jadi CRLF', !/[^\r]\n/.test(t))
check('tanda baca khas AI dipetakan ke Windows-1252', t.includes('\x96') && t.includes('\x91ok\x92') && t.includes('é'))
check('Attribute VB_Name dari AI dibuang', (moduleSource('Attribute VB_Name = "Evil"\nSub A()\nEnd Sub').match(/VB_Name/g) ?? []).length === 1)
check('karakter di luar Windows-1252 jadi ?', encodeVbaSource('a漢b')[1] === 63)

const big = Array.from({ length: 400 }, (_, i) => `    Cells(${i + 1}, 1).Value = "Baris nomor ${i}" ' komentar panjang berulang`).join('\n')
const bigCode = `Sub Besar()\n${big}\nEnd Sub`
const rt = decompress(compress(encodeVbaSource(bigCode)))
check('kompresi bolak-balik untuk kode besar (>4096 byte)', Buffer.from(rt).equals(Buffer.from(encodeVbaSource(bigCode))))
check('kompresi data kosong aman', decompress(compress(new Uint8Array(0))).length === 0)
check('kode besar masuk utuh ke modul', moduleText(buildXlsm(bigCode)).includes('Baris nomor 399'))

const cfb = CFB.read(Buffer.from(zip['xl/vbaProject.bin']), { type: 'buffer' })
const srp = cfb.FileIndex.filter((e) => /^__SRP_\d+$/.test(e.name))
check('tidak ada cache p-code yang tersisa', srp.every((e) => e.size === 0))
check('hasil deterministik untuk input yang sama', Buffer.from(buildXlsm(SAMPLE)).equals(Buffer.from(out)))
console.log(fail ? `\n${fail} GAGAL` : '\nSEMUA LOLOS')
process.exit(fail ? 1 : 0)
