# Architecture Guide

## Overview

NIA Tools is a Next.js 16 application built with TypeScript, React 19, and Firebase. It follows a modern server-first architecture with strong security principles.

## Technology Stack

### Core

- **Next.js 16**: App Router with React Server Components
- **React 19**: Latest React with concurrent features
- **TypeScript 5**: Strict mode enabled
- **Firebase**: Authentication and Realtime Database

### State Management

- **React Context**: Global workspace state
- **SWR**: Server state management and caching
- **Custom Hooks**: Encapsulated business logic

### Styling

- **Tailwind CSS 4**: Utility-first CSS
- **Radix UI**: Accessible component primitives
- **GSAP + Motion**: Animations

### Data Processing

- **ExcelJS**: Excel file manipulation
- **PDF-Lib**: PDF generation and merging
- **JSZip**: File compression

## Architecture Patterns

### 1. Server-First Architecture

```
┌─────────────────────────────────────────┐
│           Client (Browser)              │
│  ┌─────────────────────────────────┐   │
│  │   React Components (RSC + CSR)  │   │
│  └─────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
                  │ HTTP/Fetch
                  │
┌─────────────────▼───────────────────────┐
│         Next.js Server (Edge)           │
│  ┌─────────────────────────────────┐   │
│  │      proxy.ts (Middleware)      │   │
│  │  - Rate Limiting                │   │
│  │  - Security Headers             │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │      App Router                 │   │
│  │  - Server Components            │   │
│  │  - API Routes (/api/v1/*)       │   │
│  │  - Server Actions               │   │
│  └─────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
                  │
┌─────────────────▼───────────────────────┐
│         External Services               │
│  - Firebase Auth                        │
│  - Firebase Realtime DB                 │
│  - Upstash Redis                        │
│  - Sentry                               │
└─────────────────────────────────────────┘
```

### 2. Directory Structure

```
niatools/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth layout group
│   ├── (dashboard)/       # Dashboard layout group
│   ├── (public)/          # Public layout group
│   ├── api/v1/            # Versioned API routes
│   ├── workspace/         # Main application
│   └── layout.tsx         # Root layout
│
├── components/            # React components
│   ├── [Feature]/         # Feature-based modules
│   │   ├── index.tsx
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── hooks/
│   └── ui/                # Shared UI components
│
├── contexts/              # React Context providers
├── hooks/                 # Shared custom hooks
│
├── lib/                   # Core business logic
│   ├── api/              # Client-side API functions
│   ├── auth/             # Authentication utilities
│   ├── firebase-admin/   # Firebase Admin SDK
│   ├── rate-limit/       # Rate limiting
│   ├── services/         # Business services
│   ├── utils/            # Utility functions
│   └── validations/      # Zod schemas
│
├── types/                 # TypeScript definitions
├── constants/             # Application constants
├── tests/                 # Test files
└── docs/                  # Documentation
```

### 3. Request Flow

#### API Request Flow

```
1. Client Request
   ↓
2. proxy.ts
   - Rate limiting check
   - Apply security headers
   ↓
3. API Route Handler
   - Authentication check (requireAuth)
   - Permission check (requirePermission)
   - Input validation (Zod)
   ↓
4. Business Logic (lib/services)
   - Process request
   - Database operations
   ↓
5. Audit Trail
   - Log action (fire-and-forget)
   ↓
6. Response
   - Apply security headers
   - Return JSON/File
```

#### Page Request Flow

```
1. Client Request
   ↓
2. proxy.ts
   - Rate limiting
   - Security headers
   ↓
3. Layout (Server Component)
   - requireAuth()
   - Fetch user data
   ↓
4. Page (Server Component)
   - Fetch initial data
   - Render RSC
   ↓
5. Client Components
   - Hydrate
   - Interactive features
```

## Key Design Decisions

### 1. Authentication Strategy

**Session Cookies over JWT**

- Firebase session cookies (5-day expiry)
- HttpOnly, Secure, SameSite=Strict
- Server-side verification on every request
- No client-side token storage

**Why?**

- More secure (XSS protection)
- Automatic CSRF protection
- Simpler client code
- Firebase Admin SDK integration

### 2. Rate Limiting

**Distributed Rate Limiting with Upstash Redis**

- Different limits per endpoint type
- Sliding window algorithm
- Client identification via IP
- Graceful degradation (disabled in dev)

