import { redisClient } from "@/lib/redis.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";

export async function loader({ request }: LoaderFunctionArgs) {
  return eventStream(request.signal, function setup(send) {
    let intervalId = setInterval(() => {
      send({ data: JSON.stringify({ timestamp: new Date().toISOString() }) });
    }, 1000);

    const channel = `shop:inventory-copilot-test-store.myshopify.com:sync_progress`;
    const subscriber = redisClient.duplicate();

    subscriber.subscribe(channel);
    subscriber.on("message", (chan, message) => {
      if (chan === channel) {
        send({ data: message });
      }
    });

    return () => {
      void clearInterval(intervalId); // Cleanup function
      void subscriber.unsubscribe(channel);
      void subscriber.quit();
    }
  });
}