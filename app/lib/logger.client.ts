import * as Sentry from "@sentry/remix";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
}

class ClientLogger {
  private addCommonTags(tags?: Record<string, string>) {
    return {
      environment: 'client',
      component: 'frontend',
      ...tags,
    };
  }

  log(message: string, level: LogLevel = 'info', context?: LogContext) {
    // Always log to console for visibility
    console.log(`[${level.toUpperCase()}] ${message}`, context?.extra || '');

    // Only send warn/error/fatal to Sentry to reduce noise
    // debug and info are console-only for performance
    if (level === 'warn' || level === 'error' || level === 'fatal') {
      Sentry.captureMessage(message, {
        level: level as Sentry.SeverityLevel,
        tags: this.addCommonTags(context?.tags),
        extra: context?.extra,
        user: context?.user,
      });
    } else {
      // For debug/info, just add as breadcrumb for context
      Sentry.addBreadcrumb({
        category: 'log',
        message: `[${level.toUpperCase()}] ${message}`,
        level: level as Sentry.SeverityLevel,
        data: context?.extra,
        timestamp: Date.now() / 1000,
      });
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(message, 'debug', context);
  }

  info(message: string, context?: LogContext) {
    this.log(message, 'info', context);
  }

  warn(message: string, context?: LogContext) {
    this.log(message, 'warn', context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    console.error(`[ERROR] ${message}`, error);

    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: this.addCommonTags(context?.tags),
        extra: {
          message,
          ...context?.extra,
        },
        user: context?.user,
      });
    } else {
      Sentry.captureMessage(`${message}: ${JSON.stringify(error)}`, {
        level: 'error',
        tags: this.addCommonTags(context?.tags),
        extra: {
          error,
          ...context?.extra,
        },
        user: context?.user,
      });
    }
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    console.error(`[FATAL] ${message}`, error);

    if (error instanceof Error) {
      Sentry.captureException(error, {
        level: 'fatal',
        tags: this.addCommonTags({
          ...context?.tags,
          severity: 'critical',
        }),
        extra: {
          message,
          ...context?.extra,
        },
        user: context?.user,
      });
    } else {
      Sentry.captureMessage(`${message}: ${JSON.stringify(error)}`, {
        level: 'fatal',
        tags: this.addCommonTags({
          ...context?.tags,
          severity: 'critical',
        }),
        extra: {
          error,
          ...context?.extra,
        },
        user: context?.user,
      });
    }
  }

  // Add breadcrumb for tracking user actions
  addBreadcrumb(category: string, message: string, data?: Record<string, any>, level: LogLevel = 'info') {
    Sentry.addBreadcrumb({
      category,
      message,
      level: level as Sentry.SeverityLevel,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  // Set user context
  setUser(user: { id?: string; email?: string; username?: string } | null) {
    Sentry.setUser(user);
  }

  // Set custom context
  setContext(key: string, context: Record<string, any>) {
    Sentry.setContext(key, context);
  }

  // Set tags
  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }
}

export const logger = new ClientLogger();
