# Sentry Integration Guide

This project has been configured with Sentry for error tracking and performance monitoring in both the Remix frontend and BullMQ worker processes.

## Setup Instructions

### 1. Create a Sentry Account and Project

1. Go to [https://sentry.io](https://sentry.io) and create an account (if you don't have one)
2. Create a new project:
   - Select **Remix** as the platform for your main app
   - Select **Node.js** for additional configuration
3. After creating the project, you'll receive a **DSN (Data Source Name)**

### 2. Configure Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Required for error tracking
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456

# Optional: For source maps upload in production
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
```

To get the auth token for source maps:
1. Go to Sentry Settings → Auth Tokens
2. Create a new token with `project:releases` and `org:read` scopes
3. Copy the token to your `.env` file

### 3. What's Been Integrated

#### Remix Frontend
- **Client-side tracking** (`entry.client.tsx`):
  - Browser errors and unhandled rejections
  - Performance monitoring with Web Vitals
  - Session replay (captures user interactions on errors)
  
- **Server-side tracking** (`entry.server.tsx`):
  - Server rendering errors
  - API route errors
  
- **Error Boundary** (`root.tsx`):
  - Catches and reports React component errors
  - Sends error context to Sentry

#### Worker Process
- **Worker initialization** (`worker.ts`):
  - Captures worker startup errors
  - Reports graceful shutdown issues
  
- **Individual workers** (all `*-worker.server.ts` files):
  - Tracks job failures with full context
  - Reports queue processing errors
  - Includes job data and metadata in error reports

### 4. Testing the Integration

#### Test Frontend Errors

Add this to any route component:

```tsx
export default function TestRoute() {
  return (
    <button onClick={() => {
      throw new Error("Test Sentry Error!");
    }}>
      Trigger Error
    </button>
  );
}
```

#### Test Worker Errors

The workers automatically capture all job failures. Check your Sentry dashboard after any worker job fails.

### 5. Viewing Errors in Sentry

1. Go to your Sentry project dashboard
2. Navigate to **Issues** to see all captured errors
3. Click on any issue to see:
   - Stack trace
   - Breadcrumbs (user actions leading to the error)
   - Environment info
   - User context
   - Performance data

### 6. Development vs Production

- **Development**: Errors are logged to console but NOT sent to Sentry (to avoid noise)
- **Production**: All errors are sent to Sentry for tracking

To test Sentry in development, temporarily modify the `beforeSend` function in the config files to always return the event.

### 7. Performance Monitoring

The integration includes performance monitoring:

- **Frontend**: Tracks page loads, component renders, and user interactions
- **Backend**: Monitors API response times and database queries
- **Workers**: Tracks job processing times

Adjust the `tracesSampleRate` in the config files:
- `1.0` = 100% of transactions (development/testing)
- `0.1` = 10% of transactions (production, to reduce costs)

### 8. Source Maps

When you build for production with `npm run build`, source maps are automatically uploaded to Sentry (if `SENTRY_AUTH_TOKEN` is configured). This allows you to see the original source code in error stack traces, not the minified/compiled code.

### 9. Key Features Enabled

✅ Error tracking (client & server)  
✅ Performance monitoring  
✅ Session replay on errors  
✅ Breadcrumbs (user actions timeline)  
✅ Release tracking  
✅ Source maps upload  
✅ Worker job failure tracking  
✅ Custom error context and tags  

### 10. Customization

#### Filtering Errors

Edit the `ignoreErrors` array in the config files to filter out known non-critical errors.

#### Adding Custom Context

Use Sentry's API in your code:

```tsx
import * as Sentry from "@sentry/remix";

// Add user context
Sentry.setUser({ id: "123", email: "user@example.com" });

// Add custom tags
Sentry.setTag("feature", "checkout");

// Add breadcrumbs
Sentry.addBreadcrumb({
  category: "action",
  message: "User clicked buy button",
  level: "info",
});

// Manually capture an error
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { section: "payment" },
    extra: { orderValue: 100 }
  });
}
```

### 11. Best Practices

- **Don't send sensitive data**: Review error context before sending
- **Set appropriate sample rates**: 100% sampling can be expensive
- **Use error boundaries**: Wrap critical UI sections in error boundaries
- **Add context**: Use tags and custom context for better error grouping
- **Monitor performance budget**: Track your Sentry quota usage

### 12. Troubleshooting

**Errors not showing in Sentry?**
- Check that `SENTRY_DSN` is correctly set
- Verify `NODE_ENV` is set to `production`
- Check browser console for Sentry initialization errors
- Look at the Network tab to see if events are being sent

**Too many errors?**
- Adjust `ignoreErrors` to filter noise
- Use `beforeSend` to filter or modify events
- Reduce sample rates if needed

## Additional Resources

- [Sentry Remix Docs](https://docs.sentry.io/platforms/javascript/guides/remix/)
- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
- [Error Monitoring Best Practices](https://docs.sentry.io/product/issues/)
