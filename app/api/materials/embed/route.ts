import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runEmbeddingPipeline } from '@/lib/materials/embedder'

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { materialId } = await req.json() as { materialId?: string }
  if (!materialId) return NextResponse.json({ error: 'materialId required' }, { status: 400 })

  const { data: material } = await supabase
    .from('tutorial_materials')
    .select('*')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single()

  if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 })

  const adminClient = createAdminClient()

  await adminClient
    .from('tutorial_materials')
    .update({ embedding_status: 'processing', embedding_error: null })
    .eq('id', materialId)

  const { data: fileData, error: downloadError } = await adminClient.storage
    .from('materials')
    .download(material.storage_path)

  if (downloadError || !fileData) {
    await adminClient
      .from('tutorial_materials')
      .update({ embedding_status: 'error', embedding_error: downloadError?.message ?? 'Download failed' })
      .eq('id', materialId)
    return NextResponse.json({ error: downloadError?.message ?? 'Download failed' }, { status: 500 })
  }

  try {
    const arrayBuffer = await fileData.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { chunksCreated } = await runEmbeddingPipeline(
      materialId,
      fileBuffer,
      { tutorialId: material.tutorial_id, userId: user.id, fileName: material.file_name, mimeType: material.mime_type },
      adminClient,
    )

    await adminClient
      .from('tutorial_materials')
      .update({ embedding_status: 'done', embedding_error: null })
      .eq('id', materialId)

    return NextResponse.json({ chunksCreated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Embedding failed'
    await adminClient
      .from('tutorial_materials')
      .update({ embedding_status: 'error', embedding_error: msg })
      .eq('id', materialId)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
