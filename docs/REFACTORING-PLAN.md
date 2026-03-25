# Refactoring Plan

## Overview

This document outlines the refactoring plan for improving code maintainability, reducing technical debt, and optimizing bundle size.

## Priority 1: Extract Business Logic from Route Handlers

### Large Route Files (>200 lines)

1. **generate-profiles/route.ts** (343 lines)
   - Extract to: `lib/services/profile-generator.service.ts`
   - Business logic: Profile generation, Excel processing
   - Keep in route: Request validation, response formatting

2. **templates/[templateId]/route.ts** (333 lines)
   - Extract to: `lib/services/template.service.ts`
   - Business logic: Template CRUD operations
   - Keep in route: Auth checks, file handling

3. **merge-files/route.ts** (277 lines)
   - Extract to: `lib/services/file-merger.service.ts`
   - Business logic: PDF/Excel merging logic
   - Keep in route: File upload handling

4. **lipa-summary/route.ts** (267 lines)
   - Extract to: `lib/services/lipa-summary.service.ts`
   - Business logic: LIPA processing
   - Keep in route: Request handling

5. **✅ ifr-checker/route.ts** (265 lines → 40 lines)
   - ✅ Extracted to: `lib/services/ifr-checker.service.ts`
   - ✅ Reduced route handler to 40 lines
   - ✅ Business logic properly separated

### Refactoring Pattern

```typescript
// Before: app/api/v1/resource/route.ts (300 lines)
export async function POST(request: Request) {
  // 250 lines of business logic
  // ...
}

// After: app/api/v1/resource/route.ts (50 lines)
import { processResource } from '@/lib/services/resource.service';

export async function POST(request: Request) {
  const auth = await withAuth(request);
  const data = await request.json();
  const validated = schema.parse(data);
  
  const result = await processResource(validated);
  
  return secureJsonResponse(result);
}

// New: lib/services/resource.service.ts
export async function processResource(data: ResourceInput) {
  // 250 lines of business logic
  // ...
}
```

## Priority 2: Consolidate Excel Libraries

### Current State
```json
{
  "exceljs": "^4.4.0",        // 500KB, full-featured
  "xlsx": "^0.18.5",          // 400KB, duplicate
  "xlsx-populate": "^1.21.0", // 300KB, duplicate
  "xlsx-calc": "^0.9.2"       // 200KB, duplicate
}
```

### Migration Plan

#### Step 1: Audit Usage
```bash
# Find all imports
grep -r "import.*xlsx" --include="*.ts" --include="*.tsx"
grep -r "from 'xlsx'" --include="*.ts" --include="*.tsx"
grep -r "from 'xlsx-populate'" --include="*.ts" --include="*.tsx"
```

#### Step 2: Create Migration Guide
```typescript
// Old: xlsx
import * as XLSX from 'xlsx';
const workbook = XLSX.read(buffer);

// New: exceljs
import ExcelJS from 'exceljs';
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
```

#### Step 3: Migrate Files
1. lib/consolidate-ifr.ts
2. lib/consolidate-land-profiles-exceljs.ts (already using exceljs)
3. lib/excelParser.ts
4. lib/merge-excel.ts
5. lib/profileGenerator.ts

#### Step 4: Remove Dependencies
```bash
npm uninstall xlsx xlsx-populate xlsx-calc
```

#### Estimated Impact
- Bundle size reduction: ~900KB
- Maintenance: Single library to update
- Consistency: Unified API across codebase

## Priority 3: Component Memoization

### Components to Memoize

#### High Impact (frequently re-render)
1. WorkspaceToolPlaceholder
2. DraggableToolItem
3. UploadProgressIndicator
4. NotePopover
5. AddNoteTooltip

#### Medium Impact
1. WorkspaceSidebar
2. WorkspaceCalendar
3. ScheduleOnlyView
4. RefreshSessionButton

#### Low Impact (already optimized)
1. ✅ Spinner (memoized)
2. ErrorBoundary (rarely re-renders)

### Memoization Pattern

