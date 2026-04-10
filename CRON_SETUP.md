# Cron Job Setup for Schedule Reminders

## Overview

The scheduling system automatically sends email reminders based on schedule deadlines using a cron job that runs every minute.

## Configuration

### Environment Variables

Add to `.env.local`:

```env
CRON_SECRET=887ab87853c3f4884c70aee0086ae4dcb234c0d0839c8d53f971fed854ac92fa
```

### Vercel Deployment

The `vercel.json` file configures the cron job to run every minute:

```json
{
  "crons": [
    {
      "path": "/api/v1/cron/send-reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

## How It Works

1. **Cron runs every minute** checking for schedules with reminders due
2. **5-minute window**: Sends reminders if they're within -2 to +3 minutes of the reminder time
3. **Idempotency**: Tracks sent reminders to avoid duplicates (one per day per schedule)
4. **Active schedules only**: Only processes schedules with `status: "active"`

## API Endpoint

### GET `/api/v1/cron/send-reminders`

**Authorization**: Requires `CRON_SECRET` via:

- Query parameter: `?secret=YOUR_CRON_SECRET`
- Authorization header: `Bearer YOUR_CRON_SECRET`

**Response**:

```json
{
  "success": true,
  "data": {
    "checked": 5,
    "sent": 2,
    "skipped": 3,
    "errors": 0,
    "duration": 1234,
    "timestamp": "2024-03-26T10:00:00.000Z",
    "details": [
      {
        "scheduleId": "abc123",
        "title": "Submit Report",
        "status": "sent",
        "reason": "Sent to user@example.com"
      }
    ]
  }
}
```

## Testing Locally

Test the cron endpoint manually:

```bash
curl "http://localhost:3000/api/v1/cron/send-reminders?secret=YOUR_CRON_SECRET"
```

## Deployment

1. **Push to Vercel**: The cron job will automatically be configured
2. **Set Environment Variable**: Add `CRON_SECRET` in Vercel dashboard
3. **Verify**: Check Vercel logs to see cron executions

## Monitoring

- Check Vercel logs for cron execution
- Review the response data for sent/skipped/error counts
- Monitor the `remindersSent` collection in Firestore

## Schedule Calculation

The system calculates:

1. **Next Deadline**: Based on deadline type (daily, weekly, monthly, etc.)
2. **Reminder Time**: X days before deadline at specified time
3. **Send Window**: If current time is within 5 minutes of reminder time

## Firestore Collections

### `schedules`

Stores all schedules with deadline and reminder configurations

### `remindersSent`

Tracks sent reminders to prevent duplicates:

- Document ID: `{scheduleId}_{YYYY-MM-DD}`
- Contains: scheduleId, personEmail, sentAt, deadline
