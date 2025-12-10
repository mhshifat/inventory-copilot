declare module "*.css";

interface Window {
  ENV: {
    NODE_ENV: string;
    SENTRY_DSN?: string;
    SENTRY_ENVIRONMENT?: string;
  };
}
