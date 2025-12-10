import * as Sentry from "@sentry/node";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  jobId?: string;
  jobName?: string;
  queueName?: string;
  shopId?: number;
  shop?: string;
}

class WorkerLogger {
  private addCommonTags(tags?: Record<string, string>) {
    return {
      environment: 'worker',
      component: 'worker',
      process_type: 'bullmq',
      ...tags,
    };
  }

  log(message: string, level: LogLevel = 'info', context?: LogContext) {
    // Always log to console for visibility
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] [WORKER] ${message}`, context?.extra || '');

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
    console.error(`[${timestamp}] [ERROR] [WORKER] ${message}`, error);

    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: this.addCommonTags(context?.tags),
        extra: {
          message,
          timestamp,
          jobId: context?.jobId,
          jobName: context?.jobName,
          queueName: context?.queueName,
          shopId: context?.shopId,
          shop: context?.shop,
          ...context?.extra,
        },
      });
    } else {
      Sentry.captureMessage(`${message}: ${JSON.stringify(error)}`, {
        level: 'error',
        tags: this.addCommonTags(context?.tags),
        extra: {
          error,
          timestamp,
          jobId: context?.jobId,
          jobName: context?.jobName,
          queueName: context?.queueName,
          shopId: context?.shopId,
          shop: context?.shop,
          ...context?.extra,
        },
      });
    }
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [FATAL] [WORKER] ${message}`, error);

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
          jobId: context?.jobId,
          jobName: context?.jobName,
          queueName: context?.queueName,
          shopId: context?.shopId,
          shop: context?.shop,
          ...context?.extra,
        },
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
          jobId: context?.jobId,
          jobName: context?.jobName,
          queueName: context?.queueName,
          shopId: context?.shopId,
          shop: context?.shop,
          ...context?.extra,
        },
      });
    }
  }

  // Helper for job lifecycle logging
  logJobStart(jobId: string, jobName: string, queueName: string, data?: any) {
    this.info(`Job started: ${jobName}`, {
      tags: {
        job_id: jobId,
        job_name: jobName,
        queue_name: queueName,
        job_status: 'started',
      },
      extra: {
        jobData: data,
      },
      jobId,
      jobName,
      queueName,
    });
  }

  logJobComplete(jobId: string, jobName: string, queueName: string, duration?: number) {
    this.info(`Job completed: ${jobName}`, {
      tags: {
        job_id: jobId,
        job_name: jobName,
        queue_name: queueName,
        job_status: 'completed',
      },
      extra: {
        duration_ms: duration,
      },
      jobId,
      jobName,
      queueName,
    });
  }

  logJobFailed(jobId: string, jobName: string, queueName: string, error: Error | unknown, data?: any) {
    this.error(`Job failed: ${jobName}`, error, {
      tags: {
        job_id: jobId,
        job_name: jobName,
        queue_name: queueName,
        job_status: 'failed',
      },
      extra: {
        jobData: data,
      },
      jobId,
      jobName,
      queueName,
    });
  }

  // Add breadcrumb for tracking worker actions
  addBreadcrumb(category: string, message: string, data?: Record<string, any>, level: LogLevel = 'info') {
    Sentry.addBreadcrumb({
      category,
      message,
      level: level as Sentry.SeverityLevel,
      data,
      timestamp: Date.now() / 1000,
    });
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

export const logger = new WorkerLogger();
