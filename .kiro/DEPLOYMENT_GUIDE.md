# Deployment Guide

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing
- [ ] Zero linting errors (`npm run lint`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] All files under 700 lines
- [ ] No console.log statements in production code

### Security

- [ ] Environment variables configured in Vercel
- [ ] Firebase security rules deployed
- [ ] Rate limiting enabled
- [ ] Sentry monitoring configured
- [ ] No sensitive data in codebase

### Performance

- [ ] SWR caching implemented
- [ ] Images optimized
- [ ] Bundle size analyzed
- [ ] Lighthouse score > 90

## Deployment Process

### 1. Development to Staging

```bash
git checkout staging
git merge develop
git push origin staging
```

Vercel automatically deploys to staging environment.

### 2. Staging Validation

- [ ] Run smoke tests
- [ ] Verify authentication flow
- [ ] Test critical user paths
- [ ] Check error monitoring
- [ ] Validate API endpoints

### 3. Staging to Production

```bash
git checkout main
git merge staging
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags
```

### 4. Post-Deployment

- [ ] Monitor Sentry for errors
- [ ] Check Firebase usage metrics
- [ ] Verify rate limiting
- [ ] Test production endpoints
- [ ] Update documentation

## Rollback Procedure

### Immediate Rollback

1. Go to Vercel Dashboard
2. Select previous deployment
3. Click "Promote to Production"
4. Verify rollback successful

### Git Rollback

```bash
git revert HEAD
git push origin main
```

## Monitoring

### Key Metrics to Watch

- Error rate (target: < 0.1%)
- Response time (target: < 200ms)
- Firestore reads/writes
- Active users
- API rate limit hits

### Alerts

- Critical errors in Sentry
- API response time > 1s
- Firestore costs exceed budget
- Rate limit threshold reached

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: CI/CD

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

## Database Migrations

### Firestore Schema Changes

1. Create migration script in `scripts/migrations/`
2. Test on staging environment
3. Run during low-traffic period
4. Monitor for errors
5. Verify data integrity

### Example Migration

```typescript
import { executeBatchWrites } from "@/lib/firebase-admin/batch-operations";

async function migrateUserRoles() {
  const operations = users.map((user) => ({
    type: "update" as const,
    path: `users/${user.uid}`,
    data: { role: user.role || "user" },
  }));

  await executeBatchWrites(operations);
}
```

## Performance Optimization

### Before Each Release

1. Run Lighthouse audit
2. Analyze bundle size
3. Check for unused dependencies
4. Optimize images
5. Review Firestore queries

### Bundle Analysis

```bash
npm run build
npx @next/bundle-analyzer
```

## Disaster Recovery

### Backup Restoration

```bash
gcloud firestore import gs://your-bucket/backups/20240115
```

### Emergency Contacts

- DevOps Lead: [contact]
- Firebase Admin: [contact]
- Vercel Support: support@vercel.com

## Release Notes Template

```markdown
## v1.0.0 - 2024-01-15

### Added

- Cursor-based pagination for accounts
- Sentry error monitoring
- Batch operations for Firestore

### Changed

- Improved permission system
- Optimized component structure

### Fixed

- Authentication edge cases
- Rate limiting issues

### Security

- Enhanced audit logging
- Updated dependencies
```
