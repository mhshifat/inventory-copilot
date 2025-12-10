import 'dotenv/config';
import './sentry.worker.config';
import * as Sentry from '@sentry/node';
import { disconnectPrisma } from './app/lib/db.server';
import { pubRedisConnection, redisClient } from './app/lib/redis.server';
import { upsertProductWorker } from './app/services/workers/upsert-product-worker.server';
import { createProductsImportWorker } from './app/services/workers/import-products-worker.server';
import { upsertOrderWorker } from './app/services/workers/upsert-order-worker.server';
import { lowStockAlertWorker } from './app/services/workers/low-stock-alert-worker.server';
import { logger } from '@/lib/logger.worker';

(async () => {
  try {
    const workers = [
        createProductsImportWorker(),
        upsertProductWorker(),
        upsertOrderWorker(),
        lowStockAlertWorker(),
    ];
  
    console.log({ "Running Workers": workers.map((worker) => worker?.name) });
    logger.log('Worker process started');
  
    // Graceful shutdown
    async function shutdown(signal: string) {
      try {
        console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down workers...`);

        await Promise.allSettled(workers.map((worker) => worker.close()));
      }
      catch (error) {
        console.error(`[${new Date().toISOString()}] Error during shutdown workers: ${signal} : `, error);
        Sentry.captureException(error);
      } finally {
        try {
          await disconnectPrisma();
          await redisClient.quit();
          await pubRedisConnection.quit();
          // Flush Sentry events before exit
          await Sentry.close(2000);
        } finally {
          process.exit(0);
        }
      }
    }
  
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in worker process: `, err);
    Sentry.captureException(err);
  }
})()