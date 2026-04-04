import { createClient } from '@supabase/supabase-js'

// create a single supabase client for interacting with your database
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
