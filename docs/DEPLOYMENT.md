# Deployment Guide

## Prerequisites

- Vercel account
- Firebase project with Admin SDK credentials
- Upstash Redis account (for production)
- Sentry account (optional)

## Environment Variables

Configure the following environment variables in your deployment platform:

### Required Variables

```bash
# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Optional Variables

```bash
# Upstash Redis (for production rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Sentry (for error monitoring)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Gemini API (for AI features)
GEMINI_API_KEY=your-gemini-api-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Deployment to Vercel

### Automatic Deployment (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Vercel will automatically deploy on every push to main branch

### Manual Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy to production:
```bash
vercel --prod
```

### Vercel Configuration

The project includes `vercel.json` for optimal configuration:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Deployment to Other Platforms

### Docker Deployment

1. Build Docker image:
```bash
docker build -t niatools .
```

2. Run container:
```bash
docker run -p 3000:3000 \
  -e FIREBASE_ADMIN_PROJECT_ID=your-project-id \
  -e FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email \
  -e FIREBASE_ADMIN_PRIVATE_KEY="your-private-key" \
  niatools
```

### Traditional Server Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. Use a process manager like PM2:
```bash
pm2 start npm --name "niatools" -- start
```

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow
- [ ] Test file upload functionality
- [ ] Verify rate limiting is working
- [ ] Check error monitoring (Sentry)
- [ ] Test all critical workflows
- [ ] Verify security headers are applied
- [ ] Check performance metrics
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy

## Rollback Procedure

### Vercel Rollback

1. Go to Vercel dashboard
2. Navigate to Deployments
3. Find the previous working deployment
4. Click "Promote to Production"

### Manual Rollback

1. Revert to previous commit:
```bash
git revert HEAD
git push origin main
```

2. Or checkout previous version:
```bash
git checkout <previous-commit-hash>
git push origin main --force
```

## Monitoring

### Health Check Endpoint

```bash
curl https://your-domain.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-06T12:00:00.000Z"
}
```

### Performance Monitoring

- Vercel Analytics: Built-in performance monitoring
- Sentry: Error tracking and performance monitoring
- Firebase Console: Database and storage metrics

### Logs

View logs in:
- Vercel Dashboard: Real-time logs
- Sentry: Error logs with context
- Firebase Console: Audit trail logs

## Scaling Considerations

### Horizontal Scaling

- Vercel automatically scales based on traffic
- Firebase scales automatically
- Upstash Redis supports high throughput

### Performance Optimization

1. Enable CDN caching for static assets
2. Optimize images with Next.js Image component
3. Use SWR for client-side caching
4. Implement background job queue for heavy operations

### Database Optimization

1. Add indexes to frequently queried fields
2. Implement pagination for large datasets
3. Use Firebase Realtime Database rules for security
4. Monitor query performance in Firebase Console

## Security Checklist

- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Firebase security rules configured
- [ ] Audit logging enabled
- [ ] Regular security updates

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Verify all dependencies are installed
3. Check TypeScript errors: `npm run type-check`
4. Verify environment variables are set

### Runtime Errors

1. Check Sentry for error details
2. Review Vercel function logs
3. Verify Firebase credentials
4. Check rate limiting configuration

### Performance Issues

1. Review Vercel Speed Insights
2. Check Firebase usage metrics
3. Monitor Redis performance
4. Analyze slow API endpoints

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- Contact support: your-support-email@example.com
