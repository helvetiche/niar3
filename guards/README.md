# Guards

Server-side route and layout guards for authorization.

- **Layout Guards**: Wrap protected layouts, redirect unauthenticated users
- **Server Components**: Use in layout.tsx to check session before rendering
- Full auth/session logic lives here—NOT in proxy.ts
- Proxy does optimistic checks; guards do authoritative checks
