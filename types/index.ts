export type TaskStatus = 'pending' | 'completed'
export type EventSource = 'manual' | 'task' | 'tutorial'

export interface Tutorial {
  id: string
  user_id: string
  session_id?: string | null
  title: string
  date: string
  start_time: string
  end_time: string
  color?: string | null
  is_recurring?: boolean
  created_at: string
}
//tasks have optional time, but calendar events must have time. When a task with time is created, it can be converted to a calendar event.
export interface Task {
  id: string
  user_id: string
  title: string
  description?: string | null
  date: string          // YYYY-MM-DD
  time?: string | null      // HH:MM (24h) start
  end_time?: string | null  // HH:MM (24h) end
  is_recurring?: boolean
  is_completed: boolean
  created_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  date: string          // YYYY-MM-DD
  start_time: string    // HH:MM (24h)
  end_time: string      // HH:MM (24h)
  source: EventSource
  task_id?: string | null
  color?: string | null
  is_recurring?: boolean
  created_at: string
}

export interface WeekDay {
  date: Date
  dateStr: string       // YYYY-MM-DD
  label: string         // Mon, Tue, etc.
  dayNum: number        // 1–31
  isToday: boolean
}

export type TabView = 'calendar' | 'tasks' | 'recurring'

export type TaskFilter = 'all' | 'today' | 'week' | 'completed' | 'active'
