import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: 'קוד נדרש' }, { status: 400 })

  const adminClient = createAdminClient()

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await adminClient.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: otp } = await adminClient
    .from('otp_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!otp) return NextResponse.json({ error: 'קוד שגוי או פג תוקף' }, { status: 400 })

  // fire and forget — don't block the response on cleanup
  adminClient.from('otp_codes').delete().eq('id', otp.id)

  return NextResponse.json({ ok: true })
}
