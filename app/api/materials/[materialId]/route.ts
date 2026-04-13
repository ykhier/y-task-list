import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> },
) {
  const { materialId } = await params
  const cookieStore = await cookies()
  const supabase = createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: material } = await supabase
    .from('tutorial_materials')
    .select('id, storage_path')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single()

  if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 })

  const adminClient = createAdminClient()

  if (material.storage_path && material.storage_path !== 'pending') {
    await adminClient.storage.from('materials').remove([material.storage_path])
  }

  const { error } = await adminClient
    .from('tutorial_materials')
    .delete()
    .eq('id', materialId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
