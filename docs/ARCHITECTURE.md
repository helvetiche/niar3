# Architecture Guide

## Overview

NIA Productivity Tools is built with Next.js 16 (App Router) and follows a modern, scalable architecture with clear separation of concerns.

## Technology Stack

### Frontend

- **Framework**: Next.js 16.1.6 with React 19.2.3
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, Phosphor Icons
- **Animations**: GSAP, Motion
- **State Management**: React Context API, SWR

### Backend

- **Runtime**: Node.js 20+
- **API**: Next.js API Routes (App Router)
- **Authentication**: Firebase Admin SDK
- **Database**: Firebase Firestore, Realtime Database
- **Storage**: Firebase Cloud Storage
- **Rate Limiting**: Upstash Redis

### DevOps

- **Deployment**: Vercel
- **Monitoring**: Sentry
- **Analytics**: Vercel Speed Insights

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (Components, Pages, Hooks)       │
├─────────────────────────────────────┤
│         Application Layer           │
│      (API Routes, Contexts)         │
├─────────────────────────────────────┤
│          Business Layer             │
│   (Services, Utilities, Logic)      │
├─────────────────────────────────────┤
│           Data Layer                │
│  (Firebase, Storage, Database)      │
└─────────────────────────────────────┘
```

### 2. Authentication Flow

```
Client Request
    ↓
Proxy Middleware (rate limiting)
    ↓
API Route Handler
    ↓
withAuth() → getSession() → verifySessionCookie()
    ↓
hasPermission() check
    ↓
Business Logic
    ↓
Audit Trail Logging
    ↓
Response with Security Headers
```

### 3. File Processing Pipeline

```
File Upload (Client)
    ↓
FormData Validation
    ↓
File Size/Type Check
    ↓
Buffer Extraction
    ↓
Business Logic Processing
    ↓
Result Generation
    ↓
Secure File Response
```

## Directory Structure

### `/app` - Next.js App Router

- **Pages**: Route-based file structure
- **API Routes**: `/api/v1/*` for versioned endpoints
- **Layouts**: Shared layouts with metadata
- **Error Boundaries**: Global error handling

### `/components` - React Components

- **Feature Components**: Domain-specific components
- **UI Components**: Reusable UI elements
- **Layout Components**: Page structure components

### `/lib` - Core Business Logic

- **`/auth`**: Authentication and authorization
- **`/firebase-admin`**: Firebase Admin SDK wrappers
- **`/api`**: Client-side API functions
- **`/services`**: Business services
- **`/monitoring`**: Logging and error tracking
- **`/rate-limit`**: Rate limiting logic

### `/types` - TypeScript Definitions

- Shared type definitions
- API request/response types
- Domain models

### `/constants` - Application Constants

- Permission definitions
- Error messages
- Configuration values

## Key Design Decisions

### 1. Server-Side Session Management

- Session cookies verified server-side for security
- Firebase Admin SDK for token verification
- Custom claims for role-based access control

### 2. Permission-Based Authorization

- Resource:action format (e.g., "workspace:read")
- Three-tier role system (super-admin, admin, user)
- Base permissions for authenticated users

### 3. Comprehensive Audit Logging

- All actions logged to Firebase Realtime DB
- Sanitized data to prevent sensitive info leakage
- Structured logging for compliance

### 4. Distributed Rate Limiting

- Upstash Redis for production
- Three-tier limits (public, API, auth)
- IP-based identification

### 5. Security-First Headers

- Strict CSP with allowlists
- HSTS for HTTPS enforcement
- X-Frame-Options to prevent clickjacking
- CORS restricted to same-origin

### 6. Graceful Degradation

- Optional services (Sentry, Redis) fail gracefully
- Environment-aware configuration
- Fallback mechanisms for non-critical features

## Data Flow

### Authentication

1. User logs in via Firebase Auth (client)
2. Client receives ID token
3. Server exchanges token for session cookie
4. Session cookie stored in httpOnly cookie
5. Subsequent requests verified server-side

### File Processing

1. Client uploads file via FormData
2. Server validates file (size, type)
3. Buffer extracted and processed
4. Business logic applied (Excel manipulation, PDF merge)
5. Result returned as secure file response
6. Audit trail logged

### Template Management

1. Templates stored in Firebase Storage
2. Metadata stored in Firestore
3. Client-side caching for performance
4. Scoped by tool (ifr-scanner, swrft, consolidation)

## Security Architecture

### Defense in Depth

1. **Network Layer**: Rate limiting, CORS
2. **Application Layer**: Authentication, authorization
3. **Data Layer**: Input validation, sanitization
4. **Monitoring Layer**: Audit logging, error tracking

### Security Headers

- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Performance Optimizations

1. **Client-Side Caching**: SWR for data fetching
2. **Template Caching**: In-memory cache for templates
3. **Code Splitting**: Next.js automatic code splitting
4. **Image Optimization**: Next.js Image component
5. **Bundle Optimization**: Tree shaking, minification

## Scalability Considerations

1. **Stateless API**: No server-side session state
2. **Firebase Auto-Scaling**: Managed infrastructure
3. **CDN Distribution**: Vercel Edge Network
4. **Rate Limiting**: Prevents abuse and DoS
5. **Async Processing**: Ready for background jobs

## Future Enhancements

1. **Background Job Queue**: BullMQ for async processing
2. **Multi-Region Deployment**: Global distribution
3. **GraphQL API**: Alternative to REST
4. **WebSocket Support**: Real-time updates
5. **Microservices**: Service decomposition for scale

## Monitoring and Observability

1. **Error Tracking**: Sentry for exceptions
2. **Performance Monitoring**: Vercel Speed Insights
3. **Audit Logging**: Firebase Realtime DB
4. **Rate Limit Analytics**: Upstash Analytics

## Testing Strategy

1. **Unit Tests**: Business logic and utilities
2. **Integration Tests**: API endpoints
3. **E2E Tests**: Critical user workflows
4. **Security Tests**: OWASP ZAP scanning

## Deployment Pipeline

1. **Development**: Local development with hot reload
2. **Staging**: Preview deployments on Vercel
3. **Production**: Main branch auto-deploys
4. **Rollback**: Instant rollback via Vercel

## Best Practices

1. **Type Safety**: Strict TypeScript everywhere
2. **Error Handling**: Structured error responses
3. **Logging**: Comprehensive audit trail
4. **Security**: Defense in depth
5. **Performance**: Optimize for speed
6. **Maintainability**: Clean, documented code
