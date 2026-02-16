# Proxy Logic Modules

Modular logic imported by root `proxy.ts`.

- `security-headers.ts` - header configuration
- `redirects.ts` - conditional redirect logic
- `cors.ts` - CORS handling for API
- Keeps proxy.ts thin; logic lives here
- Single proxy.ts file required by Next.js—import from these modules
