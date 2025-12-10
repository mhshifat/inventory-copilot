# Sentry Logging Guide

This project uses Sentry as a comprehensive logging solution for frontend, backend, and worker processes. All logs are automatically sent to Sentry with proper tags and context for easy filtering and tracking.

## Logger Files

- **`app/lib/logger.client.ts`** - Frontend/Client-side logger
- **`app/lib/logger.server.ts`** - Backend/Server-side logger  
- **`app/lib/logger.worker.ts`** - Worker process logger

## Features

✅ **Automatic component tagging**: All logs tagged with `frontend`, `backend`, or `worker`  
✅ **Structured logging**: Rich context with tags and extra data  
✅ **Error tracking**: Automatic exception capture with full context  
✅ **Performance tracking**: Job timing and duration logging  
✅ **Breadcrumbs**: Track user/system actions leading to errors  
✅ **User context**: Associate logs with specific users  

## Usage

### Frontend (Client)

```tsx
import { logger } from "~/lib/logger.client";

// Basic logging
logger.info("User clicked checkout button");
logger.warn("API response taking longer than expected");
logger.error("Failed to load user data", error);

// Logging with context
logger.info("Payment processed", {
  tags: {
    payment_method: "stripe",
    currency: "USD",
  },
  extra: {
    amount: 99.99,
    orderId: "order_123",
  },
  user: {
    id: "user_456",
    email: "user@example.com",
  },
});

// Track user actions
logger.addBreadcrumb("navigation", "User navigated to checkout page", {
  fromPage: "/cart",
  toPage: "/checkout",
});

// Set user context
logger.setUser({
  id: "user_123",
  email: "user@example.com",
  username: "john_doe",
});

// Clear user context (e.g., on logout)
logger.setUser(null);
```

### Backend (Server)

```tsx
import { logger } from "~/lib/logger.server";

// In loaders/actions
export async function loader({ request }: LoaderFunctionArgs) {
  const startTime = Date.now();
  
  logger.info("Processing product list request");
  
  try {
    const products = await fetchProducts();
    
    const duration = Date.now() - startTime;
    logger.logApiResponse("/api/products", "GET", 200, duration);
    
    return json({ products });
  } catch (error) {
    logger.error("Failed to fetch products", error, {
      tags: {
        endpoint: "/api/products",
        method: "GET",
      },
      extra: {
        query: new URL(request.url).searchParams.toString(),
      },
    });
    throw error;
  }
}

// For API routes
export async function action({ request }: ActionFunctionArgs) {
  logger.logApiRequest("/api/orders", "POST");
  
  try {
    const body = await request.json();
    const order = await createOrder(body);
    
    logger.info("Order created successfully", {
      tags: {
        order_id: order.id,
        order_status: "created",
      },
      extra: {
        orderData: body,
      },
    });
    
    logger.logApiResponse("/api/orders", "POST", 201);
    
    return json({ order }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create order", error, {
      tags: {
        endpoint: "/api/orders",
        method: "POST",
      },
    });
    
    logger.logApiResponse("/api/orders", "POST", 500);
    
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

// Fatal errors (critical issues that need immediate attention)
logger.fatal("Database connection lost", error, {
  tags: {
    severity: "critical",
    requires_immediate_attention: "true",
  },
});
```

### Workers

```typescript
import { logger } from "~/lib/logger.worker";

// In worker job handlers
export function myWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const startTime = Date.now();
      
      // Log job start
      logger.logJobStart(job.id!, "my-job", QUEUE_NAME, job.data);
      
      try {
        // Your job logic here
        await processJob(job.data);
        
        // Log successful completion
        const duration = Date.now() - startTime;
        logger.logJobComplete(job.id!, "my-job", QUEUE_NAME, duration);
      } catch (error) {
        // Log job failure
        logger.logJobFailed(job.id!, "my-job", QUEUE_NAME, error, job.data);
        throw error;
      }
    },
    { connection: redisClient }
  );
  
  // Event handlers
  worker.on('completed', job => {
    logger.info(`Job completed successfully`, {
      tags: {
        job_id: job.id!,
        queue_name: QUEUE_NAME,
        job_status: 'completed',
      },
      jobId: job.id!,
      jobName: QUEUE_NAME,
      queueName: QUEUE_NAME,
    });
  });
  
  worker.on('failed', (job, err) => {
    logger.logJobFailed(
      job?.id || 'unknown',
      QUEUE_NAME,
      QUEUE_NAME,
      err,
      job?.data
    );
  });
  
  return worker;
}

// When adding jobs to queue
export async function addJob(data: JobData) {
  try {
    await queue.add(QUEUE_NAME, data);
    
    logger.info(`Job added to queue`, {
      tags: {
        queue_name: QUEUE_NAME,
        job_type: data.type,
      },
      shopId: data.shopId,
      shop: data.shop,
    });
  } catch (err) {
    logger.error(`Failed to add job to queue`, err, {
      tags: {
        queue_name: QUEUE_NAME,
        job_type: data.type,
      },
      shopId: data.shopId,
      shop: data.shop,
    });
    throw err;
  }
}
```

