import { RemixBrowser, useLocation, useMatches } from "@remix-run/react";
import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import * as Sentry from "@sentry/remix";

// Initialize Sentry on the client
Sentry.init({
  dsn: window.ENV?.SENTRY_DSN,
  environment: window.ENV?.SENTRY_ENVIRONMENT || window.ENV?.NODE_ENV || 'development',
  tracesSampleRate: window.ENV?.SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
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
  
  beforeSend(event) {
    if (window.ENV?.SENTRY_ENVIRONMENT === 'development') {
      console.log('Sentry Event (dev):', event);
      return null;
    }
    return event;
  },
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
