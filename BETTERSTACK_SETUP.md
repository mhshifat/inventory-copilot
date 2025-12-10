# BetterStack (Logtail) Setup Guide

## What is BetterStack?

BetterStack (formerly Logtail) is a real-time log streaming and management platform. It provides:

- **Live Log Streaming**: See logs in real-time as they happen
- **Powerful Search & Filtering**: Query logs with advanced search capabilities
- **Log Analysis**: Analyze patterns and trends in your logs
- **Alerting**: Get notified when specific log patterns occur
- **Log Retention**: Keep logs for longer periods than console/Sentry breadcrumbs

## Why Use BetterStack with Sentry?

Your app now uses **dual logging**:

1. **Sentry**: For error tracking and performance monitoring
   - Captures errors and exceptions
   - Tracks user impact
   - Shows error trends and patterns
   - Best for: Production issues, bugs, crashes

2. **BetterStack**: For comprehensive log streaming
   - Captures ALL logs (debug, info, warn, error)
   - Real-time log viewing
   - Historical log analysis
   - Best for: Debugging, auditing, troubleshooting

## Setup Instructions

### 1. Create BetterStack Account

1. Go to [https://betterstack.com/](https://betterstack.com/)
2. Sign up for a free account (includes 1GB/month free)
3. Verify your email

### 2. Create a Source

1. Log in to BetterStack Logs
2. Go to **Sources** in the left sidebar
3. Click **Create Source**
4. Give it a name (e.g., "Inventory App - Production")
5. Select **Node.js** as the platform
6. Click **Create Source**
7. **Copy the Source Token** - you'll need this!

### 3. Add to Your Environment

Add the source token to your `.env` file:

```bash
BETTERSTACK_SOURCE_TOKEN=your-betterstack-source-token-here
BETTERSTACK_SOURCE_HOST=your-betterstack-source-host-here
```

**Important Notes:**
- Use different source tokens for different environments (dev, staging, production)
- Never commit tokens to version control
- The token is safe to expose to the frontend (it's write-only)

### 4. Restart Your App

```bash
# Restart your Remix app
npm run dev

# Restart your worker (if running separately)
npm run worker
```

### 5. Verify Logs Are Flowing

1. Go to [https://logs.betterstack.com/](https://logs.betterstack.com/)
2. Select your source
3. You should see logs appearing in real-time!
4. Test by triggering some actions in your app

## Log Structure

All logs include these common tags:

### Frontend Logs
```json
{
  "message": "User logged in",
  "component": "frontend",
  "environment": "browser",
  "user": { "id": "123", "email": "user@example.com" },
  "tags": { "page": "dashboard" }
}
```

### Backend Logs
```json
{
  "message": "Product updated",
  "component": "backend",
  "environment": "server",
  "shopId": "12345",
  "tags": { "action": "update" }
}
```

### Worker Logs
```json
{
  "message": "Job completed: upsert-product",
  "component": "worker",
  "environment": "worker",
  "jobId": "abc123",
  "jobName": "upsert-product",
  "duration_ms": 1234
}
```

## Using BetterStack

### Search Examples

```
# Find all errors
level:error

# Find logs from a specific component
component:worker

# Find logs for a specific job
jobName:upsert-product

# Find logs from a specific user
user.email:john@example.com

# Combine filters
component:frontend AND level:error

# Time-based search
@timestamp:[now-1h TO now]
```

### Create Alerts

1. Go to **Alerts** in BetterStack
2. Click **Create Alert**
3. Set conditions (e.g., "level:fatal" or "error:*")
4. Choose notification channels (email, Slack, PagerDuty, etc.)
5. Save

### View Live Tail

1. Go to your source in BetterStack
2. Click **Live Tail** button
3. Logs will stream in real-time as they occur
4. Use filters to narrow down what you see

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// Debug: Development info (not in production)
logger.log('Detailed debug info', 'debug', { data });

// Info: Normal operations
logger.log('User logged in', 'info', { userId });

// Warn: Something unexpected but not critical
logger.log('API rate limit approaching', 'warn', { remaining: 10 });

// Error: Something went wrong but recoverable
logger.error('Failed to save data', error, { retrying: true });

// Fatal: Critical failure requiring immediate attention
logger.fatal('Database connection lost', error);
```

### 2. Add Context to Logs

```typescript
// Good: Rich context
logger.log('Product import started', 'info', {
  tags: { action: 'import', source: 'shopify' },
  extra: { 
    productCount: 100, 
    shopId: '12345',
    estimatedTime: '5 minutes'
  }
});

// Bad: No context
logger.log('Started import', 'info');
```

### 3. Use Tags Effectively

```typescript
// Consistent tagging helps with filtering
logger.log('API call made', 'info', {
  tags: {
    component: 'api-client',
    endpoint: '/products',
    method: 'GET',
    status: '200',
  }
});
```

### 4. Environment-Specific Logging

```typescript
// Control log verbosity by environment
if (process.env.SENTRY_ENVIRONMENT === 'development') {
  logger.log('Detailed debug info', 'debug', { data });
}

// Always log errors regardless of environment
logger.error('Critical error', error);
```

## Pricing

BetterStack Pricing (as of 2024):

- **Free**: 1GB/month, 7 days retention
- **Starter**: $10/month, 5GB/month, 30 days retention
- **Growth**: $50/month, 50GB/month, 90 days retention
- **Business**: Custom pricing for larger needs

**Tips to stay within limits:**
- Use appropriate log levels (avoid debug in production)
- Filter sensitive data before logging
- Archive old logs if needed
- Monitor your usage in the BetterStack dashboard

## Troubleshooting

### Logs Not Appearing

1. **Check token is set**: `echo $BETTERSTACK_SOURCE_TOKEN`
2. **Check network**: BetterStack requires outbound HTTPS access
3. **Check logs**: Look for Logtail errors in console
4. **Test connection**: 
   ```typescript
   import { getLogtail, isLogtailEnabled } from './lib/logtail.server';
   console.log('Logtail enabled:', isLogtailEnabled());
   ```

### Too Many Logs

1. **Reduce log level in production**: Remove debug/info logs
2. **Sample logs**: Only log every Nth request
3. **Filter noisy sources**: Ignore health checks, metrics endpoints
4. **Use log sampling**:
   ```typescript
   if (Math.random() < 0.1) { // 10% sampling
     logger.log('Sampled log', 'info', { data });
   }
   ```

### Performance Impact

- BetterStack sends logs asynchronously (non-blocking)
- Minimal performance impact
- Batches logs for efficiency
- If concerned, disable in dev: Set `BETTERSTACK_SOURCE_TOKEN=` in dev `.env`

## Support

- **BetterStack Docs**: [https://betterstack.com/docs/logs/](https://betterstack.com/docs/logs/)
- **Status Page**: [https://status.betterstack.com/](https://status.betterstack.com/)
- **Support**: [support@betterstack.com](mailto:support@betterstack.com)

## Next Steps

1. ✅ Set up BetterStack source
2. ✅ Add token to `.env`
3. ✅ Restart app and worker
4. ✅ Verify logs are flowing
5. ⬜ Create alerts for critical errors
6. ⬜ Set up dashboard for monitoring
7. ⬜ Integrate with your team's notification channels (Slack, PagerDuty, etc.)
