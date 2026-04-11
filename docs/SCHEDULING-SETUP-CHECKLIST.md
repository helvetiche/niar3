# Scheduling System Setup Checklist

Quick checklist to get the NIA Tools scheduling system up and running.

## ✅ Pre-Implementation Checklist

- [x] Module 1: Deadline Calculator (`lib/deadline-calculator.ts`)
- [x] Module 2: Reminder Tracker (`lib/reminder-tracker.ts`)
- [x] Module 3: Schedule Cache (`lib/schedule-cache.ts`)
- [x] Module 4: Email System (`lib/email.ts`)
- [x] Module 5: Cron Job Runner (`app/api/v1/cron/send-reminders/route.ts`)
- [x] Module 6: API Endpoints (sync-cache, cache-status, test)

## 🔧 Configuration Checklist

### 1. Environment Variables

- [ ] `CRON_SECRET` is set in `.env.local`
- [ ] `EMAIL_HOST` is configured
- [ ] `EMAIL_PORT` is configured
- [ ] `EMAIL_USER` is configured
- [ ] `EMAIL_APP_PASSWORD` is configured

### 2. Firestore Collections

- [ ] `schedules` collection exists
- [ ] `scheduleCache` collection will be created on first sync
- [ ] `sentReminders` collection will be created on first send
- [ ] `cronLogs` collection will be created on first run

### 3. Initial Cache Sync

- [ ] Call `/api/v1/schedules/sync-cache` to initialize cache
- [ ] Verify cache status via `/api/v1/schedules/cache-status`

### 4. Cron Job Setup

- [ ] Sign up for an external scheduler (e.g. [cron-job.org](https://cron-job.org))
- [ ] Configure a **GET** to production: `https://your-domain.com/api/v1/cron/send-reminders?secret=YOUR_SECRET` (never `localhost` for production)
- [ ] Set schedule to every minute (`* * * * *`)
- [ ] Confirm executions succeed in the scheduler’s history
- [ ] See `CRON_SETUP.md` for full details

### 5. Testing

- [ ] Create a test schedule with reminder in next 5 minutes
- [ ] Sync the cache
- [ ] Wait for cron to run
- [ ] Verify email was received
- [ ] Check `cronLogs` collection for execution record
- [ ] Check `sentReminders` collection for idempotency record

## 🧪 Testing Commands

```bash
# 1. Sync cache
curl -X POST http://localhost:3000/api/v1/schedules/sync-cache \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Check cache status
curl http://localhost:3000/api/v1/schedules/cache-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Test cron manually
curl http://localhost:3000/api/v1/cron/test \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Test cron with secret (direct)
curl "http://localhost:3000/api/v1/cron/send-reminders?secret=YOUR_CRON_SECRET"
```

## 📋 Verification Checklist

### Email System

- [ ] Email configuration is valid (`verifyEmailConfig()`)
- [ ] Test email can be sent
- [ ] NIA template renders correctly
- [ ] Plain text fallback works

### Deadline Calculator

- [ ] Daily schedules calculate correctly
- [ ] Weekly schedules calculate correctly
- [ ] Monthly schedules calculate correctly
- [ ] Philippine timezone (UTC+8) is handled properly
- [ ] 5-minute window works as expected

### Reminder Tracker

- [ ] Idempotency prevents duplicate emails
- [ ] Different granularities work (day/hour/minute)
- [ ] Old markers are cleaned up automatically

### Schedule Cache

- [ ] Cache syncs successfully
- [ ] Cached schedules are retrieved correctly
- [ ] Cache status shows accurate information

### Cron Job

- [ ] Cron runs every minute
- [ ] Authorization works (CRON_SECRET)
- [ ] Schedules in window are processed
- [ ] Emails are sent successfully
- [ ] Execution is logged to cronLogs

## 🚨 Troubleshooting

### No emails being sent?

1. Check cache is synced: `/api/v1/schedules/cache-status`
2. Verify email config: Check EMAIL\_\* env variables
3. Check cron logs: Look at `cronLogs` collection
4. Test manually: Use `/api/v1/cron/test`

### Duplicate emails?

1. Check `sentReminders` collection
2. Verify idempotency is working
3. Check if multiple cron instances are running

### Wrong timing?

1. Verify schedule deadline configuration
2. Check reminder date settings
3. Test deadline calculator with known dates
4. Verify Philippine timezone handling

### Cache not updating?

1. Call sync endpoint after schedule changes
2. Check Firestore permissions
3. Verify cache document exists

## 📊 Monitoring

### Key Metrics to Track

- [ ] Cron execution frequency (should be ~1 minute)
- [ ] Email success rate (sent vs errors)
- [ ] Cache hit rate (should be 100%)
- [ ] Firestore read count (should be minimal)
- [ ] Email delivery time

### Firestore Collections to Monitor

- [ ] `cronLogs` - Execution history
- [ ] `sentReminders` - Sent email tracking
- [ ] `scheduleCache` - Cache status
- [ ] `schedules` - Active schedules

## 🎯 Success Criteria

- ✅ Cron runs every minute without errors
- ✅ Emails are sent within 5-minute window
- ✅ No duplicate emails are sent
- ✅ Cache reduces Firestore reads by >95%
- ✅ All schedule types work correctly
- ✅ Philippine timezone is handled properly
- ✅ System logs execution details

## 📝 Next Steps After Setup

1. **UI Integration**
   - Add cache sync button to admin panel
   - Display cache status
   - Show recent cron logs

2. **Monitoring Dashboard**
   - Visualize cron execution stats
   - Track email delivery rates
   - Alert on failures

3. **Enhancements**
   - Auto-sync on schedule changes
   - Email retry mechanism
   - Delivery tracking
   - SMS notifications (optional)

## 📚 Documentation

- Full system docs: `docs/SCHEDULING-SYSTEM.md`
- API reference: `docs/API.md`
- Architecture: `docs/ARCHITECTURE.md`
- Original reference: `reference/nia-reminder/`
