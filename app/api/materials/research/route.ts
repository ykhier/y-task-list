import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { streamResearchAgent } from '@/lib/materials/research-agent'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { tutorialId, topic } = await req.json() as { tutorialId?: string; topic?: string }
  if (!tutorialId || !topic) {
    return new Response(JSON.stringify({ error: 'tutorialId and topic required' }), { status: 400 })
  }

  // Check ownership: try tutorials table first, then sessions (for regular calendar events)
  const { data: tutorialRow } = await supabase
    .from('tutorials')
    .select('id, title')
    .eq('id', tutorialId)
    .eq('user_id', user.id)
    .single()

  const { data: sessionRow } = tutorialRow ? { data: null } : await supabase
    .from('sessions')
    .select('id, title')
    .eq('id', tutorialId)
    .eq('user_id', user.id)
    .single()

  if (!tutorialRow && !sessionRow) {
    return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 })
  }

  // Fetch up to 8 document chunks for context
  const { data: chunks } = await supabase
    .from('material_chunks')
    .select('content')
    .eq('tutorial_id', tutorialId)
    .order('chunk_index', { ascending: true })
    .limit(8)

  const docContext = chunks && chunks.length > 0
    ? chunks.map((c: { content: string }) => c.content).join('\n\n')
    : null

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of streamResearchAgent(topic, user.email ?? user.id, docContext)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        if (event.type === 'done' || event.type === 'error') break
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
