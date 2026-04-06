import { createAdminClient } from '@/lib/supabase/admin'

export type DigestItem = {
  time: string
  end_time: string
  title: string
  type: 'lecture' | 'tutorial' | 'task'
}

export type DigestPayload = {
  fullName: string
  tomorrowLabel: string
  timedItems: DigestItem[]
  untimedTasks: string[]
}

/** Returns YYYY-MM-DD for tomorrow in Israel time (UTC+3) */
export function getTomorrowIsrael(): string {
  const now = new Date()
  const israelNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  israelNow.setUTCDate(israelNow.getUTCDate() + 1)
  return israelNow.toISOString().slice(0, 10)
}

export function formatTomorrowLabel(dateStr: string): string {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ]
  const d = new Date(dateStr + 'T12:00:00Z')
  return `יום ${days[d.getUTCDay()]}, ${d.getUTCDate()} ב${months[d.getUTCMonth()]}`
}

export async function fetchDigestForUser(
  userId: string,
  date: string,
): Promise<{ timedItems: DigestItem[]; untimedTasks: string[] }> {
  const adminClient = createAdminClient()

  const [{ data: sessions }, { data: tasks }, { data: tutorials }] = await Promise.all([
    adminClient
      .from('sessions')
      .select('id, title, start_time, end_time, source')
      .eq('user_id', userId)
      .eq('date', date),
    adminClient
      .from('tasks')
      .select('title, time, end_time, is_completed')
      .eq('user_id', userId)
      .eq('date', date),
    adminClient
      .from('tutorials')
      .select('title, start_time, end_time, session_id')
      .eq('user_id', userId)
      .eq('date', date),
  ])

  // Sessions that have a linked tutorial should be shown as 'tutorial', not 'lecture'
  // to avoid duplicates (tutorial table is the source of truth for those)
  const tutorialSessionIds = new Set(
    (tutorials ?? []).map((t) => t.session_id).filter(Boolean),
  )

  const timedItems: DigestItem[] = []

  // Lectures: manual sessions without a linked tutorial
  for (const s of (sessions ?? []).filter(
    (s) => s.source === 'manual' && !tutorialSessionIds.has(s.id),
  )) {
    timedItems.push({ time: s.start_time, end_time: s.end_time, title: s.title, type: 'lecture' })
  }

  // Tutorials
  for (const t of tutorials ?? []) {
    timedItems.push({ time: t.start_time, end_time: t.end_time, title: t.title, type: 'tutorial' })
  }

  // Tasks with a time slot
  const pendingTasks = (tasks ?? []).filter((t) => !t.is_completed)
  for (const t of pendingTasks.filter((t) => t.time && t.end_time)) {
    timedItems.push({ time: t.time!, end_time: t.end_time!, title: t.title, type: 'task' })
  }

  // Sort timeline by start time
  timedItems.sort((a, b) => a.time.localeCompare(b.time))

  const untimedTasks = pendingTasks.filter((t) => !t.time).map((t) => t.title)

  return { timedItems, untimedTasks }
}
