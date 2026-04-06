import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchDigestForUser,
  formatTomorrowLabel,
  getTomorrowIsrael,
} from '@/lib/email/digest-data'
import { buildDigestHtml } from '@/lib/email/digest-template'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
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

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0

  await Promise.allSettled(
    profiles.map(async (profile) => {
      const { timedItems, untimedTasks } = await fetchDigestForUser(profile.id, tomorrow)

      const html = buildDigestHtml({
        fullName: profile.full_name ?? '',
        tomorrowLabel,
        timedItems,
        untimedTasks,
      })

      await resend.emails.send({
        from: 'WeekFlow <onboarding@resend.dev>',
        to: profile.email!,
        subject: `לוז למחר - ${tomorrowLabel} 📅`,
        html,
      })

      sent++
    }),
  )

  return NextResponse.json({ ok: true, sent })
}
