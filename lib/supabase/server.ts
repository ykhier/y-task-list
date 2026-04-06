import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

type SupabaseCookie = {
  name: string
  value: string
  options?: Record<string, unknown>
}

type SupabaseCookieStore = {
  getAll: () => { name: string; value: string }[]
  setAll?: (cookiesToSet: SupabaseCookie[]) => void
}

export function createClient(cookieStore: SupabaseCookieStore) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookieStore.setAll?.(cookiesToSet)
          } catch {
            // Server component: ignore write attempts during render.
          }
        },
      },
    }
  )
}
