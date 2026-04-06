import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  // Verify admin and fetch all data in parallel
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: { user } },
    { data: { users: authUsers }, error: listError },
    { data: profiles },
  ] = await Promise.all([
    supabase.auth.getUser(),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminClient.from('profiles').select('id, full_name, is_admin'),
  ])

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentProfile = profiles?.find((p) => p.id === user.id)
  if (!currentProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (listError) return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })

  // Merge auth users (email, created_at) with profiles (full_name, is_admin)
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

  const merged = authUsers
    .filter((u) => u.email)  // skip anonymous/guest users
    .map((u) => {
      const profile = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: profile?.full_name ?? null,
        is_admin: profile?.is_admin ?? false,
        created_at: u.created_at,
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(merged)
}
