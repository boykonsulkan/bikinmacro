import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { AI_LIMITS, EXPLAIN_PREFIX, REJECTION_MESSAGES, extractExplanation, extractVba, looksLikeExplainRequest, scanVba, trimHistory } from '@/lib/ai/guard'
import { buildChatSystem, buildChatUser } from '@/lib/ai/prompts'
import { trackEvent } from '@/lib/events/server'
import { checkAbuse, logRejection } from '@/lib/ai/server'
import { serviceClient } from '@/lib/orders/server'

// Model cadangan kalau model utama gagal. Model ":free" lama (deepseek-chat:free, gemini-2.0-flash-exp:free)
// sudah dicabut OpenRouter. Cek tersedianya lewat https://openrouter.ai/api/v1/models.
const OPENROUTER_FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
]

function getAiModel(provider: string, model: string) {
  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return openai(model || 'gpt-4o-mini')
  }
  if (provider === 'openrouter') {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1'
    })
    return openrouter(model || OPENROUTER_FALLBACK_MODELS[0])
  }
  if (provider === 'gemini') {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
    return google(model || 'gemini-3.5-flash-lite')
  }
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return anthropic((model || 'claude-3-5-sonnet-20240620') as Parameters<ReturnType<typeof createAnthropic>>[0])
}


