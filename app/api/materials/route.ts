import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient({
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[GET /api/materials] auth error:', authError.message)
      return NextResponse.json({ error: 'Auth error' }, { status: 401 })
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tutorialId = req.nextUrl.searchParams.get('tutorialId')
    if (!tutorialId) return NextResponse.json({ error: 'tutorialId required' }, { status: 400 })

    const { data, error } = await supabase
      .from('tutorial_materials')
      .select('*')
      .eq('tutorial_id', tutorialId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/materials] DB error:', { code: error.code, message: error.message })
      // Table not created yet — return empty list so UI doesn't crash
      return NextResponse.json([])
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[GET /api/materials] unhandled exception:', err)
    return NextResponse.json([], { status: 200 }) // still return [] so UI doesn't crash
  }
}
