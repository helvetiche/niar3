# Auth Library

App-level auth helpers that wrap Firebase Auth.

- `getSession()` - get current user from Firebase server app (for Server Components)
- User/session types, auth helpers
- **Not** for complex auth logic in proxy—use Server Layout Guards instead
- Wraps `lib/firebase` (client) and `lib/firebase/server` (server)
