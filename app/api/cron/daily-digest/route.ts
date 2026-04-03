import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// Israel time = UTC+3 (simplified; doesn't handle DST)
const ISRAEL_OFFSET = 3

function getTomorrowIsrael(): string {
  const now = new Date()
  const israelNow = new Date(now.getTime() + ISRAEL_OFFSET * 60 * 60 * 1000)
  israelNow.setUTCDate(israelNow.getUTCDate() + 1)
  return israelNow.toISOString().slice(0, 10) // YYYY-MM-DD
}

function getIsraelHour(): number {
  const now = new Date()
  return (now.getUTCHours() + ISRAEL_OFFSET) % 24
}

function formatTime(t: string) {
  return t?.slice(0, 5) ?? ''
}

function buildEmailHtml({
  fullName,
  tomorrowLabel,
  events,
  tasks,
}: {
  fullName: string
  tomorrowLabel: string
  events: { title: string; start_time: string; end_time: string; source: string }[]
  tasks: { title: string; time: string | null; is_completed: boolean }[]
}) {
  const pendingTasks = tasks.filter((t) => !t.is_completed)
  const timedEvents = events.filter((e) => e.source !== 'task')

  const eventRows = timedEvents.length
    ? timedEvents
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map(
          (e) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 110px; white-space: nowrap;">
            ${formatTime(e.start_time)} – ${formatTime(e.end_time)}
          </td>
          <td style="padding: 10px 0 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 500;">
            ${e.title}
          </td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="2" style="padding: 10px 0; color: #94a3b8; font-size: 13px;">אין אירועים מתוכננים</td></tr>`

  const taskItems = pendingTasks.length
    ? pendingTasks
        .map(
          (t) => `
        <li style="padding: 6px 0; color: #1e293b; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #3b82f6; font-size: 16px;">•</span>
          ${t.title}${t.time ? ` <span style="color: #94a3b8; font-size: 12px;">(${formatTime(t.time)})</span>` : ''}
        </li>`,
        )
        .join('')
    : `<li style="padding: 6px 0; color: #94a3b8; font-size: 13px;">אין משימות ממתינות</li>`

  const totalItems = timedEvents.length + pendingTasks.length

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 520px; margin: 32px auto; padding: 0 16px 32px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 20px; padding: 28px 28px 24px; margin-bottom: 8px; text-align: center;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 12px; margin-bottom: 12px;">
        <span style="font-size: 20px;">📅</span>
      </div>
      <h1 style="margin: 0 0 4px; color: white; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">הלו״ז שלך למחר</h1>
      <p style="margin: 0; color: rgba(255,255,255,0.75); font-size: 14px;">${tomorrowLabel}</p>
    </div>

    <!-- Main card -->
    <div style="background: white; border-radius: 20px; padding: 24px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);">

      <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6;">
        שלום ${fullName || 'שם'} 👋<br>
        הנה מה שמחכה לך מחר — ${totalItems} פריטים בסך הכל.
      </p>

      <!-- Events section -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <div style="width: 28px; height: 28px; background: #eff6ff; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 14px;">⏰</span>
          </div>
          <span style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em;">אירועים</span>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${eventRows}
        </table>
      </div>

      <!-- Tasks section -->
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <div style="width: 28px; height: 28px; background: #f0fdf4; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 14px;">📌</span>
          </div>
          <span style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em;">משימות</span>
        </div>
        <ul style="margin: 0; padding: 0; list-style: none;">
          ${taskItems}
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px;">
      <div style="display: inline-flex; align-items: center; gap: 6px;">
        <div style="width: 18px; height: 18px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 5px; display: inline-flex; align-items: center; justify-content: center;">
          <span style="font-size: 10px; color: white;">W</span>
        </div>
        <span style="font-size: 12px; color: #94a3b8;">WeekFlow · יומן שבועי חכם</span>
      </div>
      <p style="margin: 6px 0 0; font-size: 11px; color: #cbd5e1;">
        לשינוי הגדרות התראות — כנס להגדרות באפליקציה
      </p>
    </div>

  </div>
</body>
</html>`
}

function formatTomorrowLabel(dateStr: string): string {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
  const d = new Date(dateStr + 'T12:00:00Z')
  return `יום ${days[d.getUTCDay()]}, ${d.getUTCDate()} ב${months[d.getUTCMonth()]}`
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const adminClient = createAdminClient()
  const israelHour = getIsraelHour()
  const tomorrow = getTomorrowIsrael()
  const tomorrowLabel = formatTomorrowLabel(tomorrow)

  // Fetch all users who want a digest at this hour
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, email, notification_hour')
    .eq('digest_enabled', true)
    .eq('notification_hour', israelHour)

  if (!profiles?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0

  await Promise.allSettled(
    profiles.map(async (profile) => {
      const [{ data: events }, { data: tasks }] = await Promise.all([
        adminClient
          .from('sessions')
          .select('title, start_time, end_time, source')
          .eq('user_id', profile.id)
          .eq('date', tomorrow),
        adminClient
          .from('tasks')
          .select('title, time, is_completed')
          .eq('user_id', profile.id)
          .eq('date', tomorrow),
      ])

      const html = buildEmailHtml({
        fullName: profile.full_name ?? '',
        tomorrowLabel,
        events: events ?? [],
        tasks: tasks ?? [],
      })

      await resend.emails.send({
        from: 'WeekFlow <onboarding@resend.dev>',
        to: profile.email!,
        subject: `הלו״ז שלך למחר — ${tomorrowLabel} 📅`,
        html,
      })

      sent++
    }),
  )

  return NextResponse.json({ ok: true, sent })
}
