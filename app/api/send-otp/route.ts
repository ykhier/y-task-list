import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export async function POST(request: Request) {
  const adminClient = createAdminClient()

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await adminClient.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  // run profile check and old-code cleanup in parallel
  const [profileResult] = await Promise.all([
    adminClient.from('profiles').select('is_admin, full_name').eq('id', user.id).single(),
    adminClient.from('otp_codes').delete().eq('user_id', user.id),
  ])

  const profile = profileResult.data
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await adminClient.from('otp_codes').insert({
    user_id: user.id,
    code,
    expires_at: expiresAt.toISOString(),
  })

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    // fire and forget — don't block the response on email delivery
    resend.emails.send({
      from: 'WeekFlow <onboarding@resend.dev>',
      to: user.email!,
      subject: 'קוד אימות WeekFlow',
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e293b;">קוד האימות שלך</h2>
          <p style="color: #475569;">שלום ${profile.full_name || ''},</p>
          <p style="color: #475569;">קוד האימות שלך לכניסה כמנהל מערכת:</p>
          <div style="background: #eff6ff; border-radius: 12px; padding: 24px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #3b82f6; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #94a3b8; font-size: 14px;">הקוד תקף ל-5 דקות בלבד.</p>
        </div>
      `,
    })
  } else {
    console.log(`[WeekFlow OTP] Code for ${user.email}: ${code}`)
  }

  return NextResponse.json({ ok: true })
}
