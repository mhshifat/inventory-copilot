import { Logtail } from "@logtail/browser";

let logtail: Logtail | null = null;

// Initialize Logtail if source token is provided
if (typeof window !== 'undefined' && window.ENV?.BETTERSTACK_SOURCE_TOKEN && window.ENV?.BETTERSTACK_SOURCE_HOST) {
  logtail = new Logtail(window.ENV.BETTERSTACK_SOURCE_TOKEN, {
    endpoint: window.ENV.BETTERSTACK_SOURCE_HOST,
  });
}

export function getLogtail() {
  return logtail;
}

export function isLogtailEnabled() {
  return logtail !== null;
}
