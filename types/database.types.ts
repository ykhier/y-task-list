export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          date: string
          time: string | null
          is_completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          date: string
          time?: string | null
          is_completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          date?: string
          time?: string | null
          is_completed?: boolean
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          date: string
          start_time: string
          end_time: string
          source: string
          task_id: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          date: string
          start_time: string
          end_time: string
          source?: string
          task_id?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          date?: string
          start_time?: string
          end_time?: string
          source?: string
          task_id?: string | null
          color?: string | null
          created_at?: string
        }
      }
      tutorials: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          title: string
          date: string
          start_time: string
          end_time: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          title: string
          date: string
          start_time: string
          end_time: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          title?: string
          date?: string
          start_time?: string
          end_time?: string
          color?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
