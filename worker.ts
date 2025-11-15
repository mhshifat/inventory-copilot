import 'dotenv/config';
import { disconnectPrisma } from './app/lib/db.server';
import { pubRedisConnection, redisClient } from './app/lib/redis.server';
import { upsertProductWorker } from './app/services/workers/upsert-product-worker.server';
import { createProductsImportWorker } from './app/services/workers/import-products-worker.server';

(async () => {
  try {
    const workers = [
        createProductsImportWorker(),
        upsertProductWorker(),
    ];
  
    console.log({ "Running Workers": workers.map((worker) => worker?.name) });
  
    // Graceful shutdown
    async function shutdown(signal: string) {
      try {
        console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down workers...`);

        await Promise.allSettled(workers.map((worker) => worker.close()));
      }
      catch (error) {
        console.error(`[${new Date().toISOString()}] Error during shutdown workers: ${signal} : `, error);
      } finally {
        try {
          await disconnectPrisma();
          await redisClient.quit();
          await pubRedisConnection.quit();
        } finally {
          process.exit(0);
        }
      }
    }
  
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in worker process: `, err);
  }
})()