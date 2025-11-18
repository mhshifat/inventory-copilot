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
    };
  } catch (error) {
    console.log(error);
    return { currentBilling: null, billingPlans: [], shouldShowUpgradePrompt: false};
  }
}

export default function App() {
  const { currentBilling, billingPlans, shouldShowUpgradePrompt } = useLoaderData<typeof loader>();

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
      </head>
      <body>
        <ProgressBar />
        <AppSubscription shouldShowUpgradePrompt={shouldShowUpgradePrompt} currentSubscription={currentBilling} billingPlans={billingPlans}>
          <Outlet />
        </AppSubscription>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
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