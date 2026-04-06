import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchDigestForUser,
  formatTomorrowLabel,
  getTomorrowIsrael,
} from '@/lib/email/digest-data'
import { buildDigestHtml } from '@/lib/email/digest-template'
import { sendEmail } from '@/lib/email/mailer'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: 'Gmail credentials not configured' }, { status: 500 })
  }

  const adminClient = createAdminClient()
  const tomorrow = getTomorrowIsrael()
  const tomorrowLabel = formatTomorrowLabel(tomorrow)

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('digest_enabled', true)

  if (!profiles?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  const debugLog: object[] = []

  await Promise.allSettled(
    profiles.map(async (profile) => {
      const { timedItems, untimedTasks } = await fetchDigestForUser(profile.id, tomorrow)

      debugLog.push({ email: profile.email, tomorrow, timedItems, untimedTasks })

      const html = buildDigestHtml({
        fullName: profile.full_name ?? '',
        tomorrowLabel,
        timedItems,
        untimedTasks,
      })

      await sendEmail({
        to: profile.email!,
        subject: `לוז למחר - ${tomorrowLabel} 📅`,
        html,
      })

      sent++
    }),
  )

  return NextResponse.json({ ok: true, sent, debug: debugLog })
}
