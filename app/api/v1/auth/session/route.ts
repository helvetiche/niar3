import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminAuth } from '@/lib/firebase-admin/app'
import { authRateLimit, getClientIdentifier, isRateLimitEnabled } from '@/lib/rate-limit'

const SESSION_COOKIE = '__session'
const MAX_AGE = 60 * 60 * 24 * 5 // 5 days

/**
 * POST /api/v1/auth/session
 * Verifies Firebase ID token and sets __session cookie for server-side auth.
 * Body: { token: string }
 */
export async function POST(request: Request) {
  if (isRateLimitEnabled() && authRateLimit) {
    const identifier = getClientIdentifier(request)
    const { success } = await authRateLimit.limit(identifier)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      )
    }
  }

  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token.trim() : null
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  try {
    const auth = getAdminAuth()
    const decoded = await auth.verifyIdToken(token)

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ ok: true, uid: decoded.uid })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (
      message.includes('expired') ||
      message.includes('auth/id-token-expired') ||
      message.includes('invalid')
    ) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    console.error('[auth/session]', err)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
