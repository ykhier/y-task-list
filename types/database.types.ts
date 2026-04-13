export type Database = {
  public: {
    PostgrestVersion: "12"
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          id: string
          user_id: string
          code: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
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
      tutorial_materials: {
        Row: {
          id: string
          user_id: string
          tutorial_id: string
          file_name: string
          storage_path: string
          file_size_bytes: number | null
          mime_type: string
          embedding_status: 'pending' | 'processing' | 'done' | 'error'
          embedding_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tutorial_id: string
          file_name: string
          storage_path: string
          file_size_bytes?: number | null
          mime_type?: string
          embedding_status?: 'pending' | 'processing' | 'done' | 'error'
          embedding_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tutorial_id?: string
          file_name?: string
          storage_path?: string
          file_size_bytes?: number | null
          mime_type?: string
          embedding_status?: 'pending' | 'processing' | 'done' | 'error'
          embedding_error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      material_chunks: {
        Row: {
          id: string
          user_id: string
          material_id: string
          tutorial_id: string
          content: string
          metadata: Record<string, unknown>
          embedding: string | null
          chunk_index: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          material_id: string
          tutorial_id: string
          content: string
          metadata?: Record<string, unknown>
          embedding?: string | null
          chunk_index: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          material_id?: string
          tutorial_id?: string
          content?: string
          metadata?: Record<string, unknown>
          embedding?: string | null
          chunk_index?: number
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
