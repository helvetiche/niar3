# Security Features

Security layer for niatools: validation, rate limiting, sanitization, and ESLint.

---

## 1. Zod Validation

**Location:** `lib/validations/`

- **common.ts** — `emailSchema`, `passwordSchema`, `stringSchema`, `slugSchema`, `paginationSchema`, etc.
- **auth.ts** — `signUpSchema`, `signInSchema`, `forgotPasswordSchema`, `resetPasswordSchema`
- **parse-body.ts** — `parseBody(request, schema)` for API routes

**Usage in API routes:**

```ts
import { parseBody } from '@/lib/validations'
import { signInSchema } from '@/lib/validations'

export async function POST(request: Request) {
  const body = await parseBody(request, signInSchema)
  if (body instanceof NextResponse) return body
  // body is typed SignInInput
}
```

---

## 2. Distributed Rate Limiting (Upstash Redis)

**Location:** `lib/rate-limit/`

- **index.ts** — `apiRateLimit`, `authRateLimit`, `publicRateLimit`
- **with-api-rate-limit.ts** — Use in API routes
- **with-auth-rate-limit.ts** — Use on auth endpoints (stricter: 5/min)

**Limits:**

| Route Type | Limit |
|------------|-------|
| Pages | 30 req/min per IP |
| API | 10 req/10s per IP |
| Auth (login, signup, etc.) | 5 req/min per IP |

**Setup:** Add to `.env.local`:
```
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

If not set, rate limiting is skipped (dev-friendly).

**Proxy:** Rate limiting runs in `proxy.ts` for all matched routes.

---

## 3. Sanitization

**Location:** `lib/sanitize/`

- `escapeHtml(str)` — Escape HTML entities (XSS prevention)
- `normalizeString(str)` — Trim, collapse whitespace
- `sanitizeString(str, maxLength)` — Trim + escape + length limit
- `sanitizeHtmlInput(html)` — Allow safe HTML tags
- `stripHtml(html)` — Remove all HTML
- `sanitizeForUrl(str)` — Safe for URL segments

**Usage:** Call before storing or rendering user input.

---

## 4. Environment Validation

**Location:** `config/env.ts`, `config/env.example`

- `getServerEnv()` — Validated server env (call where needed)
- `getClientEnv()` — Validated client env
- Copy `config/env.example` to `.env.local`

---

## 5. Strict ESLint

**Location:** `eslint.config.mjs`

- `eslint-plugin-security` — Security rules (eval, buffer, regex, etc.)
- `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`, etc.
- Key security rules promoted to `error`

---

## 6. Security Headers

**Location:** `lib/security-headers.ts`

**Response headers** (applied to every response):
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera, microphone, geolocation, etc.)
- `X-DNS-Prefetch-Control`, `X-XSS-Protection`
- `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`
- `Strict-Transport-Security` (production only)

**Usage:**
- `applySecurityHeaders(response)` — Add headers to any Response
- `secureJsonResponse(data, { status?, headers? })` — Use in API routes instead of `NextResponse.json()`
- `withSecurityRequestHeaders(init)` — For outgoing `fetch()` calls from the server

Proxy, rate-limit helpers, and `parseBody` all use these headers automatically.

---

## 7. Firebase Auth Authorization

**Default: deny all.** Every request must be authenticated.

**Location:** `lib/auth/`, `constants/permissions.ts`, `types/auth.ts`

- `getSession()` — Verify `__session` cookie, return user
- `requireAuth()` — Layouts: redirect to / if not authenticated
- `requirePermission(permission)` — Layouts: require auth (any logged-in user has access)
- `withAuth(request, permission?)` — API routes: return 401/403 if not authorized
- `hasPermission(user, permission)` — All authenticated users have access

---

## No CSRF

CSRF protection is not implemented. Firebase Auth with email/password uses bearer tokens / session cookies in a way that mitigates classic CSRF. If you add cookie-based session auth, consider CSRF tokens.
