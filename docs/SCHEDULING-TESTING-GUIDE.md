# Scheduling System Testing Guide

Complete guide to test the NIA Tools scheduling system end-to-end.

## 🧪 Testing Overview

We'll test in this order:

1. **Email Configuration** - Verify email system works
2. **Cache System** - Test cache sync and retrieval
3. **Deadline Calculator** - Verify calculations are correct
4. **Manual Cron Test** - Test the cron job manually
5. **Live Schedule Test** - Create real schedule and wait for email
6. **Idempotency Test** - Verify no duplicate emails
7. **Performance Test** - Check Firestore read optimization

## 📋 Prerequisites

- [ ] `.env.local` has all required variables
- [ ] Firebase is configured
- [ ] Email credentials are valid
- [ ] Server is running (`npm run dev`)

## 1️⃣ Test Email Configuration

### Step 1.1: Verify Environment Variables

```bash
# Check your .env.local has these:
grep EMAIL_ .env.local
```

Expected output:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
```

### Step 1.2: Test Email Sending

Create a test script or use the existing test email endpoint:

```bash
# Option A: Using curl (if you have a test endpoint)
curl -X POST http://localhost:3000/api/v1/schedules/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "your-email@gmail.com"}'

# Option B: Create a quick test file
```

Create `scripts/test-email.ts`:

```typescript
import { sendTestEmail } from "@/lib/email";

async function testEmail() {
  try {
    await sendTestEmail("your-email@gmail.com");
    console.log("✅ Test email sent successfully!");
  } catch (error) {
    console.error("❌ Email failed:", error);
  }
}

testEmail();
```

Run it:

```bash
npx tsx scripts/test-email.ts
```

**Expected Result:** You should receive a test email with NIA branding.

## 2️⃣ Test Cache System

### Step 2.1: Create Test Schedules

First, create 2-3 test schedules via your UI or API:

```bash
curl -X POST http://localhost:3000/api/v1/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Schedule 1",
    "description": "Testing the scheduling system",
    "deadline": {
      "type": "daily",
      "time": "14:00"
    },
    "reminderDate": {
      "type": "relative",
      "daysBefore": 0,
      "time": "13:55"
    },
    "personAssigned": "Test User",
    "personEmail": "your-email@gmail.com",
    "status": "active"
  }'
```

### Step 2.2: Sync the Cache

```bash
curl -X POST http://localhost:3000/api/v1/schedules/sync-cache \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "reminderCount": 3,
    "syncedAt": "2024-03-26T10:30:00.000Z",
    "message": "Successfully synced 3 schedules to cache"
  }
}
```

### Step 2.3: Check Cache Status

```bash
curl http://localhost:3000/api/v1/schedules/cache-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "exists": true,
    "lastSynced": "2024-03-26T10:30:00.000Z",
    "scheduleCount": 3,
    "reminderCount": 3,
    "message": "Cache is active and ready"
  }
}
```

### Step 2.4: Verify in Firestore

Open Firebase Console → Firestore → `scheduleCache` collection:

- Should have 1 document: `upcomingReminders`
- Should contain array of your schedules
- Check `lastSynced` timestamp

## 3️⃣ Test Deadline Calculator

Create `scripts/test-deadline-calculator.ts`:

```typescript
import {
  calculateNextDeadline,
  calculateReminderDate,
  shouldSendReminder,
} from "@/lib/deadline-calculator";

function testDeadlineCalculator() {
  console.log("🧪 Testing Deadline Calculator\n");

  const now = new Date();
  console.log(`Current time (UTC): ${now.toISOString()}`);
  console.log(
    `Current time (PH): ${new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString()}\n`
  );

  // Test 1: Daily deadline
  console.log("Test 1: Daily at 14:00 PH time");
  const dailyDeadline = calculateNextDeadline(
    {
      type: "daily",
      time: "14:00",
    },
    now
  );
  console.log(`Next deadline: ${dailyDeadline.toISOString()}`);
  console.log(
    `In PH time: ${new Date(dailyDeadline.getTime() + 8 * 60 * 60 * 1000).toISOString()}\n`
  );

  // Test 2: Reminder calculation
  console.log("Test 2: Reminder 1 day before at 09:00");
  const reminderDate = calculateReminderDate(
    {
      type: "relative",
      daysBefore: 1,
      time: "09:00",
    },
    dailyDeadline
  );
  console.log(`Reminder time: ${reminderDate.toISOString()}`);
  console.log(
    `In PH time: ${new Date(reminderDate.getTime() + 8 * 60 * 60 * 1000).toISOString()}\n`
  );

  // Test 3: Should send check
  console.log("Test 3: Should send reminder?");
  const testTime1 = new Date(reminderDate.getTime() - 1 * 60 * 1000); // 1 min before
  const testTime2 = new Date(reminderDate.getTime() + 2 * 60 * 1000); // 2 min after
  const testTime3 = new Date(reminderDate.getTime() + 5 * 60 * 1000); // 5 min after

  console.log(`1 min before: ${shouldSendReminder(reminderDate, testTime1)}`);
  console.log(`2 min after: ${shouldSendReminder(reminderDate, testTime2)}`);
  console.log(`5 min after: ${shouldSendReminder(reminderDate, testTime3)}`);
}

