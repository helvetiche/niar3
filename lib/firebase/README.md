# Firebase (Client + Server)

Firebase JavaScript SDK integration for Next.js App Router.

**Client-side** (browser):
- `config.ts` - Initialize Firebase app with public config (apiKey, projectId, etc.)
- `auth.ts` - Email/password: signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut; onIdTokenChanged (for `__session` cookie)
- `firestore.ts` - Client Firestore reads/writes (subject to Security Rules)
- `storage.ts` - Client Storage uploads/downloads

**Server-side** (App Router, Server Components, Route Handlers):
- `server.ts` - `getAuthenticatedAppForUser()` using `initializeServerApp` + `__session` cookie
- Use same Firestore/Storage from server app for user-scoped data

**Flow**: Client auth → `__session` cookie (idToken) → Server reads cookie → `initializeServerApp(authIdToken)` → Server has user context

Never import `lib/firebase-admin` here. Admin SDK is for privileged ops only.
