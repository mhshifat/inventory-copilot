import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Set the environment
  environment: process.env.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn']
    }),
  ],
  
  // Add context about the worker
  initialScope: {
    tags: {
      component: 'worker',
      worker_type: 'bullmq'
    }
  },
  
  // Before sending events
  beforeSend(event, hint) {
    // Add worker-specific context
    event.tags = {
      ...event.tags,
      process_type: 'worker',
    };
    
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Worker Event (dev):', event);
      return null;
    }
    
    return event;
  },
});

export default Sentry;
