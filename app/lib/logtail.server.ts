import { Logtail } from "@logtail/node";

let logtail: Logtail | null = null;

// Initialize Logtail if source token is provided
if (process.env.BETTERSTACK_SOURCE_TOKEN && process.env.BETTERSTACK_SOURCE_HOST) {
  logtail = new Logtail(process.env.BETTERSTACK_SOURCE_TOKEN, {
    endpoint: process.env.BETTERSTACK_SOURCE_HOST,
  });
}

export function getLogtail() {
  return logtail;
}

export function isLogtailEnabled() {
  return logtail !== null;
}
