import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return { user, adminClient }
}

export async function GET() {
  const auth = await verifyAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: users } = await auth.adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json(users ?? [])
}
