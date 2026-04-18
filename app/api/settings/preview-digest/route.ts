import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDigestForUser, formatTomorrowLabel, getTomorrowIsrael } from '@/lib/email/digest-data'
import { buildDigestHtml } from '@/lib/email/digest-template'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (pairs) => pairs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const tomorrow = getTomorrowIsrael()
  const tomorrowLabel = formatTomorrowLabel(tomorrow)
  const { timedItems, untimedTasks } = await fetchDigestForUser(user.id, tomorrow)

  const html = buildDigestHtml({
    fullName: profile?.full_name ?? '',
    tomorrowLabel,
    timedItems,
    untimedTasks,
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
