// Kompresi/dekompresi aliran VBA, sesuai MS-OVBA 2.4.1. Dipakai untuk membaca dan menulis modul di vbaProject.bin.

export function decompress(buf: Uint8Array): Uint8Array {
  if (buf[0] !== 1) throw new Error('Aliran VBA tidak valid')
  const out: number[] = []
  let p = 1
  while (p < buf.length) {
    const header = buf[p] | (buf[p + 1] << 8)
    const size = (header & 0xfff) + 3
    const compressed = (header & 0x8000) !== 0
    const end = Math.min(p + size, buf.length)
    const chunkStart = out.length
    p += 2
    if (!compressed) {
      for (let i = 0; i < 4096 && p < buf.length; i++) out.push(buf[p++])
      continue
    }
    while (p < end) {
      const flags = buf[p++]
      for (let bit = 0; bit < 8 && p < end; bit++) {
        if (!(flags & (1 << bit))) {
          out.push(buf[p++])
          continue
        }
        const token = buf[p] | (buf[p + 1] << 8)
        p += 2
        const offsetBits = Math.max(Math.ceil(Math.log2(Math.max(out.length - chunkStart, 1))), 4)
        const lengthBits = 16 - offsetBits
        const length = (token & ((1 << lengthBits) - 1)) + 3
        const offset = (token >> lengthBits) + 1
        for (let i = 0; i < length; i++) out.push(out[out.length - offset])
      }
    }
  }
  return Uint8Array.from(out)
}

export function compress(src: Uint8Array): Uint8Array {
  const parts: number[] = [1]
  for (let start = 0; start < src.length || start === 0; start += 4096) {
    const chunk = src.subarray(start, start + 4096)
    const body: number[] = []
    let pos = 0
    while (pos < chunk.length) {
      let flags = 0
      const tokens: number[] = []
      for (let bit = 0; bit < 8 && pos < chunk.length; bit++) {
        let bestLen = 0
        let bestOff = 0
        if (pos > 0) {
          const offsetBits = Math.max(Math.ceil(Math.log2(pos)), 4)
          const lengthBits = 16 - offsetBits
          const maxLen = (1 << lengthBits) + 2
          const maxOff = 1 << offsetBits
          for (let off = 1; off <= Math.min(pos, maxOff); off++) {
            let len = 0
            while (len < maxLen && pos + len < chunk.length && chunk[pos + len - off] === chunk[pos + len]) len++
            if (len > bestLen) {
              bestLen = len
              bestOff = off
            }
          }
          if (bestLen >= 3) {
            flags |= 1 << bit
            const token = ((bestOff - 1) << lengthBits) | (bestLen - 3)
            tokens.push(token & 255, token >> 8)
            pos += bestLen
            continue
          }
        }
        tokens.push(chunk[pos])
        pos++
      }
      body.push(flags, ...tokens)
    }
    const header = 0xb000 | (body.length + 2 - 3)
    parts.push(header & 255, header >> 8, ...body)
    if (src.length === 0) break
  }
  return Uint8Array.from(parts)
}
