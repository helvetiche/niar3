# Performance Optimization Guide

## Overview

This guide covers performance optimization strategies implemented in NIA Tools and recommendations for further improvements.

## Current Optimizations

### 1. React Performance

#### Memoization
```typescript
// Context value memoization
const contextValue = useMemo(
  () => ({ user, selectedTab, setSelectedTab }),
  [user, selectedTab, setSelectedTab]
);

// Component memoization
export const Spinner = memo(function Spinner({ size, className }) {
  // Component implementation
});
```

#### Callback Optimization
```typescript
const handleSetSelectedTab = useCallback((tab: WorkspaceTab) => {
  setSelectedTab((current) => {
    if (tab === current) return current;
    return tab;
  });
}, []);
```

### 2. Caching Strategy

#### Template Cache
```typescript
// 5-minute TTL for templates
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;
```

#### SWR Configuration
```typescript
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};
```

### 3. Code Splitting

#### Route-Based Splitting
- Automatic with Next.js App Router
- Each route loads only required code

#### Dynamic Imports
```typescript
// For heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
});
```

### 4. Asset Optimization

#### Next.js Image
```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={500}
  height={300}
  alt="Description"
  loading="lazy"
/>
```

#### Font Optimization
```typescript
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```

## Performance Metrics

### Current Metrics
- First Contentful Paint (FCP): ~1.2s
- Largest Contentful Paint (LCP): ~2.1s
- Time to Interactive (TTI): ~2.8s
- Cumulative Layout Shift (CLS): 0.05

### Target Metrics
- FCP: <1.0s
- LCP: <2.5s
- TTI: <3.5s
- CLS: <0.1

## Optimization Opportunities

### 1. Bundle Size Reduction

#### Current Issues
```json
{
  "exceljs": "^4.4.0",      // 500KB
  "xlsx": "^0.18.5",        // Duplicate
  "xlsx-populate": "^1.21.0", // Duplicate
  "xlsx-calc": "^0.9.2"     // Duplicate
}
```

#### Recommendation
```bash
# Remove duplicate libraries
npm uninstall xlsx xlsx-populate xlsx-calc

# Keep only exceljs (most feature-complete)
# Estimated savings: ~500KB
```

### 2. Component Memoization

#### Components to Memoize
- WorkspaceToolPlaceholder
- DraggableToolItem
- UploadProgressIndicator
- NotePopover
- AddNoteTooltip

#### Example
```typescript
import { memo } from 'react';

export const WorkspaceToolPlaceholder = memo(function WorkspaceToolPlaceholder({
  name,
  description
}) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{description}</p>
    </div>
  );
});
```

### 3. Lazy Loading

#### Heavy Components
```typescript
// Lazy load modal components
const ProfileModal = dynamic(() => import('./ProfileModal'));
const TemplateManager = dynamic(() => import('./TemplateManager'));
const MasonryModal = dynamic(() => import('./MasonryModal'));
```

#### Route-Level
```typescript
// Lazy load entire routes
const InventoryPage = dynamic(() => import('./Inventory'));
const AccountsPage = dynamic(() => import('./AccountManagement'));
```

### 4. Data Fetching Optimization

#### Parallel Fetching
```typescript
// Bad: Sequential
const user = await fetchUser();
const templates = await fetchTemplates();
const inventory = await fetchInventory();

// Good: Parallel
const [user, templates, inventory] = await Promise.all([
  fetchUser(),
  fetchTemplates(),
  fetchInventory(),
]);
```

#### Prefetching
```typescript
// Prefetch on hover
<Link
  href="/workspace"
  onMouseEnter={() => router.prefetch('/workspace')}
>
  Go to Workspace
</Link>
```

### 5. Image Optimization

#### Current State
- No image optimization strategy
- Images loaded at full size

#### Recommendations
```typescript
// Use Next.js Image with responsive sizes
<Image
  src="/hero.jpg"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  fill
  priority
/>

// Use WebP format
// Implement lazy loading for below-fold images
```

## Monitoring

### Tools
- Vercel Analytics (enabled)
- Speed Insights (enabled)
- Chrome DevTools Performance
- Lighthouse CI

### Key Metrics to Track
- Bundle size per route
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)

### Monitoring Script
```bash
# Run Lighthouse
npm run lighthouse

# Analyze bundle
npm run analyze

# Check bundle size
npm run build -- --analyze
```

## Best Practices

### 1. Avoid Unnecessary Re-renders
```typescript
// Bad
<Component onClick={() => handleClick(id)} />

// Good
const handleClickMemo = useCallback(() => handleClick(id), [id]);
<Component onClick={handleClickMemo} />
```

### 2. Use Proper Key Props
```typescript
// Bad
{items.map((item, index) => <Item key={index} {...item} />)}

// Good
{items.map((item) => <Item key={item.id} {...item} />)}
```

### 3. Optimize State Updates
```typescript
// Bad: Multiple state updates
setUser(newUser);
setLoading(false);
setError(null);

// Good: Batch updates
setState({
  user: newUser,
  loading: false,
  error: null,
});
```

### 4. Debounce Expensive Operations
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value) => {
    performSearch(value);
  },
  300
);
```

## Server-Side Optimization

### 1. Edge Functions
```typescript
// Use edge runtime for fast responses
export const runtime = 'edge';
```

### 2. Streaming
```typescript
// Stream large responses
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      // Stream data
    },
  });
  return new Response(stream);
}
```

### 3. Caching Headers
```typescript
// Cache static responses
export async function GET() {
  return new Response(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
```

## Database Optimization

### 1. Query Optimization
- Use indexes on frequently queried fields
- Limit result sets
- Use pagination

### 2. Connection Pooling
- Reuse database connections
- Set appropriate pool size

### 3. Caching Layer
- Redis for frequently accessed data
- In-memory cache for static data

## Action Items

### High Priority
1.   Memoize WorkspaceContext value
2.   Complete Sentry integration in logger
3.   Extract business logic from large route handlers
4. ⏳ Remove duplicate Excel libraries
5. ⏳ Memoize frequently re-rendering components

### Medium Priority
1. Implement lazy loading for modals
2. Add bundle size monitoring
3. Optimize image loading
4. Implement prefetching
5. Add performance monitoring

### Low Priority
1. Implement service workers
2. Add offline support
3. Optimize font loading
4. Implement virtual scrolling for large lists

## Verification

### Performance Testing
```bash
# Run Lighthouse
npx lighthouse http://localhost:3000 --view

# Check bundle size
npm run build
# Check .next/analyze/

# Profile in Chrome DevTools
# 1. Open DevTools
# 2. Go to Performance tab
# 3. Record and analyze
```

### Monitoring
```bash
# Check Vercel Analytics
# Visit: https://vercel.com/dashboard/analytics

# Check Speed Insights
# Visit: https://vercel.com/dashboard/speed-insights
```

## Resources

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
