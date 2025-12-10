# 🚀 Sentry Quick Start

## Step 1: Get Your Sentry DSN (5 minutes)

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up or log in
3. Click "Create Project"
4. Select **Remix** as the platform
5. Copy your **DSN** (looks like: `https://abc123@o456.ingest.sentry.io/789`)

## Step 2: Add to Environment Variables

Add to your `.env` file:

```bash
SENTRY_DSN=your-dsn-here
NODE_ENV=production
```

## Step 3: Test It Works

### Option A: Use the Test Route
1. Start your app: `npm run dev`
2. Visit: `http://localhost:3000/app/test-sentry`
3. Click any error button
4. Check your Sentry dashboard for the error

### Option B: Quick Manual Test
Add this anywhere in your app:

```tsx
import * as Sentry from "@sentry/remix";

// Test error
throw new Error("Testing Sentry!");

// Or capture manually
Sentry.captureMessage("Hello from Sentry!");
```

## Step 4: Check Sentry Dashboard

1. Go to [https://sentry.io](https://sentry.io)
2. Open your project
3. Click **Issues** in the sidebar
4. You should see your test errors! 🎉

## Step 5: Deploy to Production

Your app is ready! Sentry will automatically track:
- ✅ Frontend errors
- ✅ Backend errors  
- ✅ Worker job failures
- ✅ Performance issues

## Optional: Source Maps (For Production)

To see readable stack traces in production:

1. Get an auth token from [Sentry Settings → Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/)
2. Add to `.env`:
```bash
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
```
3. Source maps will upload automatically on `npm run build`

## Need Help?

See the full guide: `SENTRY_SETUP.md`

## Workers

Workers automatically report errors! No extra setup needed.

To test worker errors:
```bash
npm run worker:dev
# Trigger a job that will fail
```

Check Sentry for the worker error with full context.

---

**That's it!** You're now tracking production errors like a pro. 🎯