## Log Levels

- **`debug`**: Detailed information for debugging - **Console only + Breadcrumbs**
- **`info`**: General informational messages - **Console only + Breadcrumbs**
- **`warn`**: Warning messages for potential issues - **Sent to Sentry Issues**
- **`error`**: Error messages for failures - **Sent to Sentry Issues**
- **`fatal`**: Critical errors requiring immediate attention - **Sent to Sentry Issues**

### How Logs Are Handled

**Console Only (debug/info):**
- Logged to console for development visibility
- Added as breadcrumbs in Sentry (appear when errors occur)
- Not sent as separate issues to reduce noise

**Sent to Sentry (warn/error/fatal):**
- Appear in Sentry's **Issues** tab
- Include full context, tags, and breadcrumb history
- Trackable and alertable

This approach ensures:
- ✅ You don't spam Sentry with routine info logs
- ✅ All important issues are tracked in Sentry
- ✅ Breadcrumbs provide context when errors occur
- ✅ Better performance (fewer network calls)  

## Filtering Logs in Sentry

### By Component
- `component:frontend` - All frontend logs
- `component:backend` - All backend logs
- `component:worker` - All worker logs

### By Status Code
- `status_code:500` - All 500 errors
- `status_code:404` - All 404 errors

### By Job Status
- `job_status:completed` - Completed jobs
- `job_status:failed` - Failed jobs

### By Queue
- `queue_name:IMPORT_PRODUCTS` - Product import jobs
- `queue_name:UPSERT_ORDER` - Order jobs
- `queue_name:LOW_STOCK_ALERT` - Low stock alerts

### By HTTP Method
- `http_method:POST` - POST requests
- `http_method:GET` - GET requests

### Custom Tags
Any custom tags you add in the `tags` parameter

## Best Practices

### 1. **Always Add Context**
```typescript
// ❌ Bad
logger.error("Failed");

// ✅ Good
logger.error("Failed to process payment", error, {
  tags: {
    payment_processor: "stripe",
    order_id: orderId,
  },
  extra: {
    amount: paymentAmount,
    currency: "USD",
  },
});
```

### 2. **Use Appropriate Log Levels**
```typescript
// ❌ Bad - Everything as error
logger.error("User logged in");
logger.error("Payment processed");
logger.error("Minor validation issue");

// ✅ Good - Appropriate levels
logger.info("User logged in");
logger.info("Payment processed");
logger.warn("Minor validation issue - proceeding with defaults");
logger.error("Payment failed", error);
logger.fatal("Database connection lost", error);
```

### 3. **Add Breadcrumbs for User Actions**
```typescript
// Track important user actions
logger.addBreadcrumb("user_action", "User added item to cart", {
  productId: "prod_123",
  quantity: 2,
});

logger.addBreadcrumb("navigation", "User navigated to checkout");

// Later, if an error occurs, these breadcrumbs will show the path
logger.error("Checkout failed", error);
```

### 4. **Set User Context Early**
```typescript
// In your auth loader/session handler
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  
  if (user) {
    logger.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }
  
  // Rest of your code...
}
```

### 5. **Log API Performance**
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const startTime = Date.now();
  const route = "/api/products";
  const method = "POST";
  
  logger.logApiRequest(route, method);
  
  try {
    // Your logic
    const result = await createProduct(data);
    
    const duration = Date.now() - startTime;
    logger.logApiResponse(route, method, 201, duration);
    
    return json(result, { status: 201 });
  } catch (error) {
    logger.error("Failed to create product", error);
    logger.logApiResponse(route, method, 500, Date.now() - startTime);
    
    return json({ error: "Failed" }, { status: 500 });
  }
}
```

### 6. **Track Job Lifecycles**
```typescript
// Always log job start, completion, and failures
const startTime = Date.now();

logger.logJobStart(job.id!, jobName, queueName, job.data);

