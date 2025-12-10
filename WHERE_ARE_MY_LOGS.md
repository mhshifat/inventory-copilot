# Where to Find Your Logs in Sentry

## Quick Answer

Your logs appear in the **Issues** tab, not the Logs tab. Here's why and how to find them:

## Step-by-Step

### 1. Go to Sentry Dashboard
- Open https://sentry.io
- Select your project

### 2. Click "Issues" in the Left Sidebar
This is where ALL your logs appear:
- ⚠️ Warnings (yellow)
- ❌ Errors (red)
- 🔥 Fatal/Critical errors

### 3. What You WON'T See
- `logger.info()` - These are breadcrumbs only
- `logger.debug()` - These are breadcrumbs only

They don't create separate issues but appear in the breadcrumb timeline when errors occur.

### 4. Click Any Issue to See Details

**Left Panel:**
- Error message and count
- First seen / Last seen
- Frequency graph

**Main Panel - Tabs:**

**📋 Details Tab:**
- Stack trace
- Error message
- Context data

**🏷️ Tags Tab:**
- `component:backend` or `frontend` or `worker`
- `queue_name:IMPORT_PRODUCTS`
- `api_route:/api/checkout`
- `http_method:POST`
- All custom tags

**🔍 Breadcrumbs Tab:** ⭐ **THIS IS WHERE YOUR INFO/DEBUG LOGS ARE**
- Timeline of events before the error
- Shows all `logger.info()` and `logger.debug()` calls
- User actions and system events

**👤 User Tab:**
- User ID, email, username (if you set them)

**📎 Additional Data Tab:**
- All extra context you added
- Request/response data
- Job data for workers

## Example: Finding a Worker Job Failure

1. Go to **Issues**
2. Filter: `component:worker`
3. Click on the failed job issue
4. Check **Breadcrumbs** tab to see:
   - "Job started" (info log)
   - "Processing item 1" (debug log)
   - "Processing item 2" (debug log)
   - Error details in main view

## Example: Finding API Errors

1. Go to **Issues**
2. Filter: `component:backend` and `api_route:/api/orders`
3. Click on the error
4. Check **Breadcrumbs** to see:
   - "API Request: POST /api/orders" (info log)
   - "Validating order data" (info log)
   - Error details in main view
5. Check **Tags** to see:
   - `http_method:POST`
   - `status_code:500`
   - `api_route:/api/orders`

## Why Not the "Logs" Tab?

The "Logs" tab in Sentry is:
- Only for **Business/Enterprise** plans ($$$)
- Requires external logging infrastructure
- Not needed for error tracking

**Our approach (Issues + Breadcrumbs) gives you:**
- ✅ All the logging you need
- ✅ Available in FREE plan
- ✅ Better for tracking and alerting
- ✅ Shows context with breadcrumbs
- ✅ Easier to manage

## Filtering Tips

**In the Issues search bar:**

```
component:worker                    # All worker issues
component:backend status_code:500   # Backend 500 errors
component:frontend level:error      # Frontend errors only
queue_name:IMPORT_PRODUCTS          # Specific queue issues
api_route:/api/checkout             # Specific API errors
```

**Combine filters:**
```
component:worker queue_name:UPSERT_PRODUCT level:error
```

## Setting Up Alerts

Want to get notified?

1. Go to **Alerts** in left sidebar
2. Click "Create Alert"
3. Choose conditions:
   - "Issues matching filter"
   - Add filter: `component:backend level:fatal`
4. Set notification channel (Email, Slack, etc.)
5. Save

Now you'll get notified of critical errors immediately!

## What Gets Logged Where

| Log Level | Console | Sentry Issues | Breadcrumbs |
|-----------|---------|---------------|-------------|
| `debug`   | ✅      | ❌            | ✅          |
| `info`    | ✅      | ❌            | ✅          |
| `warn`    | ✅      | ✅            | ✅          |
| `error`   | ✅      | ✅            | ✅          |
| `fatal`   | ✅      | ✅            | ✅          |

**Breadcrumbs** = Appear in the issue details when errors occur, showing the timeline of events

## Pro Tip: Use Breadcrumbs Effectively

```typescript
// ❌ Don't create unnecessary issues
logger.error("User clicked button");  // Creates an issue!

// ✅ Do use appropriate levels
logger.info("User clicked button");   // Breadcrumb only
logger.error("Button action failed", error);  // Issue with breadcrumb context
```

When the error occurs, you'll see "User clicked button" in the breadcrumbs, giving you context about what the user was doing.

## Need More Help?

Check the full guide: `SENTRY_LOGGING_GUIDE.md`