**Limits:**

- Auth: 5 req/60s
- API: 10 req/10s
- Heavy: 5 req/60s
- Public: 30 req/60s

### 3. File Processing

**Server-Side Processing**

- All file operations on server
- Streaming for large files
- Memory-efficient buffers
- 2GB upload limit

**Why?**

- Security (no client-side code execution)
- Consistent processing
- Better error handling
- Audit trail

### 4. State Management

**Hybrid Approach**

- Server state: SWR (caching, revalidation)
- Global UI state: React Context
- Local state: useState
- Form state: Controlled components

**Why?**

- Simple and maintainable
- No over-engineering
- Leverages React 19 features
- Good performance

## Security Architecture

### Defense in Depth

```
Layer 1: Network (Vercel Edge)
  - DDoS protection
  - TLS 1.3

Layer 2: proxy.ts
  - Rate limiting
  - Security headers

Layer 3: Authentication
  - Session verification
  - Role-based access

Layer 4: Authorization
  - Permission checks
  - Resource ownership

Layer 5: Input Validation
  - Zod schemas
  - File validation
  - Sanitization

Layer 6: Output Encoding
  - JSON serialization
  - File headers
  - Error sanitization

Layer 7: Audit Trail
  - All actions logged
  - Immutable records
```

### Security Headers

All responses include:

- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (production)
- Referrer-Policy
- Permissions-Policy

### CSRF Protection

- Token in cookie (\_\_csrf-token)
- Header validation (x-csrf-token)
- SameSite=Strict cookies
- Origin validation

## Performance Optimizations

### 1. Caching Strategy

```typescript
// Template cache (5 min TTL)
const cache = new Map<string, CachedTemplate>();

// SWR configuration
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};
```

### 2. Code Splitting

- Automatic route-based splitting (Next.js)
- Dynamic imports for heavy components
- Lazy loading for modals

### 3. Asset Optimization

- Next.js Image optimization
- Font optimization (next/font)
- Static asset caching

## Data Flow Patterns

### 1. Server Component Pattern

```typescript
// app/workspace/layout.tsx
export default async function Layout() {
  const user = await requireAuth(); // Server-side
  return <WorkspaceProvider user={user}>...</WorkspaceProvider>;
}
```

### 2. Client Component Pattern

```typescript
// components/Feature/index.tsx
"use client";
export function Feature() {
  const { data } = useSWR("/api/v1/data");
  return <div>{data}</div>;
}
```

### 3. API Route Pattern

```typescript
// app/api/v1/resource/route.ts
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  await requirePermission(user, "resource.read");
  const data = await fetchData();
  return secureJsonResponse(data);
}
```

## Testing Strategy

### Test Pyramid

```
        ┌─────────┐
        │   E2E   │  (Few)
        └─────────┘
      ┌─────────────┐
      │ Integration │  (Some)
      └─────────────┘
    ┌─────────────────┐
    │      Unit       │  (Many)
    └─────────────────┘
```

### Test Coverage Goals

- Unit tests: 80%+
- Integration tests: 60%+
- E2E tests: Critical paths

### Test Files

```
tests/
├── components/        # Component tests
├── hooks/            # Hook tests
├── lib/              # Utility tests
├── api/              # API route tests
└── e2e/              # End-to-end tests
```

## Deployment

### Vercel Platform

- Edge runtime for proxy.ts
- Node.js runtime for API routes
- Automatic HTTPS
- Global CDN
- Environment variables

### Environment Variables

```env
# Firebase
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Upstash Redis
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Sentry
NEXT_PUBLIC_SENTRY_DSN
```

## Monitoring & Observability

### Logging

- Structured logging (JSON)
- Log levels: debug, info, warn, error
- External service integration (Sentry)

### Metrics

- Vercel Analytics
- Speed Insights
- Custom audit trail

### Error Tracking

- Sentry integration
- Error boundaries
- Graceful degradation

## Future Considerations

### Scalability

- Database migration (Firebase → PostgreSQL)
- Microservices for heavy processing
- Queue system for async jobs
- CDN for file storage

### Features

- Real-time collaboration
- Offline support (PWA)
- Mobile app (React Native)
- API versioning (v2)

### Technical Debt

- Consolidate Excel libraries
- Implement CSP nonces
- Add E2E tests
- Improve error messages
