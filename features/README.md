# Features

Domain-driven, self-contained feature modules.

Each feature owns:
- `components/` - feature-specific UI
- `hooks/` - feature-specific hooks
- `services/` - API calls, business logic
- `types/` - feature types
- `index.ts` - public API (barrel export)

Import only from `features/[name]` or `features/[name]/index.ts`.
Keep features decoupled—no cross-feature imports.