try {
  await processJob(job.data);
  
  const duration = Date.now() - startTime;
  logger.logJobComplete(job.id!, jobName, queueName, duration);
} catch (error) {
  logger.logJobFailed(job.id!, jobName, queueName, error, job.data);
  throw error;
}
```

## Viewing Logs in Sentry

### Where to Find Your Logs

**Issues Tab** (Primary Location):
- All `warn`, `error`, and `fatal` logs appear here
- Each log is an "Issue" you can track, comment on, and resolve
- Click any issue to see full details

**What You'll See:**
1. **Stack traces** (for errors)
2. **Tags** (component, queue_name, api_route, etc.)
3. **Extra context** (custom data you added)
4. **Breadcrumbs** (timeline of debug/info logs leading to the issue)
5. **User information** (if set)
6. **Environment details**

### Understanding Breadcrumbs

When you use `logger.info()` or `logger.debug()`, these don't create separate issues. Instead, they're stored as **breadcrumbs**. When an error occurs, you'll see all the breadcrumbs leading up to it.

**Example:**
```typescript
logger.info("User viewing checkout page");  // Breadcrumb
logger.info("User clicked pay button");     // Breadcrumb
logger.error("Payment failed", error);      // Creates Issue (includes above breadcrumbs)
```

In Sentry Issues → Click on "Payment failed" → See "Breadcrumbs" section → You'll see the two info logs that happened before the error.

### Sentry's "Logs" Tab

Sentry has a dedicated "Logs" feature, but:
- ❌ Only available in **Business/Enterprise** plans
- ❌ Requires additional setup with logging backends
- ❌ Not recommended for most applications

The **Issues + Breadcrumbs** approach we're using is:
- ✅ Available in all Sentry plans (including free)
- ✅ Better for error tracking and alerting
- ✅ More cost-effective
- ✅ Easier to manage

### Filtering in the Issues Tab

### Filtering in the Issues Tab

**Quick Filters:**
1. **Go to Sentry Dashboard** → Your Project → **Issues**
2. **Use the search bar** with filters:
   - `component:frontend` - Frontend logs only
   - `component:backend` - Backend logs only
   - `component:worker` - Worker logs only
   - `level:error` - Errors only
   - `level:fatal` - Critical issues only
   - `queue_name:IMPORT_PRODUCTS` - Specific queue
   - `api_route:/api/checkout` - Specific API endpoint

3. **Performance Tab**: See API response times (if performance monitoring is enabled)

4. **Set Up Alerts**: Issues → Project Settings → Alerts
   - Get notified when errors spike
   - Email/Slack notifications for critical errors

## Environment Control

Remember that logging behavior is controlled by `SENTRY_ENVIRONMENT`:

- `SENTRY_ENVIRONMENT=development` - Logs to console, NOT sent to Sentry
- `SENTRY_ENVIRONMENT=production` - Logs sent to Sentry

Set this in your `.env` file to control behavior during development and testing.

## Example: Complete Checkout Flow

```typescript
// Frontend
import { logger } from "~/lib/logger.client";

function CheckoutPage() {
  const handleCheckout = async () => {
    logger.addBreadcrumb("user_action", "User clicked checkout button");
    
    logger.info("Starting checkout process", {
      tags: {
        cart_items: cartItems.length.toString(),
      },
      extra: {
        totalAmount: calculateTotal(),
      },
    });
    
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ items: cartItems }),
      });
      
      if (!response.ok) {
        throw new Error("Checkout failed");
      }
      
      logger.info("Checkout completed successfully");
    } catch (error) {
      logger.error("Checkout process failed", error, {
        tags: {
          step: "payment_processing",
        },
        extra: {
          cartItems,
          totalAmount: calculateTotal(),
        },
      });
    }
  };
  
  return <button onClick={handleCheckout}>Checkout</button>;
}

// Backend
import { logger } from "~/lib/logger.server";

export async function action({ request }: ActionFunctionArgs) {
  const startTime = Date.now();
  logger.logApiRequest("/api/checkout", "POST");
  
  try {
    const { items } = await request.json();
    
    logger.info("Processing checkout", {
      tags: {
        items_count: items.length.toString(),
      },
    });
    
    const order = await processOrder(items);
    
    logger.info("Checkout processed successfully", {
      tags: {
        order_id: order.id,
        order_status: order.status,
      },
      extra: {
        orderAmount: order.total,
      },
    });
    
    const duration = Date.now() - startTime;
    logger.logApiResponse("/api/checkout", "POST", 200, duration);
    
    return json({ order });
  } catch (error) {
    logger.error("Checkout processing failed", error, {
      tags: {
        endpoint: "/api/checkout",
      },
    });
    
    logger.logApiResponse("/api/checkout", "POST", 500, Date.now() - startTime);
    
    return json({ error: "Checkout failed" }, { status: 500 });
  }
}
```

This comprehensive logging setup ensures that every action in your application is tracked, making debugging and monitoring much easier!
