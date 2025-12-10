import * as Sentry from "@sentry/remix";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Set the environment (production, development, etc.)
  environment: process.env.NODE_ENV || 'development',
  
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture Remix context data on every request
  integrations: [
    Sentry.extraErrorDataIntegration(),
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn']
    })
  ],
  
  // Ignore common non-critical errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
    'Can\'t find variable: ZiteReader',
    'jigsaw is not defined',
    'ComboSearch is not defined',
    // Facebook borked
    'fb_xd_fragment',
    // ISP optimizers
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    // See http://toolbar.conduit.com/Developer/HtmlAndGadget/Methods/JSInjection.aspx
    'conduitPage',
    // Generic error code from errors outside the security sandbox
    'Script error.',
    // Avast extension error
    '_avast_submit'
  ],
  
  // Before sending events, you can modify them
  beforeSend(event, hint) {
    // Filter out errors from development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Event (dev):', event);
      return null; // Don't send to Sentry in development
    }
    
    return event;
  },
});
