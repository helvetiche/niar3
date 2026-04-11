# Scheduling System Migration Guide

Guide for migrating from the old scheduling system to the new nia-reminder-based system.

## 🔄 What Changed?

### Old System

- Manual reminder checking
- No caching (high Firestore reads)
- Basic timezone handling
- Simple email templates
- No idempotency protection

### New System

- Automated cron-based reminders
- Intelligent caching (95% fewer reads)
- Proper Philippine timezone (UTC+8) handling
- Professional NIA-branded emails
- Idempotency to prevent duplicates
- Support for hourly and per-minute schedules

## 📦 New Files Added

```
lib/
├── deadline-calculator.ts      # Core deadline calculation logic
├── reminder-tracker.ts         # Idempotency system
├── schedule-cache.ts          # Performance caching
└── email.ts                   # Updated with new functions

app/api/v1/
├── cron/
│   ├── send-reminders/
│   │   └── route.ts          # Main cron job
│   └── test/
│       └── route.ts          # Manual testing
└── schedules/
    ├── sync-cache/
    │   └── route.ts          # Cache sync endpoint
    └── cache-status/
        └── route.ts          # Cache status endpoint

docs/
├── SCHEDULING-SYSTEM.md       # Full documentation
├── SCHEDULING-SETUP-CHECKLIST.md  # Setup guide
└── SCHEDULING-MIGRATION.md    # This file
```

## 🔧 Breaking Changes

### 1. Email Function Signature

**Old:**

```typescript
sendScheduleReminder(
  to: string,
  subject: string,
  scheduleTitle: string,
  scheduleDescription: string,
  deadline: string,
  personAssigned: string
)
```

**New (Recommended):**

```typescript
sendReminderEmail(
  schedule: Schedule,
  deadlineDate: Date
): Promise<SendReminderResult>
```

**Migration:** The old function still exists for backward compatibility, but use the new one for new code.

### 2. Deadline Calculation

**Old:**

```typescript
// From lib/schedule-helpers.ts
calculateNextDeadline(
  deadline: ScheduleDeadline,
  currentTime: Date,
  _createdAt?: string
): Date
```

**New:**

```typescript
// From lib/deadline-calculator.ts
calculateNextDeadline(
  deadline: ScheduleDeadline,
  referenceDate: Date = new Date(),
  createdAt?: string | Date
): Date
```

**Migration:** The new function has better timezone handling. Update imports:

```typescript
// Old
import { calculateNextDeadline } from "@/lib/schedule-helpers";

// New
import { calculateNextDeadline } from "@/lib/deadline-calculator";
```

### 3. New Schedule Types

The system now supports:

- `hourly` - Every N hours
- `per-minute` - Every N minutes (for testing)

Update your UI to support these new types if needed.

## 📋 Migration Steps

### Step 1: Verify Environment Variables

Add to `.env.local`:

```env
CRON_SECRET=your-secret-key-here
```

Verify existing:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
```

### Step 2: Update Existing Code

#### A. Update Email Imports

Find all files using email functions:

```bash
grep -r "sendScheduleReminder" app/ components/ lib/
```

Update to use new function:

```typescript
// Old
import { sendScheduleReminder } from "@/lib/email";
await sendScheduleReminder(email, subject, title, desc, deadline, person);

// New
import { sendReminderEmail } from "@/lib/email";
const result = await sendReminderEmail(schedule, deadlineDate);
if (result.success) {
  console.log("Email sent:", result.messageId);
}
```

#### B. Update Deadline Calculator Imports

```typescript
// Old
import { calculateNextDeadline } from "@/lib/schedule-helpers";

// New
import { calculateNextDeadline } from "@/lib/deadline-calculator";
```

**Note:** `lib/schedule-helpers.ts` still exists for formatting functions like `formatDeadline()` and `formatReminder()`.

### Step 3: Initialize Cache

```bash
# Call sync endpoint
curl -X POST http://localhost:3000/api/v1/schedules/sync-cache \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or add a UI button:

```typescript
const syncCache = async () => {
  const response = await fetch("/api/v1/schedules/sync-cache", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  console.log("Cache synced:", data);
};
```

### Step 4: Set Up Cron Job

