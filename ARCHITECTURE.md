# Architecture — Next.js 16 + Firebase

Enterprise-level, secure, modular structure for niatools.

---

## Folder Structure

```
niatools/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, register, forgot-password
│   │   ├── layout.tsx
│   │   └── ...
│   ├── (dashboard)/              # Protected app area
│   │   ├── layout.tsx            # Wrap with auth guard
│   │   └── ...
│   ├── (public)/                 # Marketing, landing pages
│   │   └── layout.tsx
│   ├── api/v1/                   # Versioned API routes
│   ├── _components/              # App-level components
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                   # Shared UI
│   ├── ui/                       # Primitives (Button, Input, etc.)
│   ├── layout/                   # Header, Sidebar, Footer
│   ├── forms/                    # Form components
│   └── providers/                # Context providers
│
├── features/                     # Domain-driven feature modules
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts               # Public API only
│
├── lib/                          # Core libraries
│   ├── firebase/                 # Firebase JS SDK (client + server)
│   │   ├── config.ts             # Client app init
│   │   ├── auth.ts               # signIn, signOut, session cookie
│   │   ├── firestore.ts          # Client Firestore
│   │   ├── storage.ts            # Client Storage
│   │   └── server.ts             # getAuthenticatedAppForUser (SSR)
│   ├── firebase-admin/           # Admin SDK (server-only, privileged)
│   ├── auth/                     # App-level auth helpers
│   ├── config/                   # Runtime config
│   ├── db/                       # Supplemental DB (Postgres, etc.)
│   ├── utils/                    # Pure utilities
│   ├── validations/              # Zod schemas
│   └── logger/                   # Structured logging
│
├── guards/                       # Server Layout Guards (auth enforcement)
├── middleware/                   # Proxy logic modules (imported by proxy.ts)
├── services/                     # API clients, external integrations
├── hooks/                        # Global React hooks
├── types/                        # Global TypeScript types
├── constants/                    # App constants
│
├── config/                       # Env schema, Firebase env example
├── firebase/                     # Firebase project config
│   ├── firebase.json
│   ├── firestore.rules
│   ├── storage.rules
│   └── firestore.indexes.json
│
├── tests/                        # Unit, integration, e2e
├── docs/                         # Documentation
│
├── proxy.ts                      # Next.js 16 proxy (security headers, etc.)
├── next.config.ts
└── tsconfig.json
```

---

## Firebase Integration

### Client vs Server

| Layer | Use Case | Location |
|-------|----------|----------|
| **Firebase JS SDK** | Auth UI, client Firestore, client Storage | `lib/firebase/` |
| **Firebase Server App** | SSR with user context (`__session` cookie) | `lib/firebase/server.ts` |
| **Firebase Admin SDK** | Token verification, privileged ops | `lib/firebase-admin/` |

### Auth Flow (Email/Password)

1. Client: User signs in with email/password → Firebase Auth
2. Client: `onIdTokenChanged` → set `__session` cookie with idToken
3. Server: `getAuthenticatedAppForUser()` reads `__session` → `initializeServerApp(authIdToken)`
4. Server: Firestore/Storage calls run with user context
5. Guards: Use server app to enforce protected routes

### Security Rules

- `firebase/firestore.rules` — Firestore access control
- `firebase/storage.rules` — Storage access control
- Deploy: `firebase deploy --only firestore,storage`

---

## Security Layers

1. **proxy.ts** — Security headers, matcher exclusions (no heavy auth)
2. **Guards** — Server Layout Guards for protected routes
3. **Firestore/Storage Rules** — Database-level authorization
4. **lib/auth** — Session helpers for Server Components

---

## Modular Conventions

- **Features** are self-contained. No cross-feature imports.
- **Barrel exports**: `features/[name]/index.ts` — export only public API.
- **Path alias**: `@/*` maps to project root.
- **Server-only**: Use `'server-only'` for Admin SDK, credentials.
