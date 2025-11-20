import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import Providers from "@/components/providers";
import { authenticate, handleError } from "@/shopify.server";
import prisma from "@/lib/db.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = {
    shop: "",
    apiKey: process.env.SHOPIFY_API_KEY || "",
  }

  try {
    const { session } = await authenticate.admin(request);
    const shop = await prisma.shop.findUnique({
      where: {
        domain: session.shop
      },
      select: {
        id: true,
        domain: true,
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }
    
    response.shop = shop.domain;
    return response;
  } catch (err) {
    handleError(err);
    return response;
  }
};

export default function App() {
  const { apiKey, shop } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <Providers
        shop={shop}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          <Link to="/app/billing" rel="billing">Billing</Link>
          <Link to="/app/help" rel="help">Help</Link>
        </NavMenu>
        <Outlet />
      </Providers>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
