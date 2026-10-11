// Cek model AI yang dipakai tiap paket: baca plan_settings dari database, lalu uji tiap model
// dengan satu permintaan kecil (biayanya jauh di bawah satu sen). Key nggak pernah dicetak.
//
// Pakai:  node scripts/check-ai.js
// Butuh .env.local berisi NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan key AI yang dipakai.

const fs = require('fs')
const path = require('path')

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]
    }),
)

const PROMPT = 'Balas satu kata: halo'

async function testModel(provider, model) {
  try {
    if (provider === 'openrouter') {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: PROMPT }] }),
      })
      const j = await r.json().catch(() => ({}))
      return j.choices?.[0]?.message?.content ? { ok: true } : { ok: false, why: `HTTP ${r.status}: ${j.error?.message || '?'}` }
    }
    if (provider === 'gemini') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GOOGLE_GENERATIVE_AI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }], generationConfig: { maxOutputTokens: 50 } }),
      })
      const j = await r.json().catch(() => ({}))
      return j.candidates?.[0]?.content?.parts?.length ? { ok: true } : { ok: false, why: `HTTP ${r.status}: ${j.error?.message || '?'}` }
    }
    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_completion_tokens: 8, messages: [{ role: 'user', content: PROMPT }] }),
      })
      const j = await r.json().catch(() => ({}))
      return j.choices?.[0]?.message?.content ? { ok: true } : { ok: false, why: `HTTP ${r.status}: ${j.error?.message || '?'}` }
    }
    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: PROMPT }] }),
      })
      const j = await r.json().catch(() => ({}))
      return j.content?.[0]?.text ? { ok: true } : { ok: false, why: `HTTP ${r.status}: ${j.error?.message || '?'}` }
    }
    return { ok: false, why: `provider "${provider}" nggak dikenal` }
  } catch (e) {
    return { ok: false, why: `jaringan: ${e.message}` }
  }
}

;(async () => {
  const { createClient } = require('@supabase/supabase-js')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: plans, error } = await db.from('plan_settings').select('plan, ai_provider, ai_model')
  if (error) throw new Error('Gagal baca plan_settings: ' + error.message)

  const combos = new Map()
  for (const p of plans) {
    const k = `${p.ai_provider}|${p.ai_model}`
    if (!combos.has(k)) combos.set(k, [])
    combos.get(k).push(p.plan)
  }

  console.log('Paket dan model yang dipakai:\n')
  let bad = 0
  for (const [k, usedBy] of combos) {
    const [provider, model] = k.split('|')
    const r = await testModel(provider, model)
    if (!r.ok) bad++
    console.log(`${r.ok ? 'OK    ' : 'MATI  '} ${provider}/${model}  <- paket: ${usedBy.join(', ')}${r.ok ? '' : '\n        ' + r.why}`)
  }
  console.log(bad ? `\n${bad} model bermasalah. Ganti di /north/settings (per paket).` : '\nSemua model yang dipakai paket berfungsi.')
  process.exitCode = bad ? 1 : 0
})().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})
