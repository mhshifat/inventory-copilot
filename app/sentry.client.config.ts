import * as Sentry from "@sentry/remix";
import { useEffect } from "react";
import { useLocation, useMatches } from "@remix-run/react";

Sentry.init({
  dsn: window.ENV?.SENTRY_DSN,
  
  // Set the environment
  environment: window.ENV?.SENTRY_ENVIRONMENT || window.ENV?.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: window.ENV?.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay - captures user interactions
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  integrations: [
    Sentry.browserTracingIntegration({
      useEffect,
      useLocation,
      useMatches,
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Ignore common non-critical errors
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Browser extensions
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'Can\'t find variable: ZiteReader',
    'jigsaw is not defined',
    'ComboSearch is not defined',
    'fb_xd_fragment',
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    'conduitPage',
    'Script error.',
    '_avast_submit'
  ],
  
  // Filter out development errors
  beforeSend(event, hint) {
    if (window.ENV?.NODE_ENV === 'development') {
      console.log('Sentry Event (dev):', event);
      return null;
    }
    
    return event;
  },
});