Use an external scheduler (e.g. [cron-job.org](https://cron-job.org)), not Vercel Cron:

- URL: `https://your-domain.com/api/v1/cron/send-reminders?secret=YOUR_SECRET`
- Method: **GET**
- Schedule: every minute (`* * * * *`)

See `CRON_SETUP.md` for a cron-job.org walkthrough.

### Step 5: Test the System

```bash
# 1. Create test schedule (via UI or API)
# Set reminder for 2 minutes from now

# 2. Sync cache
curl -X POST http://localhost:3000/api/v1/schedules/sync-cache \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Test cron manually
curl http://localhost:3000/api/v1/cron/test \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check email was received

# 5. Verify in Firestore:
# - cronLogs collection has entry
# - sentReminders collection has entry
```

### Step 6: Update UI (Optional)

Add cache management to admin panel:

```typescript
// components/ScheduleCacheManager.tsx
import { useState } from 'react';

export function ScheduleCacheManager() {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = async () => {
    const res = await fetch('/api/v1/schedules/cache-status');
    const data = await res.json();
    setStatus(data.data);
  };

  const syncCache = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/v1/schedules/sync-cache', {
        method: 'POST',
      });
      const data = await res.json();
      alert(`Cache synced: ${data.data.reminderCount} schedules`);
      await checkStatus();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <h3>Schedule Cache</h3>
      <button onClick={checkStatus}>Check Status</button>
      <button onClick={syncCache} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Sync Cache'}
      </button>
      {status && (
        <div>
          <p>Last Synced: {status.lastSynced}</p>
          <p>Schedules: {status.scheduleCount}</p>
        </div>
      )}
    </div>
  );
}
```

## 🔍 Verification

### 1. Check Firestore Collections

After migration, you should see:

**scheduleCache** (1 document)

```
upcomingReminders/
  reminders: [...]
  lastSynced: 2024-03-26T10:30:00Z
  scheduleCount: 15
```

**sentReminders** (multiple documents)

```
schedule123_2024-03-26/
  scheduleId: "schedule123"
  date: "2024-03-26"
  sentAt: 2024-03-26T10:15:00Z
  personEmail: "user@example.com"
  scheduleTitle: "Submit Report"
  messageId: "abc123"
```

**cronLogs** (multiple documents)

```
log456/
  timestamp: 2024-03-26T10:15:00Z
  interval: 60000
  checked: 3
  sent: 1
  skipped: 2
  errors: 0
```

### 2. Monitor Cron Execution

Check logs:

```bash
# Vercel
vercel logs --follow

# Or check Firestore cronLogs collection
```

### 3. Verify Email Delivery

- Check inbox for test email
- Verify NIA branding is correct
- Check plain text version

## 🐛 Troubleshooting

### Issue: Cache not syncing

**Solution:**

```bash
# Check Firestore permissions
# Verify authentication token
# Check server logs for errors
```

### Issue: Cron not running

**Solution:**

```bash
# Verify CRON_SECRET is correct
# Check cron-job.org (or your scheduler) execution history and production URL (not localhost)
# Test manually: /api/v1/cron/test
```

### Issue: Emails not sending

**Solution:**

```bash
# Verify email config
# Check EMAIL_APP_PASSWORD (not regular password)
# Test with sendTestEmail()
```

### Issue: Duplicate emails

**Solution:**

```bash
# Check sentReminders collection
# Verify only one cron instance is running
# Check idempotency logic
```

## 📊 Performance Comparison

### Before Migration

- Firestore reads: ~40 per minute
- Daily reads: ~57,600
- Monthly reads: ~1,728,000
- Cost: Higher

### After Migration

- Firestore reads: ~1 per minute (cache)
- Daily reads: ~1,440
- Monthly reads: ~43,200
- Cost: 97% reduction

## 🎯 Rollback Plan

If you need to rollback:

1. **Disable Cron Job**
   - Disable or delete the job in cron-job.org (or your external scheduler)

2. **Revert Code Changes**

   ```bash
   git revert <commit-hash>
   ```

3. **Keep Old Functions**
   - Old email functions still exist
   - Old schedule-helpers.ts still works

4. **Clean Up (Optional)**
   - Delete scheduleCache collection
   - Delete sentReminders collection
   - Delete cronLogs collection

## ✅ Post-Migration Checklist

- [ ] All existing schedules still work
- [ ] Cache is syncing successfully
- [ ] Cron job runs every minute
- [ ] Emails are being sent
- [ ] No duplicate emails
- [ ] Timezone handling is correct
- [ ] UI shows cache status
- [ ] Monitoring is in place
- [ ] Team is trained on new system

## 📚 Additional Resources

- Full documentation: `docs/SCHEDULING-SYSTEM.md`
- Setup checklist: `docs/SCHEDULING-SETUP-CHECKLIST.md`
- API reference: `docs/API.md`
- Original reference: `reference/nia-reminder/`

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Firestore cronLogs for errors
3. Test manually with `/api/v1/cron/test`
4. Check server logs for detailed errors