```typescript
import { memo } from 'react';

// Before
export function Component({ prop1, prop2 }) {
  return <div>{prop1} {prop2}</div>;
}

// After
export const Component = memo(function Component({ prop1, prop2 }) {
  return <div>{prop1} {prop2}</div>;
});

// With custom comparison
export const Component = memo(
  function Component({ prop1, prop2 }) {
    return <div>{prop1} {prop2}</div>;
  },
  (prevProps, nextProps) => {
    return prevProps.prop1 === nextProps.prop1;
  }
);
```

## Priority 4: Add JSDoc Comments

### Files Needing Documentation

#### Services
- lib/services/ifr-checker.service.ts ✅
- lib/services/audit-queue.ts
- lib/services/template-cache.ts

#### Utilities
- lib/consolidate-ifr.ts
- lib/file-utils.ts
- lib/retry.ts
- lib/async-utils.ts

#### API Utilities
- lib/api-client.ts
- lib/error-handler.ts ✅
- lib/security-headers.ts ✅

### JSDoc Pattern

```typescript
/**
 * Validates IFR files against consolidated file
 * 
 * @param ifrFiles - Source IFR files to validate against
 * @param consolidatedFile - Consolidated file to check
 * @returns Validation results with issues and summary
 * @throws {AppError} If file processing fails
 * 
 * @example
 * ```typescript
 * const result = await validateIFRFiles(ifrFiles, consolidatedFile);
 * console.log(`Found ${result.summary.totalIssues} issues`);
 * ```
 */
export async function validateIFRFiles(
  ifrFiles: File[],
  consolidatedFile: File
): Promise<ValidationResult> {
  // Implementation
}
```

## Priority 5: Improve Type Safety

### Areas for Improvement

#### 1. API Response Types
```typescript
// Current: any or unknown
const response = await fetch('/api/resource');
const data = await response.json(); // any

// Improved: Typed responses
interface ResourceResponse {
  id: string;
  name: string;
  createdAt: string;
}

const response = await fetch('/api/resource');
const data: ResourceResponse = await response.json();
```

#### 2. Event Handlers
```typescript
// Current: implicit any
const handleClick = (e) => { ... };

// Improved: Explicit types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
```

#### 3. Generic Utilities
```typescript
// Current: loose types
function mapArray(arr: any[], fn: any) { ... }

// Improved: Generic types
function mapArray<T, U>(arr: T[], fn: (item: T) => U): U[] { ... }
```

## Implementation Timeline

### Week 1
- ✅ Extract ifr-checker business logic
- ✅ Memoize WorkspaceContext
- ✅ Complete Sentry integration
- ✅ Create Spinner component

### Week 2
- Extract generate-profiles business logic
- Extract templates business logic
- Audit Excel library usage
- Start Excel library migration

### Week 3
- Complete Excel library migration
- Remove duplicate dependencies
- Memoize high-impact components
- Add JSDoc to services

### Week 4
- Memoize medium-impact components
- Add JSDoc to utilities
- Improve type safety
- Performance testing

## Success Metrics

### Code Quality
- Route handlers: <100 lines average
- Test coverage: >80%
- TypeScript strict: No errors
- ESLint: No warnings

### Performance
- Bundle size: -900KB (Excel consolidation)
- Re-renders: -30% (memoization)
- Build time: <60s
- Type check: <10s

### Maintainability
- Cyclomatic complexity: <10 per function
- File length: <300 lines
- Function length: <50 lines
- JSDoc coverage: >80%

## Verification

### After Each Refactoring

```bash
# 1. Run tests
npm run test:run

# 2. Type check
npm run type-check

# 3. Lint
npm run lint

# 4. Build
npm run build

# 5. Check bundle size
ls -lh .next/static/chunks/

# 6. Run performance tests
npm run lighthouse
```

### Code Review Checklist

- [ ] Business logic extracted to services
- [ ] Route handlers <100 lines
- [ ] Tests updated/added
- [ ] Types properly defined
- [ ] JSDoc comments added
- [ ] No console.logs
- [ ] Error handling in place
- [ ] Performance impact assessed

## Resources

- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [React Performance](https://react.dev/learn/render-and-commit)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [JSDoc Guide](https://jsdoc.app/)
