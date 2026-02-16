import { z } from 'zod'
import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security-headers'

/**
 * Parse and validate request body with Zod. Use in API Route Handlers and Server Actions.
 *
 * @example
 * const parsed = await parseBody(request, signInSchema)
 * if (parsed instanceof NextResponse) return parsed
 * // parsed is typed SignInInput
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    const response = NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
    return applySecurityHeaders(response)
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    const response = NextResponse.json(
      {
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
    return applySecurityHeaders(response)
  }
  return result.data
}
