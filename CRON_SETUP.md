# Cron Job Setup for Schedule Reminders

## Overview

The scheduling system checks for due reminders when something **HTTP GET**s `/api/v1/cron/send-reminders` on your **deployed** app. This project is set up to use an **external** scheduler (for example [cron-job.org](https://cron-job.org)) — **not** Vercel’s built-in Cron product.

## Configuration

### Environment Variables

Add to `.env.local` (use a long random secret; never commit the real value):

```env
CRON_SECRET=your-random-secret-at-least-16-chars
```

Set the **same** `CRON_SECRET` in your host’s production env (e.g. **Vercel → Project → Settings → Environment Variables**). The endpoint compares it to the `secret` query parameter or to a `Bearer` token in the `Authorization` header.

### Production URL (critical)

The job must call your **live HTTPS origin**, never `localhost`:

`https://your-domain.com/api/v1/cron/send-reminders?secret=YOUR_CRON_SECRET`

Use your real deployment host (`*.vercel.app` or custom domain). If cron-job.org (or any external service) is configured with `http://localhost:3000/...`, the request never reaches your production app.

Set **`NEXT_PUBLIC_SITE_URL`** in production to that same public origin (no trailing slash) so reminder emails use correct absolute asset URLs. If it is missing or still `localhost`, the server falls back to `VERCEL_URL` when running on Vercel.

## cron-job.org

1. Create an account at [cron-job.org](https://cron-job.org).
2. **Create cronjob** → **URL**:  
   `https://YOUR_DEPLOYMENT_HOST/api/v1/cron/send-reminders?secret=YOUR_CRON_SECRET`  
   (paste the exact secret you set in `CRON_SECRET`.)
3. **Schedule**: every minute — use their UI equivalent of `* * * * *` (every minute / “Minutely”).
4. **Request method**: **GET** (default).
5. Save and enable the job. Use their execution history / logs to confirm **HTTP 200** and your app’s JSON response.

Other services (EasyCron, UptimeRobot with a short interval, self-hosted curl, etc.) work the same way: **GET** your production URL with `?secret=...`.

## How It Works

1. **Trigger every minute** (from your external scheduler).
2. **5-minute window**: Sends reminders if they’re within about -2 to +3 minutes of the reminder time.
3. **Idempotency**: Tracks sent reminders to avoid duplicates (per schedule / granularity).
4. **Active schedules only**: Processes schedules with `status: "active"`.

## API Endpoint

### GET `/api/v1/cron/send-reminders`

**Authorization** (either is valid):

- Query: `?secret=YOUR_CRON_SECRET` (what cron-job.org typically uses in the URL)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

## Testing Locally

From your machine while `next dev` is running:

```bash
curl "http://localhost:3000/api/v1/cron/send-reminders?secret=YOUR_CRON_SECRET"
```

## Deployment Checklist

1. Deploy the app and set `CRON_SECRET` (and email vars) in the hosting dashboard.
2. Point cron-job.org at the **production** URL with the same secret.
3. Confirm runs in cron-job.org and, if needed, function logs on your host.

## Monitoring

- cron-job.org: job history, status codes, response body snippets.
- Hosting logs (e.g. Vercel function logs) for server errors.
- Firestore: `cronLogs`, `remindersSent` (or equivalent idempotency collection).

## Firestore Collections

### `schedules`

Stores all schedules with deadline and reminder configurations.

### `remindersSent`

Tracks sent reminders to prevent duplicates (see app code for exact ID shape).
