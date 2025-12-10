declare module "*.css";

interface Window {
  ENV: {
    NODE_ENV: string;
    SENTRY_DSN?: string;
    SENTRY_ENVIRONMENT?: string;
    BETTERSTACK_SOURCE_TOKEN?: string;
    BETTERSTACK_SOURCE_HOST?: string;
  };
}