testDeadlineCalculator();
```

Run it:

```bash
npx tsx scripts/test-deadline-calculator.ts
```

**Expected Output:**

- Daily deadline should be at 14:00 Philippine time (06:00 UTC)
- Reminder should be 1 day before at 09:00 Philippine time (01:00 UTC)
- Should send = true for times within -2 to +3 minute window

## 4️⃣ Test Manual Cron Execution

### Step 4.1: Test Cron Endpoint Directly

```bash
# Using the test endpoint (requires auth)
curl http://localhost:3000/api/v1/cron/test \
  -H "Authorization: Bearer YOUR_TOKEN"

# OR directly with secret
curl "http://localhost:3000/api/v1/cron/send-reminders?secret=YOUR_CRON_SECRET"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "checked": 0,
    "sent": 0,
    "skipped": 0,
    "errors": 0,
    "cleanedUp": 0,
    "cacheHit": true,
    "details": [],
    "duration": 150,
    "timestamp": "2024-03-26T10:35:00.000Z",
    "optimization": {
      "cacheUsed": true,
      "upcomingInWindow": 0,
      "totalCached": 3,
      "estimatedReadsSaved": 3
    },
    "summary": {
      "totalSchedules": 0,
      "emailsSent": 0,
      "skippedNotInWindow": 0,
      "errors": 0,
      "oldRemindersCleanedUp": 0
    }
  }
}
```

### Step 4.2: Check Firestore Logs

Open Firebase Console → Firestore → `cronLogs` collection:

- Should have a new document with execution stats
- Check `timestamp`, `checked`, `sent`, `skipped`, `errors`

## 5️⃣ Test Live Schedule (End-to-End)

This is the most important test!

### Step 5.1: Create Schedule with Imminent Reminder

Create a schedule with reminder in 3-4 minutes:

```bash
# Calculate time 3 minutes from now
# If current time is 10:30, set reminder for 10:33

curl -X POST http://localhost:3000/api/v1/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "LIVE TEST - Delete After",
    "description": "Testing live reminder delivery",
    "deadline": {
      "type": "daily",
      "time": "23:59"
    },
    "reminderDate": {
      "type": "absolute",
      "dateTime": "2024-03-26T10:33:00.000Z"
    },
    "personAssigned": "Your Name",
    "personEmail": "your-email@gmail.com",
    "status": "active"
  }'
```

**Note:** Adjust the `dateTime` to be 3-4 minutes from current UTC time.

### Step 5.2: Sync Cache

```bash
curl -X POST http://localhost:3000/api/v1/schedules/sync-cache \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5.3: Wait and Monitor

**Option A: Watch Server Logs**

```bash
# In your terminal running npm run dev
# Watch for cron execution logs
```

**Option B: Poll Cron Endpoint**

```bash
# Run this every 30 seconds
watch -n 30 'curl -s "http://localhost:3000/api/v1/cron/send-reminders?secret=YOUR_SECRET" | jq'
```

**Option C: Check Firestore**

- Watch `cronLogs` collection for new entries
- Watch `sentReminders` collection for your schedule

### Step 5.4: Verify Email Received

Within 5 minutes, you should receive:

- ✅ Email with NIA branding
- ✅ Green header "National Irrigation Administration"
- ✅ Yellow highlight box with schedule details
- ✅ Correct deadline and schedule information

### Step 5.5: Check Firestore Records

**cronLogs:**

```json
{
  "timestamp": "2024-03-26T10:33:30.000Z",
  "interval": 60000,
  "checked": 1,
  "sent": 1,
  "skipped": 0,
  "errors": 0
}
```

**sentReminders:**

```json
{
  "scheduleId": "abc123",
  "date": "2024-03-26",
  "sentAt": "2024-03-26T10:33:30.000Z",
  "personEmail": "your-email@gmail.com",
  "scheduleTitle": "LIVE TEST - Delete After",
  "messageId": "xyz789"
}
```

## 6️⃣ Test Idempotency (No Duplicates)

### Step 6.1: Trigger Cron Again

```bash
# Immediately trigger cron again
curl "http://localhost:3000/api/v1/cron/send-reminders?secret=YOUR_SECRET"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "checked": 1,
    "sent": 0,
    "skipped": 1,
    "details": [
      {
        "scheduleId": "abc123",
        "title": "LIVE TEST - Delete After",
        "status": "skipped",
        "reason": "Already sent (day granularity)"
      }
    ]
  }
}
```

