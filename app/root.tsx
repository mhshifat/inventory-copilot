import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import styles from "./global.css?url";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import AppSubscription from "./components/providers/subscription";
import { authenticate, BILLING_OBJECTS } from "./shopify.server";
import ProgressBar from "./components/shared/progress-bar";
import * as Sentry from "@sentry/remix";
import { useEffect } from "react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
]

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { billing, admin } = await authenticate.admin(request);
    const billingPlans = Object.values(BILLING_OBJECTS);
    const existingBilling = await billing.check({});
    const currentBilling = existingBilling.appSubscriptions?.[0];

    const shopifyProductsResponse = await admin.graphql(
      `#graphql
      query {
        productsCount {
          count
        }
      }`,
    );

    const shopifyProductsData = await shopifyProductsResponse?.json();
    const totalShopifyProducts = shopifyProductsData?.data?.productsCount?.count || 0;

    const billingPlanProductLimit = billingPlans.find(plan => 
      plan.title === currentBilling?.name
    )?.attributes?.productLimit || 0;

    // Return the shop domain if authenticated
    return {
      currentBilling: currentBilling || null,
      billingPlans,
      shouldShowUpgradePrompt: billingPlanProductLimit > 0 && totalShopifyProducts > billingPlanProductLimit,
      ENV: {
        NODE_ENV: process.env.NODE_ENV,
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      }
    };
  } catch (error) {
    console.log(error);
    Sentry.captureException(error);
    return { 
      currentBilling: null, 
      billingPlans: [], 
      shouldShowUpgradePrompt: false,
      ENV: {
        NODE_ENV: process.env.NODE_ENV,
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      }
    };
  }
}

export default function App() {
  const { currentBilling, billingPlans, shouldShowUpgradePrompt, ENV } = useLoaderData<typeof loader>();

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
      </head>
      <body>
        <ProgressBar />
        <AppSubscription shouldShowUpgradePrompt={shouldShowUpgradePrompt} currentSubscription={currentBilling} billingPlans={billingPlans}>
          <Outlet />
        </AppSubscription>
        <ScrollRestoration />
        <Scripts />
        <script src="//code.tidio.co/qya0ec1pkef3eabnujgmbqsjcyiwpwht.js" async></script>
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  
  useEffect(() => {
    // Capture the error in Sentry
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureException(new Error(JSON.stringify(error)));
    }
  }, [error]);

  console.error(error);

  return (
    <html>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <p>Error - {(error as Error)?.message || (error as { data: string })?.data}</p>
        <Scripts />
      </body>
    </html>
  );
}