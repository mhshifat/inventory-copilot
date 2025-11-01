import prisma from "@/lib/db.server";
import { authenticate, handleError } from "@/shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async (args: LoaderFunctionArgs) => {
  try {
    const { session, redirect } = await authenticate.admin(args.request);
    const shop = await prisma.shop.findUnique({
      where: {
        domain: session.shop
      },
      select: {
        id: true
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }
    const productsCount = await prisma.product.count({
      where: {
        shop_id: shop.id
      }
    });
    if (productsCount === 0) {
      return redirect("/app/import");
    }
    return null;
  } catch (err) {
    handleError(err);
    return null;
  }
}

export default function Index() {
  return (
    <p className="text-2xl text-red-600">Main Page</p>
  );
}
