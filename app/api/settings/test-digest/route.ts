import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDigestForUser, formatTomorrowLabel, getTomorrowIsrael } from '@/lib/email/digest-data'
import { buildDigestHtml } from '@/lib/email/digest-template'
import { sendEmail } from '@/lib/email/mailer'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (pairs) => pairs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: 'Gmail credentials not configured' }, { status: 500 })
  }

  const adminClient = createAdminClient()

  // Get full name from profiles
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  // Use profile email, fallback to auth email
  const toEmail = profile?.email ?? user.email
  if (!toEmail) return NextResponse.json({ error: 'No email address found' }, { status: 400 })

  const tomorrow = getTomorrowIsrael()
  const tomorrowLabel = formatTomorrowLabel(tomorrow)
  const { timedItems, untimedTasks } = await fetchDigestForUser(user.id, tomorrow)

  const html = buildDigestHtml({
    fullName: profile?.full_name ?? '',
    tomorrowLabel,
    timedItems,
    untimedTasks,
  })

  try {
    await sendEmail({
      to: toEmail,
      subject: `לוז למחר - ${tomorrowLabel} 📅`,
      html,
    })
    return NextResponse.json({ ok: true, sentTo: toEmail })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
