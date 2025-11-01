import {
  PrismaClient,
} from "@prisma/client";

declare global {
  var prismaClient: PrismaClient;
}

// Function to build database URL with connection limit if needed
const buildDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL || '';
  
  // Check if connection_limit is already in the URL
  const url = new URL(baseUrl);
  const hasConnectionLimit = url.searchParams.has('connection_limit');
  
  // If DB_CONNECTION_LIMIT env var exists and URL doesn't have connection_limit, add it
  const dbConnectionLimit = process.env.DB_CONNECTION_LIMIT;
  
  if (dbConnectionLimit && !hasConnectionLimit) {
    console.log(`[DB] Using DB_CONNECTION_LIMIT=${dbConnectionLimit} from environment variable`);
    url.searchParams.set('connection_limit', dbConnectionLimit);
  }
  // Add idle_session_timeout for automatic idle session cleanup (PostgreSQL 14+)
  if (!url.searchParams.has('idle_session_timeout')) {
    url.searchParams.set('idle_session_timeout', process.env.DB_IDLE_SESSION_TIMEOUT || '60000'); // 60 seconds in ms
    console.log('[DB] Added idle_session_timeout=60000 to database URL');
  }
  
  if (hasConnectionLimit) {
    console.log(`[DB] Using connection_limit from DATABASE_URL`);
  }
  return url.toString();
};

const createPrismaClient = () => {
  const databaseUrl = buildDatabaseUrl();
  
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.DB_ENABLE_QUERY_LOG === 'true' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  });
};

if (!global.prismaClient) {
  global.prismaClient = createPrismaClient();
}

const prisma: PrismaClient = global.prismaClient;

// Graceful shutdown handling
export const disconnectPrisma = async () => {
  try {
    console.log('[DB] Disconnecting Prisma client...');
    await global.prismaClient.$disconnect();
    console.log('[DB] Prisma client disconnected successfully');
  } catch (error) {
    console.error('[DB] Error during Prisma disconnect:', error);
  }
};

export default prisma;