### Step 6.2: Verify No Duplicate Email

- ✅ Should NOT receive another email
- ✅ `sentReminders` collection should have only 1 entry
- ✅ Cron log should show `skipped: 1`

## 7️⃣ Test Performance (Firestore Reads)

### Step 7.1: Check Firestore Usage

Open Firebase Console → Usage tab:

- Note the read count before test
- Run cron 10 times
- Check read count after

**Expected:**

- Without cache: ~40 reads per run = 400 reads
- With cache: ~1 read per run = 10 reads
- **Savings: 97.5%**

### Step 7.2: Verify Cache Hit Rate

Check cron response:

```json
{
  "optimization": {
    "cacheUsed": true,
    "totalCached": 10,
    "estimatedReadsSaved": 10
  }
}
```

## 8️⃣ Test Different Schedule Types

Create and test each type:

### Daily Schedule

```json
{
  "deadline": { "type": "daily", "time": "14:00" },
  "reminderDate": { "type": "relative", "daysBefore": 0, "time": "13:55" }
}
```

### Weekly Schedule

```json
{
  "deadline": { "type": "weekly", "dayOfWeek": 1, "time": "09:00" },
  "reminderDate": { "type": "relative", "daysBefore": 1, "time": "09:00" }
}
```

### Monthly Schedule

```json
{
  "deadline": { "type": "monthly", "dayOfMonth": 15, "time": "17:00" },
  "reminderDate": { "type": "relative", "daysBefore": 3, "time": "09:00" }
}
```

### Hourly Schedule (for testing)

```json
{
  "deadline": { "type": "hourly", "hours": 1 },
  "reminderDate": { "type": "relative", "daysBefore": 0, "time": "00:00" }
}
```

## 🐛 Troubleshooting Tests

### Email Not Received

**Check:**

1. Email credentials in `.env.local`
2. Gmail "Less secure app access" or App Password
3. Spam folder
4. Server logs for errors
5. `cronLogs` for error messages

**Debug:**

```bash
# Test email config
npx tsx scripts/test-email.ts

# Check email env vars
echo $EMAIL_USER
echo $EMAIL_HOST
```

### Cache Not Working

**Check:**

1. Cache was synced: `/api/v1/schedules/cache-status`
2. Firestore `scheduleCache` collection exists
3. Schedules are `status: "active"`

**Debug:**

```bash
# Re-sync cache
curl -X POST http://localhost:3000/api/v1/schedules/sync-cache \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check Firestore directly
```

### Cron Not Running

**Check:**

1. `CRON_SECRET` is set
2. Authorization header or query param is correct
3. Server is running
4. No errors in server logs

**Debug:**

```bash
# Test with correct secret
curl "http://localhost:3000/api/v1/cron/send-reminders?secret=$(grep CRON_SECRET .env.local | cut -d= -f2)"

# Check server logs
tail -f .next/server.log
```

### Wrong Timing

**Check:**

1. Philippine timezone (UTC+8) is handled correctly
2. Deadline time is in 24-hour format
3. Reminder time calculation is correct

**Debug:**

```bash
# Run deadline calculator test
npx tsx scripts/test-deadline-calculator.ts

# Check current time in both timezones
date -u  # UTC
TZ='Asia/Manila' date  # Philippine time
```

## ✅ Test Checklist

After completing all tests, verify:

- [ ] Email system works (test email received)
- [ ] Cache syncs successfully
- [ ] Cache status shows correct data
- [ ] Deadline calculator produces correct times
- [ ] Manual cron execution works
- [ ] Live schedule sends email within 5-minute window
- [ ] Email has correct NIA branding
- [ ] Idempotency prevents duplicates
- [ ] Firestore reads are optimized (97% reduction)
- [ ] cronLogs collection tracks executions
- [ ] sentReminders collection tracks sent emails
- [ ] Different schedule types work correctly
- [ ] Philippine timezone (UTC+8) is handled properly

## 📊 Success Metrics

Your system is working correctly if:

1. **Email Delivery:** 100% of reminders in window are sent
2. **No Duplicates:** 0 duplicate emails sent
3. **Performance:** 95%+ reduction in Firestore reads
4. **Timing:** Emails sent within 5-minute window
5. **Reliability:** Cron runs every minute without errors

## 🚀 Next Steps After Testing

1. **Set up production cron** (e.g. cron-job.org — see `CRON_SETUP.md`)
2. **Add monitoring** (alerts for failures)
3. **Create UI** for cache management
4. **Document** for team
5. **Train users** on the system

## 📚 Additional Resources

- Full docs: `docs/SCHEDULING-SYSTEM.md`
- Setup guide: `docs/SCHEDULING-SETUP-CHECKLIST.md`
- Migration guide: `docs/SCHEDULING-MIGRATION.md`
- API reference: `docs/API.md`
