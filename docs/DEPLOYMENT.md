# Deployment Guide

## Prerequisites

- Vercel account
- Firebase project
- Upstash Redis account (optional, for rate limiting)
- Sentry account (optional, for error monitoring)

## Environment Variables

### Required

```env
# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Optional

```env
# Upstash Redis (for production rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Sentry (for error monitoring)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Gemini API (for AI features)
GEMINI_API_KEY=your-gemini-api-key
```

## Vercel Deployment

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Select the repository

### 2. Configure Project

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### 3. Environment Variables

Add all required environment variables in Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select environments (Production, Preview, Development)

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## Post-Deployment

### 1. Verify Deployment

```bash
# Check health endpoint
curl https://your-app.vercel.app/api/v1/health

# Expected response
{"status":"ok","timestamp":"2024-03-25T10:00:00.000Z"}
```

### 2. Set Up Super Admin

```bash
# Clone repository
git clone https://github.com/your-username/niatools.git
cd niatools

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with production credentials

# Run script
npm run set-super-admin
# Enter email when prompted
```

### 3. Configure Firebase

1. Go to Firebase Console
2. Enable Authentication → Email/Password
3. Set up Realtime Database rules:

```json
{
  "rules": {
    "audit-trail": {
      ".read": "auth != null && auth.token.role == 'super-admin'",
      ".write": "auth != null"
    },
    "templates": {
      ".read": "auth != null",
      ".write": "auth != null && (auth.token.role == 'admin' || auth.token.role == 'super-admin')"
    }
  }
}
```

### 4. Configure Upstash Redis

1. Create Redis database at [Upstash Console](https://console.upstash.com/)
2. Copy REST URL and Token
3. Add to Vercel environment variables
4. Redeploy

### 5. Configure Sentry

1. Create project at [Sentry](https://sentry.io/)
2. Copy DSN
3. Add to Vercel environment variables
4. Redeploy

## Custom Domain

### 1. Add Domain

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records

### 2. DNS Configuration

Add these records to your DNS provider:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. SSL Certificate

Vercel automatically provisions SSL certificates. Wait 24-48 hours for DNS propagation.

## Monitoring

### Vercel Analytics

Automatically enabled. View in Vercel Dashboard → Analytics.

### Sentry

1. Go to Sentry Dashboard
2. View errors and performance
3. Set up alerts

### Upstash

1. Go to Upstash Console
2. View Redis metrics
3. Monitor rate limiting

## Rollback

### Instant Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous deployment
3. Click "..." → "Promote to Production"

### Git Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin main --force
```

## Scaling

### Vercel Pro

- Unlimited bandwidth
- Advanced analytics
- Priority support
- Team collaboration

### Database Scaling

Consider migrating from Firebase to:

- PostgreSQL (Supabase, Neon)
- MongoDB (Atlas)
- PlanetScale (MySQL)

### File Storage

Consider migrating to:

- AWS S3
- Cloudflare R2
- Vercel Blob

## Troubleshooting

### Build Failures

```bash
# Check build logs in Vercel Dashboard
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Dependency issues

# Test build locally
npm run build
```

### Runtime Errors

```bash
# Check function logs in Vercel Dashboard
# Check Sentry for error details
# Enable debug logging
```

### Rate Limiting Issues

```bash
# Check Upstash Console for Redis metrics
# Verify environment variables
# Test rate limiting locally
```

### Authentication Issues

```bash
# Verify Firebase credentials
# Check session cookie settings
# Test authentication flow
```

## Security Checklist

- [ ] All environment variables set
- [ ] Firebase rules configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Security headers applied
- [ ] CSRF protection enabled
- [ ] Super admin account created
- [ ] Sentry monitoring active
- [ ] Backup strategy in place

## Backup Strategy

### Database Backup

```bash
# Export Firebase data
firebase database:get / > backup.json

# Schedule regular backups
# Use Firebase scheduled functions
```

### Code Backup

- Git repository (GitHub, GitLab)
- Vercel automatic backups
- Local backups

## Performance Optimization

### Edge Caching

```typescript
// Add to API routes
export const runtime = "edge";
export const revalidate = 60; // Cache for 60 seconds
```

### Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={500}
  height={300}
  alt="Description"
/>
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
# Check .next/analyze/

# Optimize imports
# Use dynamic imports for large components
```

## Maintenance

### Regular Updates

```bash
# Update dependencies monthly
npm update
npm audit fix

# Test thoroughly
npm test
npm run build
```

### Security Audits

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix --force
```

### Performance Monitoring

- Monitor Vercel Analytics weekly
- Check Sentry errors daily
- Review rate limiting metrics
- Analyze user feedback

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@niatools.example.com
- Status: status.niatools.example.com
