export type Database = {
  public: {
    PostgrestVersion: "12"
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          date: string
          time: string | null
          end_time: string | null
          is_recurring: boolean
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
          end_time?: string | null
          is_recurring?: boolean
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
          end_time?: string | null
          is_recurring?: boolean
          is_completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          date: string
          start_time: string
          end_time: string
          source: 'manual' | 'task' | 'tutorial'
          task_id: string | null
          color: string | null
          is_recurring: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          date: string
          start_time: string
          end_time: string
          source?: 'manual' | 'task' | 'tutorial'
          task_id?: string | null
          color?: string | null
          is_recurring?: boolean
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
          is_recurring?: boolean
          created_at?: string
        }
        Relationships: []
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
          is_recurring: boolean
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
          is_recurring?: boolean
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
          is_recurring?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
