import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from './get-session'
import type { AuthUser } from '@/types/auth'

/**
 * Require authenticated user. Use in Server Components and Layouts.
 * Redirects to /login if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const result = await getSession()
  if (!result.user) {
    redirect('/?login=1')
  }
  return result.user
}
