import { setTimeout as delay } from "timers/promises";

export interface ShopifyThrottleCost {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: {
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  };
}

export interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: any[];
  extensions?: {
    cost?: ShopifyThrottleCost;
  };
}

export async function shopifyGraphqlRequest<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, any> = {},
  options: { maxRetries?: number, log?: (message: string) => void } = {}
): Promise<{
  data?: T;
  userErrors?: any[];
  throttle?: ShopifyThrottleCost;
}> {
  const url = `https://${shop}/admin/api/2025-01/graphql.json`;
  const maxRetries = options.maxRetries ?? 5;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const json = (await response.json()) as ShopifyGraphQLResponse<T>;
    const throttle = json?.extensions?.cost;
    const requestedCost = throttle?.requestedQueryCost ?? 0;
    const currentlyAvailable = throttle?.throttleStatus?.currentlyAvailable ?? 0;

    // --- Handle Throttling ---
    if (throttle && requestedCost > currentlyAvailable) {
      const { restoreRate } = throttle.throttleStatus;
      const tokensNeeded = requestedCost - currentlyAvailable;
      const secondsToWait = Math.ceil(tokensNeeded / restoreRate) + 1;

      options.log?.(
        `[Shopify API] Rate limit reached. Waiting ${secondsToWait}s before retry (Attempt ${attempt + 1}/${maxRetries})`
      );
      await delay(secondsToWait * 1000);
      continue;
    }

    // --- Handle GraphQL top-level errors ---
    if (json.errors && json.errors.length > 0) {
      throw new Error(
        `[Shopify GraphQL Error]: ${JSON.stringify(json.errors)}`
      );
    }

    // --- Handle userErrors inside mutation payload ---
    const userErrors = extractUserErrors(json.data);

    if (userErrors && userErrors.length > 0) {
      options.log?.(`[Shopify User Errors]: ${JSON.stringify(userErrors)}`);
      return { data: json.data, userErrors, throttle };
    }

    return { data: json.data, throttle };
  }

  throw new Error(`Shopify request failed after ${maxRetries} retries.`);
}

/**
 * Recursively extract any "userErrors" arrays from Shopify GraphQL payloads.
 * Works for nested structures like { data: { productUpdate: { userErrors: [...] } } }
 */
function extractUserErrors(obj: any): any[] | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  if (Array.isArray(obj.userErrors) && obj.userErrors.length > 0) {
    return obj.userErrors;
  }

  for (const key of Object.keys(obj)) {
    const found = extractUserErrors(obj[key]);
    if (found && found.length > 0) return found;
  }

  return undefined;
}