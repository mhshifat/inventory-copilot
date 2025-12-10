import * as Sentry from "@sentry/remix";
import { getLogtail, isLogtailEnabled } from "./logtail.server";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  route?: string;
  method?: string;
  statusCode?: number;
}

class ServerLogger {
  private addCommonTags(tags?: Record<string, string>) {
    return {
      environment: 'server',
      component: 'backend',
      ...tags,
    };
  }

  log(message: string, level: LogLevel = 'info', context?: LogContext) {
    // Always log to console for visibility
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] [BACKEND] ${message}`, context?.extra || '');

    // Send to BetterStack for live logging
    if (isLogtailEnabled()) {
      const logtail = getLogtail();
      logtail?.log(message, level, {
        ...this.addCommonTags(context?.tags),
        ...context?.extra,
        timestamp,
        route: context?.route,
        method: context?.method,
        statusCode: context?.statusCode,
        user: context?.user,
      });
    }

    // Only send warn/error/fatal to Sentry to reduce noise
    // debug and info are console-only for performance
    if (level === 'warn' || level === 'error' || level === 'fatal') {
      Sentry.captureMessage(message, {
        level: level as Sentry.SeverityLevel,
        tags: this.addCommonTags(context?.tags),
        extra: {
          timestamp,
          ...context?.extra,
        },
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
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [BACKEND] ${message}`, error);

    // Send to BetterStack
    if (isLogtailEnabled()) {
      const logtail = getLogtail();
      logtail?.error(message, {
        ...this.addCommonTags(context?.tags),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        timestamp,
        route: context?.route,
        method: context?.method,
        statusCode: context?.statusCode,
        ...context?.extra,
        user: context?.user,
      });
    }

    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: this.addCommonTags(context?.tags),
        extra: {
          message,
          timestamp,
          route: context?.route,
          method: context?.method,
          statusCode: context?.statusCode,
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
          timestamp,
          route: context?.route,
          method: context?.method,
          statusCode: context?.statusCode,
          ...context?.extra,
        },
        user: context?.user,
      });
    }
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [FATAL] [BACKEND] ${message}`, error);

    // Send to BetterStack
    if (isLogtailEnabled()) {
      const logtail = getLogtail();
      logtail?.error(message, {
        ...this.addCommonTags(context?.tags),
        severity: 'critical',
        level: 'fatal',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        timestamp,
        route: context?.route,
        method: context?.method,
        statusCode: context?.statusCode,
        ...context?.extra,
        user: context?.user,
      });
    }

    if (error instanceof Error) {
      Sentry.captureException(error, {
        level: 'fatal',
        tags: this.addCommonTags({
          ...context?.tags,
          severity: 'critical',
        }),
        extra: {
          message,
          timestamp,
          route: context?.route,
          method: context?.method,
          statusCode: context?.statusCode,
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
          timestamp,
          route: context?.route,
          method: context?.method,
          statusCode: context?.statusCode,
          ...context?.extra,
        },
        user: context?.user,
      });
    }
  }

  // Add breadcrumb for tracking server actions
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

  // Helper for API route logging
  logApiRequest(route: string, method: string, context?: LogContext) {
    this.info(`API Request: ${method} ${route}`, {
      ...context,
      tags: {
        ...context?.tags,
        api_route: route,
        http_method: method,
      },
      route,
      method,
    });
  }

  logApiResponse(route: string, method: string, statusCode: number, duration?: number, context?: LogContext) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(`API Response: ${method} ${route} - ${statusCode}`, level, {
      ...context,
      tags: {
        ...context?.tags,
        api_route: route,
        http_method: method,
        status_code: statusCode.toString(),
      },
      extra: {
        ...context?.extra,
        duration_ms: duration,
      },
      route,
      method,
      statusCode,
    });
  }
}

export const logger = new ServerLogger();

// Keep backward compatibility with old Logger class
export class Logger {
  static log(message: string) {
    logger.info(message);
  }

  static error(message: string, error?: Error) {
    logger.error(message, error);
  }
}
