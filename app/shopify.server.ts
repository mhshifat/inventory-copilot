import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { CustomSessionStorage } from "./lib/session-storage.server";

export const STARTER = "Starter";
export const PRO = "Pro";
export const BUSINESS = "Business";
export const ENTERPRISE = "Enterprise";

export const BILLING_OBJECTS = {
  [STARTER]: {
    title: STARTER,
    icon: "Zap",
    description: "Perfect for getting started",
    features: [
      "Up to 1000 total products in the store",
    ],
    trialDays: 0,
    amount: 0,
    currencyCode: "USD",
    interval: "month",
    attributes: {
      productLimit: 100,
    },
    popular: false,
  },
  [PRO]: {
    title: PRO,
    icon: "Crown",
    description: "Most popular for growing businesses",
    features: [
      "Up to 5,000 total products in the store",
    ],
    trialDays: 3,
    amount: 2.99,
    currencyCode: "USD",
    interval: "month",
    attributes: {
      productLimit: 1000,
    },
    popular: true
  },
  [BUSINESS]: {
    title: BUSINESS,
    icon: "Building",
    description: "For established businesses",
    features: [
      "Up to 10K total products in the store",
    ],
    trialDays: 3,
    amount: 5.99,
    currencyCode: "USD",
    interval: "month",
    attributes: {
      productLimit: 10000,
    },
    popular: false,
  },
  [ENTERPRISE]: {
    title: ENTERPRISE,
    icon: "Rocket",
    description: "For large scale operations",
    features: [
      "Up to 100K total products in the store",
    ],
    trialDays: null,
    amount: 19.99,
    currencyCode: "USD",
    interval: "month",
    attributes: {
      productLimit: 100000,
    },
    popular: false,
  },
};

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new CustomSessionStorage(),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  billing: {
    [STARTER]: {
      trialDays: BILLING_OBJECTS[STARTER].trialDays,
      lineItems: [{
        amount: BILLING_OBJECTS[STARTER].amount,
        currencyCode: BILLING_OBJECTS[STARTER].currencyCode,
        interval: BillingInterval.Every30Days,
      }]
    },
    [PRO]: {
      trialDays: BILLING_OBJECTS[PRO].trialDays,
      lineItems: [{
        amount: BILLING_OBJECTS[PRO].amount,
        currencyCode: BILLING_OBJECTS[PRO].currencyCode,
        interval: BillingInterval.Every30Days,
      }]
    },
    [BUSINESS]: {
      trialDays: BILLING_OBJECTS[BUSINESS].trialDays,
      lineItems: [{
        amount: BILLING_OBJECTS[BUSINESS].amount,
        currencyCode: BILLING_OBJECTS[BUSINESS].currencyCode,
        interval: BillingInterval.Every30Days,
      }]
    },
    [ENTERPRISE]: {
      lineItems: [{
        amount: BILLING_OBJECTS[ENTERPRISE].amount,
        currencyCode: BILLING_OBJECTS[ENTERPRISE].currencyCode,
        interval: BillingInterval.Every30Days,
      }]
    },
  }
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
export const handleError = (error: unknown) => {
  console.error(error);
};