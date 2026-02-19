# Environment Setup Guide

## Required Environment Variables

### Firebase Admin SDK (Server-Side)

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_STORAGE_BUCKET=your-project.appspot.com
```

### Firebase Client SDK (Public)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Sentry Monitoring (Optional)

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### Upstash Redis (Rate Limiting)

```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

## Environment-Specific Configuration

### Development (.env.local)

```bash
NODE_ENV=development
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

FIREBASE_ADMIN_PROJECT_ID=your-dev-project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-dev-project
```

### Staging (.env.staging)

```bash
NODE_ENV=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging

FIREBASE_ADMIN_PROJECT_ID=your-staging-project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-staging-project
```

### Production (.env.production)

```bash
NODE_ENV=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

FIREBASE_ADMIN_PROJECT_ID=your-prod-project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project
```

## Vercel Deployment

### Setting Environment Variables

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add each variable with appropriate scope:
   - Production: Production deployments only
   - Preview: Preview deployments (staging)
   - Development: Local development

### Sensitive Variables

- Never commit `.env.local` to git
- Use Vercel's encrypted storage for secrets
- Rotate credentials quarterly
- Use different Firebase projects per environment

## Security Checklist

### Before Deployment

- [ ] All `NEXT_PUBLIC_` variables are safe to expose
- [ ] Firebase Admin credentials are server-side only
- [ ] No hardcoded secrets in codebase
- [ ] `.env.local` in `.gitignore`
- [ ] Sentry DSN configured for error tracking
- [ ] Rate limiting enabled with Upstash

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /profile/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /calendar_notes/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /templates/{templateId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                     request.auth.token.role in ['super-admin', 'admin'];
    }
  }
}
```

## Validation

### Test Environment Setup

```bash
npm run build
npm run start

curl http://localhost:3000/api/v1/health
```

### Expected Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## Troubleshooting

### Common Issues

**Firebase Admin SDK fails to initialize**

- Check `FIREBASE_ADMIN_PRIVATE_KEY` has proper newlines
- Verify service account has correct permissions
- Ensure project ID matches

**Rate limiting not working**

- Verify Upstash Redis credentials
- Check Redis connection in logs
- Confirm environment variables are set

**Sentry not capturing errors**

- Verify `NEXT_PUBLIC_SENTRY_DSN` is set
- Check Sentry project settings
- Ensure environment matches

## Monitoring Setup

### Sentry Configuration

1. Create project at sentry.io
2. Copy DSN to environment variables
3. Configure alerts for critical errors
4. Set up performance monitoring

### Firebase Monitoring

1. Enable Firebase Performance Monitoring
2. Set up custom traces for critical paths
3. Monitor Firestore read/write costs
4. Configure budget alerts

## Backup Strategy

### Automated Backups

- Daily Firestore exports to Cloud Storage
- Weekly full database snapshots
- 30-day retention policy
- Cross-region replication

### Manual Backups

```bash
gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)
```
