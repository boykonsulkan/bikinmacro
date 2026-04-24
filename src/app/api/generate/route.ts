import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

// Provider configuration - easily swappable based on ENV vars
const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic' // 'anthropic', 'openai', 'openrouter', 'google'

function getAiModel() {
  if (AI_PROVIDER === 'openai') {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return openai('gpt-4o-mini')
  }
  if (AI_PROVIDER === 'openrouter') {
    const openrouter = createOpenAI({ 
      apiKey: process.env.OPENROUTER_API_KEY, 
      baseURL: 'https://openrouter.ai/api/v1' 
    })
    return openrouter('anthropic/claude-3-5-sonnet') // example
  }
  
  // Default Anthropic
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return anthropic('claude-3-5-sonnet-20240620')
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

    // Preliminary Filter (Checking if prompt is related to Excel/VBA)
    const filterKeywords = ['excel', 'vba', 'macro', 'kolom', 'baris', 'sheet', 'tabel', 'sel', 'row', 'column']
    const isRelated = filterKeywords.some(kw => prompt.toLowerCase().includes(kw))
    
    // Additional LLM-based filter can be done here, but keyword check is faster.
    // If strict checking is required, we can ask the LLM if it's an Excel task.
    // For now, we proceed to generation, but instruct the LLM to reject non-Excel tasks.

    // 1. Quota Check
    const { data: profile } = await supabase
      .from('users')
      .select('credits_used, credits_limit')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (profile.credits_used >= profile.credits_limit) {
      return NextResponse.json({ error: 'Quota exhausted' }, { status: 402 })
    }

    // 2. Call AI Provider
    const systemPrompt = `Kamu adalah expert programmer VBA untuk Microsoft Excel. Tugasmu adalah membuat macro VBA yang bersih, efisien, dan siap pakai. 
    Output HANYA kode VBA saja, tidak ada penjelasan di luar kode. 
    Gunakan komentar dalam kode (bahasa Indonesia). Tambahkan error handling. 
    Kode harus langsung bisa di-paste ke Excel VBA Editor. Jangan gunakan library eksternal.
    
    PENTING: Jika permintaan user BUKAN tentang Excel, VBA, atau Macro, TOLAK permintaan tersebut dengan memberikan komentar VBA seperti ini:
    ' ERROR: Maaf, saya hanya bisa membantu membuat macro Excel VBA.
    `

    const userPrompt = `Buatkan macro Excel VBA untuk: ${prompt}. Pastikan macro aman dijalankan, punya konfirmasi sebelum aksi destruktif, dan berjalan di Excel 2016 ke atas.`

    const { text } = await generateText({
      model: getAiModel(),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    })

    // Clean up if the model wrapped it in markdown code blocks
    let vbaCode = text
    if (vbaCode.startsWith('```vba')) {
      vbaCode = vbaCode.replace(/```vba\n?/, '')
      vbaCode = vbaCode.replace(/```$/, '')
    } else if (vbaCode.startsWith('```')) {
      vbaCode = vbaCode.replace(/```\n?/, '')
      vbaCode = vbaCode.replace(/```$/, '')
    }

    // 3. Update Quota & Save Generation
    await supabase.rpc('increment_credits', { user_id: user.id })
    // If you don't have an RPC, do a standard update:
    // const newCredits = profile.credits_used + 1
    // await supabase.from('users').update({ credits_used: newCredits }).eq('id', user.id)
    
    // We will do standard update to avoid requiring RPC creation in DB
    await supabase.from('users').update({ credits_used: profile.credits_used + 1 }).eq('id', user.id)

    await supabase.from('generations').insert({
      user_id: user.id,
      prompt: prompt,
      category: category,
      output_vba: vbaCode.trim()
    })

    return NextResponse.json({ vba_code: vbaCode.trim() })

  } catch (error: any) {
    console.error('Error in /api/generate:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
