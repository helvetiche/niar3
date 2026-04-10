# NIA Tools Scheduling System

Complete implementation of the nia-reminder scheduling system in nia-tools.

## 📋 Implementation Status

### ✅ Completed Modules

1. **Deadline Calculator** (`lib/deadline-calculator.ts`)
   - Calculates next deadline occurrences
   - Handles Philippine timezone (UTC+8)
   - Supports all deadline types: daily, weekly, monthly, interval, hourly, per-minute
   - Calculates reminder times
   - 5-minute sending window

2. **Reminder Tracker** (`lib/reminder-tracker.ts`)
   - Idempotency system to prevent duplicate emails
   - Tracks sent reminders in Firestore
   - Supports day/hour/minute granularity
   - Automatic cleanup of old markers (>1 hour)

3. **Schedule Cache** (`lib/schedule-cache.ts`)
   - Caches all active schedules for performance
   - Reduces Firestore reads from 40+/min to near-zero
   - Calendar cache for UI optimization
   - Employee cache for task lists

4. **Email System** (`lib/email.ts`)
   - NIA-branded HTML email templates
   - Plain text fallback
   - Nodemailer integration
   - Message ID tracking

5. **Cron Job Runner** (`app/api/v1/cron/send-reminders/route.ts`)
   - Main execution logic
   - Cache-first approach
   - 5-minute processing window
   - Comprehensive logging
   - Authorization via CRON_SECRET

6. **API Endpoints**
   - `/api/v1/schedules/sync-cache` - Sync cache
   - `/api/v1/schedules/cache-status` - Get cache status
   - `/api/v1/cron/test` - Test cron manually

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cron Job (Every Minute)                  │
│                  /api/v1/cron/send-reminders                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Schedule Cache                          │
│              (scheduleCache/upcomingReminders)               │
│                  Loads all active schedules                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Deadline Calculator                        │
│         Calculates next deadline & reminder time             │
│              (on-the-fly, no pre-calculation)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    5-Minute Window Filter                    │
│              (-2 minutes to +3 minutes window)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Idempotency Check                          │
│              (sentReminders collection)                      │
│           Has this reminder been sent already?               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Send Email                              │
│              (Nodemailer + NIA Template)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Mark as Sent                               │
│         (sentReminders/{scheduleId}_{timestamp})             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Log to cronLogs                           │
│              Track execution stats & timing                  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Setup Instructions

### 1. Environment Variables

Ensure these are set in `.env.local`:

```env
# Cron Job Secret
CRON_SECRET=your-secret-key-here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
```

### 2. Initialize Cache

Before the cron job can run, you need to sync the cache:

```bash
# Call the sync endpoint
curl -X POST http://localhost:3000/api/v1/schedules/sync-cache \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Or use the UI to click "Sync Cache" button (if implemented).

### 3. Set Up Cron Job

#### Option A: Vercel Cron (Recommended for Production)

Add to `vercel.json`:

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

#### Option B: External Cron Service (Cron-job.org, EasyCron, etc.)

Set up a cron job to hit:

```
https://your-domain.com/api/v1/cron/send-reminders?secret=YOUR_CRON_SECRET
```

Schedule: Every minute (`* * * * *`)

### 4. Test the System

```bash
# Test cron job manually
curl http://localhost:3000/api/v1/cron/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Check cache status
curl http://localhost:3000/api/v1/schedules/cache-status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## 📊 Firestore Collections

### schedules

Main collection for schedule data:

```typescript
{
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: ScheduleDeadline;
  reminderDate: ReminderDate;
  personAssigned: string;
  personEmail: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

### scheduleCache

Performance cache (single document):

```typescript
{
  reminders: CachedReminder[];
  lastSynced: Date;
  scheduleCount: number;
}
```

### sentReminders

Idempotency tracking:

```typescript
{
  scheduleId: string;
  date: string; // YYYY-MM-DD
  sentAt: Date;
  personEmail: string;
  scheduleTitle: string;
  messageId?: string;
}
```

### cronLogs

Execution history:

```typescript
{
  timestamp: Date;
  interval: number | null;
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
  createdAt: Date;
}
```

## 🔧 Key Functions

### Deadline Calculator

```typescript
calculateNextDeadline(deadline, referenceDate, createdAt): Date
calculateReminderDate(reminderDate, deadlineDate): Date
shouldSendReminder(reminderDate, currentDate): boolean
```

### Reminder Tracker

```typescript
hasReminderBeenSent(scheduleId, date, granularity): Promise<boolean>
markReminderAsSent(scheduleId, date, metadata, granularity): Promise<void>
cleanupOldReminders(): Promise<number>
```

### Schedule Cache

```typescript
syncScheduleCache(): Promise<{success, count, error?}>
getCachedSchedules(): Promise<CachedReminder[]>
getCacheStatus(): Promise<{exists, lastSynced?, scheduleCount?}>
```

### Email System

```typescript
sendReminderEmail(schedule, deadlineDate): Promise<SendReminderResult>
verifyEmailConfig(): Promise<{valid, error?}>
```

## 📈 Performance Optimizations

1. **Cache-First Approach**
   - Reduces Firestore reads from 40+/min to near-zero
   - Single document read per cron run
   - Estimated savings: 57,600 reads/day

2. **On-the-Fly Calculation**
   - No need to pre-calculate and store reminder times
   - Always accurate, no stale data
   - Simpler cache structure

3. **5-Minute Window**
   - Only processes schedules with imminent reminders
   - Reduces unnecessary calculations
   - Tolerates cron timing variations

4. **Batch Cleanup**
   - Removes old markers in batches of 100
   - Prevents collection bloat
   - Runs only when needed

## 🐛 Debugging

### Check Cache Status

```bash
curl http://localhost:3000/api/v1/schedules/cache-status
```

### Manually Trigger Cron

```bash
curl http://localhost:3000/api/v1/cron/test
```

### View Cron Logs

Check Firestore `cronLogs` collection for execution history.

### Common Issues

1. **No emails being sent**
   - Check if cache is synced
   - Verify CRON_SECRET is correct
   - Check email configuration
   - Look at cronLogs for errors

2. **Duplicate emails**
   - Check sentReminders collection
   - Verify idempotency is working
   - Check granularity settings

3. **Wrong timing**
   - Verify Philippine timezone handling
   - Check deadline calculator logic
   - Review 5-minute window settings

## 🔐 Security

- **CRON_SECRET**: Required for cron endpoint access
- **Authentication**: All management endpoints require auth
- **Rate Limiting**: Consider adding rate limits to public endpoints
- **Email Validation**: Validates email addresses before sending

## 📝 Next Steps

1. **UI Integration**
   - Add "Sync Cache" button to admin panel
   - Display cache status in UI
   - Show cron execution logs

2. **Monitoring**
   - Set up alerts for cron failures
   - Track email delivery rates
   - Monitor cache sync frequency

3. **Enhancements**
   - Auto-sync cache on schedule CRUD operations
   - Add retry mechanism for failed emails
   - Implement distributed lock for multiple instances
   - Add email delivery tracking

## 📚 References

- Original implementation: `reference/nia-reminder/`
- Deadline types: See `types/schedule.ts`
- Email templates: See `lib/email.ts`
- Cron setup guide: See `CRON_SETUP.md`
