// Tes modul email (murni, tanpa jaringan sungguhan): parsing penerima, template, dan klien Resend
// dengan fetch palsu.
// Pakai:  npx tsx scripts/test-email.ts
import assert from 'node:assert/strict'
import { EMAIL_LIMITS, TEMPLATES } from '../src/lib/email/config'
import { cleanName, parseRecipients } from '../src/lib/email/recipients'
import { checkSenderDomain, emailConfig, sendOne, senderDomain } from '../src/lib/email/resend'
import { buildCtas, escapeHtml, oneLine, renderEmail } from '../src/lib/email/templates'

let passed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`PASS  ${name}`)
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

async function main() {
  await test('penerima: tiga format dikenali, email dikecilkan, dobel dibuang', () => {
    const r = parseRecipients('Budi@X.com\nsiti@y.co.id, Siti Aminah\nAndi Wijaya <andi@z.com>\nbudi@x.com')
    assert.deepEqual(r.valid, [
      { email: 'budi@x.com', name: '' },
      { email: 'siti@y.co.id', name: 'Siti Aminah' },
      { email: 'andi@z.com', name: 'Andi Wijaya' },
    ])
    assert.equal(r.duplicates, 1)
    assert.deepEqual(r.invalid, [])
  })
  await test('penerima: baris rusak dilaporkan, kosong diabaikan, titik koma memisahkan', () => {
    const r = parseRecipients('\n  \nbukan-email\na@b\nok@x.com;lain@y.com\n@x.com')
    assert.equal(r.valid.length, 2)
    assert.deepEqual(r.invalid, ['bukan-email', 'a@b', '@x.com'])
  })
  await test('nama dibersihkan dari karakter kontrol dan kurung', () => {
    assert.equal(cleanName('Budi\r\nBcc: x@y.com <b>'), 'Budi Bcc: x@y.com b')
    assert.equal(cleanName('x'.repeat(200)).length, EMAIL_LIMITS.nameMax)
  })
  await test('template: sapaan, escape HTML, paragraf, dan tombol', () => {
    const r = renderEmail({
      subject: 'Halo {nama}\nBcc: x',
      body: 'Baris <b>satu</b>\nbaris dua\n\nParagraf "dua" & {nama}',
      recipient: { email: 'a@b.co', name: 'Budi' },
      ctas: [{ label: 'Daftar', url: 'https://bikinmacro.my.id/auth/register?a=1&b=2' }],
    })
    assert.equal(r.subject, 'Halo Budi Bcc: x')
    assert.ok(r.html.includes('Halo Budi,'))
    assert.ok(r.html.includes('&lt;b&gt;satu&lt;/b&gt;<br>baris dua'))
    assert.ok(r.html.includes('Paragraf &quot;dua&quot; &amp; Budi'))
    assert.ok(!r.html.includes('<b>satu'), 'HTML dari isi harus di-escape')
    assert.ok(r.html.includes('href="https://bikinmacro.my.id/auth/register?a=1&amp;b=2"'))
    assert.ok(r.text.includes('Daftar: https://bikinmacro.my.id/auth/register?a=1&b=2'))
  })
  await test('template: tanpa nama pakai "Halo," dan {nama} jadi "kamu"; tanpa CTA nggak ada tombol', () => {
    const r = renderEmail({ subject: 's', body: 'Hai {nama}', recipient: { email: 'a@b.co', name: '' } })
    assert.ok(r.html.includes('Halo,'))
    assert.ok(r.html.includes('Hai kamu'))
    assert.ok(!r.html.includes('<a href'))
  })
  await test('tombol: coba jadi utama, daftar jadi kedua (outline); sendirian jadi utama', () => {
    const both = buildCtas({ coba: true, daftar: true }, 'https://bikinmacro.my.id/')
    assert.deepEqual(both.map((c) => [c.label, c.url, c.style]), [
      ['Coba contoh dulu', 'https://bikinmacro.my.id/coba', 'primary'],
      ['Daftar sebagai beta tester', 'https://bikinmacro.my.id/auth/register', 'secondary'],
    ])
    assert.equal(buildCtas({ coba: false, daftar: true }, 'https://x.id')[0].style, 'primary')
    assert.equal(buildCtas({ coba: true, daftar: false }, 'https://x.id').length, 1)
    assert.deepEqual(buildCtas({ coba: false, daftar: false }, 'https://x.id'), [])
  })
  await test('dua tombol dirender berurutan dengan gaya berbeda, dan muncul di versi teks', () => {
    const r = renderEmail({
      subject: 's',
      body: 'isi email yang cukup panjang',
      recipient: { email: 'a@b.co', name: '' },
      ctas: buildCtas({ coba: true, daftar: true }, 'https://bikinmacro.my.id'),
    })
    const iCoba = r.html.indexOf('/coba')
    const iDaftar = r.html.indexOf('/auth/register')
    assert.ok(iCoba > 0 && iDaftar > iCoba, 'tombol coba harus di atas tombol daftar')
    assert.ok(r.html.includes('bgcolor="#007a4e"') && r.html.includes('bgcolor="#ffffff"'), 'satu hijau penuh, satu outline')
    assert.ok(r.text.includes('Coba contoh dulu: https://bikinmacro.my.id/coba'))
    assert.ok(r.text.includes('Daftar sebagai beta tester: https://bikinmacro.my.id/auth/register'))
    assert.ok(!renderEmail({ subject: 's', body: 'isi email yang cukup panjang', recipient: { email: 'a@b.co', name: '' } }).html.includes('<a href'))
  })
  await test('undangan beta menyebut demo tanpa daftar dan syarat Excel Windows', () => {
    const b = TEMPLATES.beta_invite
    assert.ok(b.ctas.coba && b.ctas.daftar)
    assert.ok(/nggak perlu daftar/i.test(b.body) && /Windows/.test(b.body))
  })
  await test('template bawaan nggak memakai em dash atau en dash', () => {
    for (const t of Object.values(TEMPLATES)) assert.ok(!/[–—]/.test(t.subject + t.body))
  })
  await test('escapeHtml dan oneLine', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
    assert.equal(oneLine('a\r\nb\tc  d'), 'a b c d')
  })
  await test('config: sandbox terdeteksi, key harus berawalan re_', () => {
    assert.deepEqual(emailConfig({}), { configured: false, from: 'BikinMacro <onboarding@resend.dev>', replyTo: 'founder@pelajarin.id', replyToIsDefault: true, sandbox: true })
    const c = emailConfig({ RESEND_API_KEY: 're_abc', EMAIL_FROM: 'BikinMacro <halo@bikinmacro.my.id>', EMAIL_REPLY_TO: 'boy@x.com' })
    assert.equal(c.configured, true)
    assert.equal(c.sandbox, false)
    assert.equal(c.replyTo, 'boy@x.com')
    assert.equal(c.replyToIsDefault, false)
    assert.equal(emailConfig({ RESEND_API_KEY: 'bukan-key' }).configured, false)
  })

  const msg = { to: 'a@b.co', subject: 'S', html: '<p>x</p>', text: 'x' }
  await test('kirim: sukses mengirim header dan body yang benar', async () => {
    let seen: { url: string; init: RequestInit } | null = null
    const r = await sendOne(msg, {
      apiKey: 're_rahasia123',
      from: 'BikinMacro <halo@bikinmacro.my.id>',
      replyTo: 'boy@x.com',
      idempotencyKey: 'abc-1',
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen = { url, init }
        return json(200, { id: 'em_1' })
      }) as unknown as typeof fetch,
    })
    assert.deepEqual(r, { ok: true, id: 'em_1' })
    const h = seen!.init.headers as Record<string, string>
    assert.equal(seen!.url, 'https://api.resend.com/emails')
    assert.equal(h.Authorization, 'Bearer re_rahasia123')
    assert.equal(h['Idempotency-Key'], 'abc-1')
    const body = JSON.parse(String(seen!.init.body))
    assert.deepEqual(body.to, ['a@b.co'])
    assert.equal(body.reply_to, 'boy@x.com')
    assert.equal(body.from, 'BikinMacro <halo@bikinmacro.my.id>')
  })
  await test('kirim: 429 diulang sekali lalu sukses', async () => {
    let calls = 0
    const r = await sendOne(msg, {
      apiKey: 're_k',
      retryDelayMs: 1,
      fetchImpl: (async () => (++calls === 1 ? json(429, { message: 'slow down' }) : json(200, { id: 'em_2' }))) as unknown as typeof fetch,
    })
    assert.equal(calls, 2)
    assert.deepEqual(r, { ok: true, id: 'em_2' })
  })
  await test('kirim: 429 terus-menerus gagal dengan pesan jelas (hanya 2 percobaan)', async () => {
    let calls = 0
    const r = await sendOne(msg, { apiKey: 're_k', retryDelayMs: 1, fetchImpl: (async () => (++calls, json(429, {}))) as unknown as typeof fetch })
    assert.equal(calls, 2)
    assert.ok(!r.ok && r.error.includes('batas kirim'))
  })
  await test('kirim: 401, domain belum diverifikasi, jaringan putus, dan key kosong', async () => {
    const mk = (status: number, body: unknown) => (async () => json(status, body)) as unknown as typeof fetch
    const a = await sendOne(msg, { apiKey: 're_k', fetchImpl: mk(401, { message: 'API key is invalid' }) })
    assert.ok(!a.ok && a.error.includes('API key Resend ditolak'))
    const b = await sendOne(msg, { apiKey: 're_k', fetchImpl: mk(422, { message: 'The bikinmacro.my.id domain is not verified' }) })
    assert.ok(!b.ok && b.error.includes('Domain pengirim belum diverifikasi'))
    const c = await sendOne(msg, { apiKey: 're_k', fetchImpl: (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch })
    assert.ok(!c.ok && c.error.includes('Nggak bisa menghubungi'))
    const old = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY
    const d = await sendOne(msg, {})
    if (old) process.env.RESEND_API_KEY = old
    assert.ok(!d.ok && d.error.includes('RESEND_API_KEY'))
  })
  await test('kirim: 403 sandbox BUKAN dilaporkan sebagai API key ditolak (bug yang menyesatkan)', async () => {
    const mk = (status: number, body: unknown) => (async () => json(status, body)) as unknown as typeof fetch
    const r = await sendOne(msg, { apiKey: 're_k', fetchImpl: mk(403, { name: 'validation_error', message: 'You can only send testing emails to your own email address (boy@x.com). To send emails to other recipients, please verify a domain at resend.com/domains.' }) })
    assert.ok(!r.ok && r.error.includes('sandbox') && r.error.includes('email pemilik akun') && r.error.includes('HTTP 403 validation_error'))
    assert.ok(!r.ok && !r.error.includes('API key Resend ditolak'))
  })
  await test('kirim: 403 domain belum diverifikasi dan 403 key terbatas dibedakan dari 401', async () => {
    const mk = (status: number, body: unknown) => (async () => json(status, body)) as unknown as typeof fetch
    const a = await sendOne(msg, { apiKey: 're_k', fetchImpl: mk(403, { name: 'validation_error', message: 'The bikinmacro.my.id domain is not verified. Please, add and verify your domain.' }) })
    assert.ok(!a.ok && a.error.includes('Domain pengirim belum diverifikasi') && a.error.includes('HTTP 403'))
    const b = await sendOne(msg, { apiKey: 're_k', fetchImpl: mk(403, { name: 'restricted_api_key', message: 'This API key is restricted to sending emails only' }) })
    assert.ok(!b.ok && b.error.includes('nggak punya izin'))
    const c = await sendOne(msg, { apiKey: 're_k', fetchImpl: mk(401, { name: 'validation_error', message: 'API key is invalid' }) })
    assert.ok(!c.ok && c.error.includes('API key Resend ditolak') && c.error.includes('HTTP 401'))
  })
  await test('domain pengirim: diambil dari alamat pengirim', () => {
    assert.equal(senderDomain('BikinMacro <halo@BikinMacro.my.id>'), 'bikinmacro.my.id')
    assert.equal(senderDomain('halo@x.id'), 'x.id')
    assert.equal(senderDomain('tanpa-alamat'), null)
  })
  await test('cek domain: sandbox, terverifikasi, pending, belum ada, key terbatas, jaringan putus', async () => {
    const env = { RESEND_API_KEY: 're_k', EMAIL_FROM: 'BikinMacro <halo@bikinmacro.my.id>' }
    const list = (status: number, data: unknown) => (async () => json(status, data)) as unknown as typeof fetch
    assert.deepEqual(await checkSenderDomain({ RESEND_API_KEY: 're_k' }), { state: 'sandbox' })
    assert.deepEqual(await checkSenderDomain(env, list(200, { data: [{ name: 'bikinmacro.my.id', status: 'verified' }] })), { state: 'verified', domain: 'bikinmacro.my.id' })
    assert.deepEqual(await checkSenderDomain(env, list(200, { data: [{ name: 'bikinmacro.my.id', status: 'pending' }] })), { state: 'pending', domain: 'bikinmacro.my.id' })
    assert.deepEqual(await checkSenderDomain(env, list(200, { data: [{ name: 'bikinmacro.my.id', status: 'failed' }] })), { state: 'gagal', domain: 'bikinmacro.my.id' })
    assert.deepEqual(await checkSenderDomain(env, list(200, { data: [{ name: 'lain.com', status: 'verified' }] })), { state: 'tidak_ada', domain: 'bikinmacro.my.id' })
    const limited = await checkSenderDomain(env, list(401, { name: 'restricted_api_key', message: 'restricted' }))
    assert.equal(limited.state, 'tidak_bisa_dicek')
    const down = await checkSenderDomain(env, (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch)
    assert.equal(down.state, 'tidak_bisa_dicek')
  })
  await test('kirim: API key nggak pernah muncul di pesan error', async () => {
    const key = 're_SANGAT_RAHASIA_999'
    for (const status of [400, 401, 403, 422, 429, 500]) {
      const r = await sendOne(msg, { apiKey: key, retryDelayMs: 1, fetchImpl: (async () => json(status, { message: `bad ${key}`.replace(key, '***') })) as unknown as typeof fetch })
      assert.ok(!r.ok && !r.error.includes(key))
    }
  })

  console.log(`\n${passed} tes lolos`)
}
void main()
