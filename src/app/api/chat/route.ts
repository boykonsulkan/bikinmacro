import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

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
    return openrouter(model || 'anthropic/claude-3-5-sonnet')
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

    // Fetch conversation history for this generation
    const { data: history } = await supabase
      .from('generation_chats')
      .select('role, content')
      .eq('generation_id', generation_id)
      .order('created_at', { ascending: true })

    const contextSection = settings?.system_context
      ? `\n\nKonteks tambahan dari admin:\n${settings.system_context}`
      : ''

    const systemPrompt = `Kamu adalah expert programmer VBA untuk Microsoft Excel yang sedang merevisi macro yang sudah ada.
User akan meminta perubahan spesifik, dan kamu harus memberikan KODE VBA LENGKAP yang sudah diperbarui.${contextSection}

Kode VBA yang sedang direvisi:
\`\`\`vba
${generation.output_vba}
\`\`\`

PENTING:
- Baris pertama respons HARUS dimulai dengan "PERUBAHAN: " diikuti deskripsi singkat perubahan (bahasa Indonesia, maks 1 kalimat)
- Setelah baris pertama, output HANYA kode VBA saja (seluruh kode yang sudah diperbarui, bukan hanya bagian yang berubah)
- Tambahkan error handling dan komentar dalam kode
- Jangan gunakan library eksternal`

    const messages = [
      ...(history || []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message.trim() }
    ]

    const aiProvider = settings?.ai_provider || getFallbackProvider()
    const aiModel = settings?.ai_model || ''

    const { text } = await generateText({
      model: getAiModel(aiProvider, aiModel),
      system: systemPrompt,
      messages,
      temperature: 0.2,
    })

    // Parse: first line is the description, rest is VBA code
    const lines = text.split('\n')
    let changeDescription = 'Kode berhasil diperbarui'
    let codeLines = lines

    if (lines[0].startsWith('PERUBAHAN:')) {
      changeDescription = lines[0].replace('PERUBAHAN:', '').trim()
      codeLines = lines.slice(1)
    }

    let vbaCode = codeLines.join('\n')
    if (vbaCode.includes('```vba')) {
      vbaCode = vbaCode.replace(/```vba\n?/, '').replace(/```[\s]*$/, '')
    } else if (vbaCode.includes('```')) {
      vbaCode = vbaCode.replace(/```\n?/, '').replace(/```[\s]*$/, '')
    }
    vbaCode = vbaCode.trim()

    // Save user message + assistant description to chat history
    await supabase.from('generation_chats').insert([
      { generation_id, user_id: user.id, role: 'user', content: message.trim() },
      { generation_id, user_id: user.id, role: 'assistant', content: changeDescription }
    ])

    // Update generation with latest code
    await supabase.from('generations').update({ output_vba: vbaCode }).eq('id', generation_id)

    return NextResponse.json({
      vba_code: vbaCode,
      message: changeDescription,
      chats_used: (chatCount ?? 0) + 1,
      chats_max: maxChat
    })

  } catch (error: any) {
    console.error('Error in /api/chat:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