function getFallbackProvider(): string {
  return process.env.AI_PROVIDER ||
    (process.env.OPENROUTER_API_KEY ? 'openrouter' :
     process.env.OPENAI_API_KEY ? 'openai' : 'anthropic')
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { generation_id, message } = await req.json()
    if (!generation_id || !message?.trim()) {
      return NextResponse.json({ error: 'generation_id and message are required' }, { status: 400 })
    }
    if (typeof message !== 'string' || message.length > AI_LIMITS.chatMessageMax) {
      return NextResponse.json({ error: `Pesan terlalu panjang (maksimal ${AI_LIMITS.chatMessageMax} karakter).` }, { status: 400 })
    }

    // Verify ownership and get current code
    const { data: generation } = await supabase
      .from('generations')
      .select('id, user_id, output_vba')
      .eq('id', generation_id)
      .single()

    if (!generation || generation.user_id !== user.id) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    // Fetch user profile to get the plan
    const { data: profile } = await supabase.from('users').select('role, plan').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    // Fetch settings for the user's plan
    const { data: settings } = await supabase
      .from('plan_settings')
      .select('ai_provider, ai_model, system_context, max_chat_per_generation')
      .eq('plan', profile?.plan || 'free')
      .single()

    // Calculate max chats based on plan settings
    const maxChat = settings?.max_chat_per_generation ?? 10

    // Count how many user messages exist for this generation
    const { count: chatCount } = await supabase
      .from('generation_chats')
      .select('*', { count: 'exact', head: true })
      .eq('generation_id', generation_id)
      .eq('user_id', user.id)
      .eq('role', 'user')

    if (!isAdmin && (chatCount ?? 0) >= maxChat) {
      return NextResponse.json({ error: 'Chat limit reached' }, { status: 402 })
    }

    // Penjelasan kode yang sudah dijawab untuk macro ini (jawaban asisten yang diawali "PENJELASAN:").
    // Setelah batasnya habis, pertanyaan penjelasan nggak dijawab lagi (admin dikecualikan).
    const { count: explainCount } = await supabase
      .from('generation_chats')
      .select('*', { count: 'exact', head: true })
      .eq('generation_id', generation_id)
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .like('content', `${EXPLAIN_PREFIX}%`)
    const explainUsed = explainCount ?? 0
    const explainLocked = !isAdmin && explainUsed >= AI_LIMITS.explainMax
    if (explainLocked && looksLikeExplainRequest(message)) {
      await trackEvent(user.id, 'explain_limit')
      return NextResponse.json({ error: REJECTION_MESSAGES.explain_limit, code: 'explain_limit' }, { status: 422 })
    }

    // Pengaman penyalahgunaan: ditahan kalau sering ditolak, plus batas per menit dan per hari.
    if (!isAdmin) {
      const abuse = await checkAbuse(user.id)
      if (!abuse.ok) return NextResponse.json({ error: abuse.error }, { status: abuse.status })
    }

    // Fetch conversation history for this generation
    const { data: history } = await supabase
      .from('generation_chats')
      .select('role, content')
      .eq('generation_id', generation_id)
      .order('created_at', { ascending: true })

    const contextSection = settings?.system_context
      ? `\n\nKonteks tambahan dari admin:\n${settings.system_context}`
      : ''

    const systemPrompt = buildChatSystem(generation.output_vba, contextSection)

    const messages = [
      ...trimHistory(history || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.role === 'user' ? buildChatUser(m.content) : m.content
      })),
      { role: 'user' as const, content: buildChatUser(message.trim()) }
    ]

    const aiProvider = settings?.ai_provider || getFallbackProvider()
    const aiModel = settings?.ai_model || ''

    let chatResult
    try {
      chatResult = await generateText({ model: getAiModel(aiProvider, aiModel), system: systemPrompt, messages, temperature: 0.2, maxOutputTokens: AI_LIMITS.maxOutputTokens })
    } catch (err: any) {
      const errStr = JSON.stringify({ m: err?.message, b: err?.responseBody, c: err?.cause?.message })
      const shouldFallback = (aiProvider === 'openrouter' || (aiProvider === 'gemini' && !!process.env.OPENROUTER_API_KEY)) && (
        errStr.includes('No endpoints found') ||
        errStr.includes('unavailable') ||
        errStr.includes('404') ||
        errStr.includes('Provider returned error') ||
        errStr.includes('rate limit') ||
        errStr.includes('overloaded') ||
        errStr.includes('429') ||
        errStr.includes('503') ||
        errStr.includes('quota') ||
        errStr.includes('high demand') ||
        errStr.includes('no longer available')
      )
      if (shouldFallback) {
        let lastErr = err
        for (const fallback of OPENROUTER_FALLBACK_MODELS) {
          try {
            console.warn(`Model ${aiModel} failed, trying fallback: ${fallback}`)
            chatResult = await generateText({ model: getAiModel('openrouter', fallback), system: systemPrompt, messages, temperature: 0.2, maxOutputTokens: AI_LIMITS.maxOutputTokens })
            break
          } catch (e: any) {
            lastErr = e
          }
        }
        if (!chatResult) throw lastErr
      } else throw err
    }
    const text = chatResult.text

    // Jalur keluar dikunci: cuma revisi VBA valid yang boleh menimpa macro. Penolakan, terjemahan, kode bahasa lain,
    // dan perintah berbahaya nggak disimpan, nggak menimpa kode, dan nggak memakai jatah chat.
    if (/^\s*TOLAK:/i.test(text)) {
      await logRejection(user.id, 'chat', 'refusal', String(message))
      return NextResponse.json({ error: REJECTION_MESSAGES.refusal, code: 'refusal' }, { status: 422 })
    }

    // Jalur penjelasan: kode nggak berubah, jawabannya cuma teks pendek tentang macro ini.
    if (/^\s*PENJELASAN:/i.test(text)) {
      if (explainLocked) {
        await trackEvent(user.id, 'explain_limit')
        return NextResponse.json({ error: REJECTION_MESSAGES.explain_limit, code: 'explain_limit' }, { status: 422 })
      }
      const explained = extractExplanation(text)
      if (!explained.ok) {
        await logRejection(user.id, 'chat', explained.reason === 'not_explanation' ? 'not_vba' : explained.reason, String(message))
        return NextResponse.json(
          { error: 'Penjelasannya nggak bisa ditampilkan. Coba tanya lebih spesifik tentang satu bagian kode.', code: 'explain_invalid' },
          { status: 422 },
        )
      }
      await serviceClient().from('generation_chats').insert([
        { generation_id, user_id: user.id, role: 'user', content: message.trim() },
        { generation_id, user_id: user.id, role: 'assistant', content: `${EXPLAIN_PREFIX} ${explained.text}` },
      ])
      await trackEvent(user.id, 'explain_success', { n: explainUsed + 1 })
      return NextResponse.json({
        kind: 'explain',
        message: explained.text,
        chats_used: (chatCount ?? 0) + 1,
        chats_max: maxChat,
        explain_used: explainUsed + 1,
        explain_max: AI_LIMITS.explainMax,
      })
    }

    // Baris pertama: "PERUBAHAN: ..." (deskripsi). Sisanya kode.
    const lines = text.trim().split('\n')
    let changeDescription = 'Kode berhasil diperbarui'
    let body = text
    if (lines[0].startsWith('PERUBAHAN:')) {
      changeDescription = lines[0].replace('PERUBAHAN:', '').trim().slice(0, 300) || changeDescription
      body = lines.slice(1).join('\n')
    }

    const extracted = extractVba(body)
    if (!extracted.ok) {
      await logRejection(user.id, 'chat', extracted.reason, String(message))
      return NextResponse.json({ error: REJECTION_MESSAGES[extracted.reason], code: extracted.reason }, { status: 422 })
    }
    const scan = scanVba(extracted.code)
    if (scan.blocked.length > 0) {
      await logRejection(user.id, 'chat', 'unsafe', String(message), scan.blocked.join('; '))
      return NextResponse.json({ error: REJECTION_MESSAGES.unsafe, code: 'unsafe', detail: scan.blocked }, { status: 422 })
    }
    const vbaCode = extracted.code

    // Save user message + assistant description to chat history
    await serviceClient().from('generation_chats').insert([
      { generation_id, user_id: user.id, role: 'user', content: message.trim() },
      { generation_id, user_id: user.id, role: 'assistant', content: changeDescription }
    ])

    // Update generation with latest code
    await serviceClient().from('generations').update({ output_vba: vbaCode }).eq('id', generation_id).eq('user_id', user.id)
    await trackEvent(user.id, 'chat_success', { n: (chatCount ?? 0) + 1 })

    return NextResponse.json({
      kind: 'change',
      explain_used: explainUsed,
      explain_max: AI_LIMITS.explainMax,
      vba_code: vbaCode,
      warnings: scan.warnings,
      message: changeDescription,
      chats_used: (chatCount ?? 0) + 1,
      chats_max: maxChat
    })

  } catch (error: any) {
    console.error('Error in /api/chat:', error)
    return NextResponse.json({ error: 'Gagal memproses permintaan. Coba lagi sebentar lagi.' }, { status: 500 })
  }
}
