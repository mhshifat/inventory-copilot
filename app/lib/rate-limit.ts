const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

export default function rateLimit(key: string, limit = 20, windowMs = 10_000) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return;
  }

  // reset window
  if (now - entry.timestamp > windowMs) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return;
  }

  // still in window
  if (entry.count >= limit) {
    throw new Response("Too many requests", { status: 429 });
  }

  entry.count++;
}
