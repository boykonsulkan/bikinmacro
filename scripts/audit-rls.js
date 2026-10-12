// Audit RLS dan otorisasi di database hidup: node scripts/audit-rls.js (jalankan dari folder proyek).
// Membuat akun sementara @example.com dan menghapusnya di akhir. Setelah scripts/security_hardening.sql dijalankan, harus nol [KRITIS].
const fs = require('fs')
const BM = process.cwd()
const { createClient } = require(BM + '/node_modules/@supabase/supabase-js')
const env = Object.fromEntries(fs.readFileSync(BM + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')] }))
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const stamp = Date.now(), PASSWORD = 'Audit-RLS-2026-Aman!', made = []
const finding = (sev, name, detail) => console.log(`[${sev}] ${name}${detail ? '  -> ' + detail : ''}`)
const ok = (name) => console.log(`[OK]   ${name}`)

;(async () => {
  try {
    const mk = async (tag) => {
      const email = `audit-rls-${tag}-${stamp}@example.com`
      const c = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
      if (c.error) throw new Error(c.error.message)
      made.push(c.data.user.id)
      await admin.from('users').update({ plan: 'free', role: 'user', credits_used: 0, credits_limit: 3 }).eq('id', c.data.user.id)
      const cl = anon()
      const s = await cl.auth.signInWithPassword({ email, password: PASSWORD })
      if (s.error) throw new Error(s.error.message)
      return { id: c.data.user.id, email, db: cl }
    }
    const a = await mk('a'), b = await mk('b')
    const row = async (id) => (await admin.from('users').select('role,plan,credits_used,credits_limit').eq('id', id).single()).data

    // 1. Eskalasi hak lewat update baris sendiri
    const up = await a.db.from('users').update({ role: 'admin', plan: 'pro', credits_limit: 99999, credits_used: 0 }).eq('id', a.id).select()
    const after = await row(a.id)
    if (after.role === 'admin' || after.plan === 'pro' || after.credits_limit === 99999) finding('KRITIS', 'Pengguna biasa bisa mengubah role/plan/kuota miliknya sendiri lewat API publik', `error=${up.error?.message ?? 'tidak ada'}, hasil: ${JSON.stringify(after)}`)
    else ok('update role/plan/kuota sendiri ditolak: ' + JSON.stringify(after))

    // 2. Setelah jadi admin, apakah bisa baca semua data
    if (after.role === 'admin') {
      const all = await a.db.from('users').select('email').limit(1000)
      const pay = await a.db.from('payments').select('id').limit(5)
      finding('KRITIS', 'Akun yang naik jadi admin bisa membaca semua pengguna', `${all.data?.length ?? 0} baris users terbaca (email pengguna lain)`)
    }

    // 3. Update baris pengguna LAIN
    const other = await a.db.from('users').update({ plan: 'pro' }).eq('id', b.id).select()
    const ob = await row(b.id)
    if (ob.plan === 'pro') finding('KRITIS', 'Pengguna bisa mengubah baris pengguna lain', JSON.stringify(ob))
    else ok('tidak bisa mengubah baris pengguna lain')

    // 4. Baca baris orang lain (pakai b yang bukan admin)
    const rd = await b.db.from('users').select('email').limit(100)
    if ((rd.data?.length ?? 0) > 1) finding('TINGGI', 'Pengguna biasa bisa membaca email pengguna lain', `${rd.data.length} baris`)
    else ok('pengguna biasa hanya melihat baris sendiri')

    // 5. Tabel lain: baca sebagai anon (belum login) dan sebagai pengguna biasa (b)
    const tables = ['users', 'generations', 'generation_chats', 'payments', 'admin_settings', 'plan_settings', 'feedback', 'orders', 'order_files', 'order_messages', 'ai_rejections', 'email_logs', 'beta_invites', 'events']
    for (const t of tables) {
      const an = await anon().from(t).select('*').limit(2)
      const us = await b.db.from(t).select('*').limit(2)
      const exists = !(an.error && /does not exist|schema cache|PGRST205|42P01/.test(an.error.message + (an.error.code ?? '')))
      if (!exists) { console.log(`[--]   ${t}: tabel belum ada`); continue }
      if ((an.data?.length ?? 0) > 0) finding('TINGGI', `Tabel ${t} terbaca TANPA login (kunci anon)`, `${an.data.length}+ baris`)
      else if ((us.data?.length ?? 0) > 0 && !['plan_settings', 'admin_settings', 'users', 'generations', 'generation_chats', 'payments', 'feedback'].includes(t)) finding('TINGGI', `Tabel ${t} terbaca oleh pengguna biasa`, `${us.data.length}+ baris`)
      else ok(`${t}: anon=${an.data?.length ?? 0} baris, pengguna biasa=${us.data?.length ?? 0} baris${an.error ? ' (err: ' + an.error.message.slice(0, 40) + ')' : ''}`)
    }

    // 6. Pengaturan yang bisa dibaca pengguna biasa
    const ps = await b.db.from('plan_settings').select('plan,system_context,ai_model').limit(10)
    const withCtx = (ps.data || []).filter((r) => r.system_context)
    if (withCtx.length) finding('SEDANG', 'plan_settings (termasuk system_context, model AI) terbaca oleh semua pengguna login', `${withCtx.length} paket punya konteks`)
    else ok('plan_settings terbaca tapi system_context kosong (model AI terlihat)')
    const as = await b.db.from('admin_settings').select('*').eq('id', 1).single()
    if (as.data) finding('SEDANG', 'admin_settings terbaca oleh semua pengguna login', `kolom: ${Object.keys(as.data).join(', ')}`)

    // 7. Tulis ke tabel yang seharusnya hanya server
    const ins = await b.db.from('generations').insert({ user_id: b.id, prompt: 'x', category: 'x', output_vba: 'Shell "calc.exe"' }).select('id').single()
    if (ins.data) finding('SEDANG', 'Pengguna bisa menyisipkan generasi/kode sendiri tanpa lewat pengaman AI (tidak memotong kuota)', 'insert langsung ke generations berhasil; ekspor .xlsm tetap memindai ulang')
    const upg = ins.data ? await b.db.from('generations').update({ output_vba: 'Shell "calc.exe"' }).eq('id', ins.data.id).select() : null
    const ev = await b.db.from('events').insert({ user_id: b.id, name: 'x' })
    if (!ev.error) finding('SEDANG', 'Pengguna bisa menulis langsung ke tabel events', '')
    else ok('events tidak bisa ditulis langsung dari klien')
    const pay = await b.db.from('payments').insert({ user_id: b.id, plan: 'pro', amount: 1, status: 'paid', midtrans_id: 'x' })
    if (!pay.error) finding('KRITIS', 'Pengguna bisa memalsukan catatan pembayaran', '')
    else ok('payments tidak bisa ditulis dari klien')

    // 8. Admin hardcode di trigger: apakah email itu sudah ada di Auth
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const emails = (list.data?.users || []).map((u) => u.email)
    console.log(`[info] jumlah akun Auth: ${emails.length}; admin hardcode "boy.konsulkan@gmail.com" ${emails.includes('boy.konsulkan@gmail.com') ? 'SUDAH terdaftar' : 'BELUM terdaftar di Auth'}`)
    const adminsNow = await admin.from('users').select('email,role').eq('role', 'admin')
    console.log('[info] daftar admin saat ini:', (adminsNow.data || []).map((r) => r.email).join(', '))

    // 9. Pendaftaran terbuka? Apakah email perlu konfirmasi
    const su = await anon().auth.signUp({ email: `audit-rls-signup-${stamp}@example.com`, password: PASSWORD })
    if (su.data?.user?.id) made.push(su.data.user.id)
    if (su.error) console.log('[info] signup publik ditolak:', su.error.message)
    else if (su.data?.session) finding('SEDANG', 'Pendaftaran publik TANPA konfirmasi email: siapa pun (termasuk email palsu) langsung dapat sesi', 'bisa dipakai untuk menguras kuota gratis (3 macro per akun) dan mendaftar dengan email milik orang lain')
    else ok('signup butuh konfirmasi email (tidak ada sesi langsung)')

    // 10. Storage
    const bk = await admin.storage.listBuckets()
    for (const bu of bk.data || []) console.log(`[info] bucket "${bu.name}" public=${bu.public}`)
    if ((bk.data || []).some((x) => x.public)) finding('TINGGI', 'Ada bucket storage PUBLIK', (bk.data || []).filter((x) => x.public).map((x) => x.name).join(', '))
  } catch (e) {
    console.log('GALAT:', e.message)
  } finally {
    for (const id of made) { await admin.from('generations').delete().eq('user_id', id); await admin.auth.admin.deleteUser(id).catch(() => {}) }
    const left = await admin.from('users').select('id').like('email', `audit-rls-%${stamp}@example.com`)
    console.log(`\nAkun uji tersisa: ${left.data ? left.data.length : '?'}`)
  }
})()
