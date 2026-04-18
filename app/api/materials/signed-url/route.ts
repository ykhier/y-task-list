import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const materialId = req.nextUrl.searchParams.get('materialId')
  const fileName = req.nextUrl.searchParams.get('fileName') ?? undefined
  if (!materialId) return NextResponse.json({ error: 'materialId required' }, { status: 400 })

  const adminClient = createAdminClient()

  const { data: material } = await adminClient
    .from('tutorial_materials')
    .select('storage_path, user_id')
    .eq('id', materialId)
    .single()

  if (!material || material.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await adminClient.storage
    .from('materials')
    .createSignedUrl(material.storage_path, 60 * 5, { download: fileName ?? true })

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not create signed URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
