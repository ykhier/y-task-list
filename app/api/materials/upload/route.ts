import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateFile, buildStoragePath } from '@/lib/materials/materials-utils'
import { runEmbeddingPipeline } from '@/lib/materials/embedder'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log('[upload] step 1: auth')
    const cookieStore = await cookies()
    const supabase = createClient({
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[upload] auth error:', authError.message)
      return NextResponse.json({ error: 'Auth error' }, { status: 401 })
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    console.log('[upload] step 2: parse form')
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      console.error('[upload] formData parse error:', e)
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const tutorialId = formData.get('tutorialId') as string | null
    const file = formData.get('file') as File | null
    if (!tutorialId || !file) {
      return NextResponse.json({ error: 'tutorialId and file are required' }, { status: 400 })
    }

    console.log('[upload] step 3: validate file', file.name, file.type, file.size)
    const validationError = validateFile(file)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    console.log('[upload] step 4: verify tutorial ownership')
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id')
      .eq('id', tutorialId)
      .eq('user_id', user.id)
      .single()
    if (tutorialError) console.error('[upload] tutorial lookup error:', tutorialError.message)
    if (!tutorial) return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 })

    console.log('[upload] step 5: create admin client')
    const adminClient = createAdminClient()

    console.log('[upload] step 6: insert material row')
    const { data: material, error: insertError } = await adminClient
      .from('tutorial_materials')
      .insert({
        user_id: user.id,
        tutorial_id: tutorialId,
        file_name: file.name,
        storage_path: 'pending',
        file_size_bytes: file.size,
        mime_type: file.type || 'application/pdf',
        embedding_status: 'pending',
      })
      .select()
      .single()

    if (insertError || !material) {
      console.error('[upload] insert failed:', insertError)
      return NextResponse.json({ error: `DB insert failed: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
    }

    console.log('[upload] step 7: read file buffer')
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const storagePath = buildStoragePath(user.id, tutorialId, material.id)
    console.log('[upload] step 8: upload to storage', storagePath)

    const { error: storageError } = await adminClient.storage
      .from('materials')
      .upload(storagePath, fileBuffer, { contentType: file.type || 'application/pdf', upsert: false })

    if (storageError) {
      console.error('[upload] storage error:', storageError)
      await adminClient.from('tutorial_materials').delete().eq('id', material.id)
      return NextResponse.json({ error: `Storage error: ${storageError.message}` }, { status: 500 })
    }

    await adminClient
      .from('tutorial_materials')
      .update({ storage_path: storagePath, embedding_status: 'processing' })
      .eq('id', material.id)

    // Return immediately — embedding runs in the background after response is sent
    const materialId = material.id
    after(async () => {
      console.log('[upload] background: run embedding pipeline')
      try {
        const { chunksCreated } = await runEmbeddingPipeline(
          materialId,
          fileBuffer,
          { tutorialId, userId: user.id, fileName: file.name, mimeType: file.type },
          adminClient,
        )
        await adminClient
          .from('tutorial_materials')
          .update({ embedding_status: 'done' })
          .eq('id', materialId)
        console.log('[upload] background: done, chunks created:', chunksCreated)
      } catch (embErr) {
        const msg = embErr instanceof Error ? embErr.message : 'Embedding failed'
        console.error('[upload] background: embedding error:', embErr)
        await adminClient
          .from('tutorial_materials')
          .update({ embedding_status: 'error', embedding_error: msg })
          .eq('id', materialId)
      }
    })

    console.log('[upload] returning early, embedding running in background')
    return NextResponse.json({
      materialId: material.id,
      fileName: file.name,
      embeddingStatus: 'processing',
    })
  } catch (err) {
    console.error('[upload] unhandled exception:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected server error' }, { status: 500 })
  }
}
