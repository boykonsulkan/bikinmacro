import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { AI_LIMITS, REJECTION_MESSAGES, extractVba, scanVba } from '@/lib/ai/guard'
import { buildGenerateSystem, buildGenerateUser } from '@/lib/ai/prompts'
import { checkAbuse, logRejection } from '@/lib/ai/server'

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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, category } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    if (typeof prompt !== 'string' || prompt.length > AI_LIMITS.promptMax) {
      return NextResponse.json({ error: `Permintaan terlalu panjang (maksimal ${AI_LIMITS.promptMax} karakter).` }, { status: 400 })
    }

    // Quota check
    const { data: profile } = await supabase
      .from('users')
      .select('credits_used, credits_limit, role, plan')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Fetch settings for the user's plan
    const { data: settings } = await supabase
      .from('plan_settings')
      .select('ai_provider, ai_model, system_context, credits_limit, max_chat_per_generation')
      .eq('plan', profile.plan || 'free')
      .single()

    const aiProvider = settings?.ai_provider || getFallbackProvider()
    const aiModel = settings?.ai_model || ''
    const systemContext = settings?.system_context || ''

    const isAdmin = profile.role === 'admin'
    if (!isAdmin && profile.credits_used >= (settings?.credits_limit ?? profile.credits_limit)) {
      return NextResponse.json({ error: 'Quota exhausted' }, { status: 402 })
    }

    // Pengaman penyalahgunaan: ditahan kalau sering ditolak, plus batas per menit dan per hari.
    if (!isAdmin) {
      const abuse = await checkAbuse(user.id)
      if (!abuse.ok) return NextResponse.json({ error: abuse.error }, { status: abuse.status })
    }

    // Build system prompt with optional admin context
    const contextSection = systemContext
      ? `\n\nKonteks tambahan dari admin:\n${systemContext}`
      : ''

    const systemPrompt = buildGenerateSystem(contextSection)
    const userPrompt = buildGenerateUser(prompt)

    let genResult
    try {
      genResult = await generateText({ model: getAiModel(aiProvider, aiModel), system: systemPrompt, prompt: userPrompt, temperature: 0.2, maxOutputTokens: AI_LIMITS.maxOutputTokens })
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
            genResult = await generateText({ model: getAiModel('openrouter', fallback), system: systemPrompt, prompt: userPrompt, temperature: 0.2, maxOutputTokens: AI_LIMITS.maxOutputTokens })
            break
          } catch (e: any) {
            lastErr = e
          }
        }
        if (!genResult) throw lastErr
      } else throw err
    }
    // Jalur keluar dikunci: cuma VBA valid yang boleh lanjut. Selain itu (penolakan, terjemahan, kode bahasa lain,
    // perintah berbahaya) nggak disimpan dan NGGAK memotong kredit.
    const extracted = extractVba(genResult.text)
    if (!extracted.ok) {
      await logRejection(user.id, 'generate', extracted.reason, prompt)
      return NextResponse.json({ error: REJECTION_MESSAGES[extracted.reason], code: extracted.reason }, { status: 422 })
    }
    const scan = scanVba(extracted.code)
    if (scan.blocked.length > 0) {
      await logRejection(user.id, 'generate', 'unsafe', prompt, scan.blocked.join('; '))
      return NextResponse.json({ error: REJECTION_MESSAGES.unsafe, code: 'unsafe', detail: scan.blocked }, { status: 422 })
    }
    const vbaCode = extracted.code

    // Update quota (skip for admins)
    if (!isAdmin) {
      await supabase.from('users').update({ credits_used: profile.credits_used + 1 }).eq('id', user.id)
    }

    // Save generation and return its id for chat
    const { data: inserted } = await supabase
      .from('generations')
      .insert({ user_id: user.id, prompt, category, output_vba: vbaCode })
      .select('id')
      .single()

    // Calculate max chats based on plan settings
    const maxChat = settings?.max_chat_per_generation ?? 10

    return NextResponse.json({
      vba_code: vbaCode,
      warnings: scan.warnings,
      generation_id: inserted?.id,
      max_chat_per_generation: maxChat
    })

  } catch (error: any) {
    console.error('Error in /api/generate:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
