import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSummarizeChain } from '@/lib/materials/rag-chain'

export const maxDuration = 120

function sseStream(
  generator: () => AsyncGenerator<string>,
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'שגיאה'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`))
      } finally {
        controller.close()
      }
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

function formatFullContext(
  chunks: Array<{
    content: string
    metadata: Record<string, unknown> | null
    material_id: string
    chunk_index: number
  }>,
): string {
  return chunks.map((chunk, index) => {
    const fileName = typeof chunk.metadata?.fileName === 'string'
      ? chunk.metadata.fileName
      : `קובץ ${chunk.material_id}`

    return [
      `### מקור ${index + 1}`,
      `קובץ: ${fileName}`,
      `מזהה חומר: ${chunk.material_id}`,
      `אינדקס מקטע: ${chunk.chunk_index}`,
      chunk.content,
    ].join('\n')
  }).join('\n\n')
}

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

  const { tutorialId } = await req.json() as { tutorialId?: string }
  if (!tutorialId) {
    return new Response(JSON.stringify({ error: 'tutorialId required' }), { status: 400 })
  }

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

  const item = tutorialRow ?? sessionRow
  if (!item) {
    return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 })
  }

  const adminClient = createAdminClient()
  const { data: chunks, error: chunksError } = await adminClient
    .from('material_chunks')
    .select('content, metadata, material_id, chunk_index')
    .eq('tutorial_id', tutorialId)
    .order('material_id', { ascending: true })
    .order('chunk_index', { ascending: true })

  if (chunksError) {
    return new Response(JSON.stringify({ error: chunksError.message }), { status: 500 })
  }

  if (!chunks || chunks.length === 0) {
    return new Response(JSON.stringify({ error: 'No material chunks found' }), { status: 400 })
  }

  const context = formatFullContext(chunks)
  const chain = buildSummarizeChain()

  return sseStream(async function* () {
    const streamResult = await chain.stream(
      { title: item.title, context },
      {
        metadata: { user: user.email ?? user.id, tutorialId, title: item.title },
        runName: 'summarize-materials-full-context',
      },
    )

    for await (const chunk of streamResult) {
      if (typeof chunk === 'string' && chunk) {
        yield chunk
      }
    }
  })
}
