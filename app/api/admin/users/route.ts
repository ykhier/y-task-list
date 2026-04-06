import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options)
      })
    },
  })
  const adminClient = createAdminClient()

  const [
    {
      data: { user },
    },
    { data: { users: authUsers }, error: listError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminClient.from('profiles').select('id, full_name, is_admin'),
  ])

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profilesError) {
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  const currentProfile = profiles?.find((profile) => profile.id === user.id)
  if (!currentProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (listError) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const profileMap = new Map(profiles?.map((profile) => [profile.id, profile]) ?? [])
  const users = authUsers
    .filter((authUser) => authUser.email)
    .map((authUser) => {
      const profile = profileMap.get(authUser.id)

      return {
        id: authUser.id,
        email: authUser.email ?? null,
        full_name: profile?.full_name ?? null,
        is_admin: profile?.is_admin ?? false,
        created_at: authUser.created_at,
      }
    })
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )

  return NextResponse.json(users)
}
