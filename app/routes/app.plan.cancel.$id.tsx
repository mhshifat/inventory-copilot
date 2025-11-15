import type {  LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "@/lib/db.server";
import { SyncLogType } from "@prisma/client";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { billing, session, redirect } = await authenticate.admin(request);
  
  try {
    const planId = params.id as string;
    if (!planId) return redirect("/app/pricing", 303);

    const shopDBData = await prisma.shop.findFirst({ where: { domain: session?.shop }, select: {
      id: true,
      billing: true,
    } });

    if (shopDBData) {
      const data = await billing.cancel({
        subscriptionId: planId,
        isTest: process?.env?.BILLING_ENV === "development",
        prorate: true,
      });

      if (data?.id && shopDBData?.billing?.id && data?.status === "CANCELLED") {
        await prisma.billing.update({
          where: {
            id: shopDBData?.billing?.id,
          },
          data: {
            status: "CANCELLED",
            cancelled_subscription_at: new Date(),
            updated_at: new Date(),
            ...(shopDBData?.billing?.coupon_applied && {
              coupon_applied: false,
              coupon_plan_name: null,
              coupon_value: null,
              coupon_value_type: null,
              coupon_duration_limit_intervals: null,
              coupon_product_limit: null,
              coupon_plan_cycle: null,
            })
          }
        });

        await prisma.syncLog.create({
          data: {
            type: SyncLogType.BILLING_CANCEL,
            status: "COMPLETED",
            message: `Billing plan cancelled in the shop(${session?.shop})`,
            created_at: new Date(),
            shop_id: shopDBData?.id,
          },
          select: {
            id: true,
          },
        });
      }
    }

    // App logic
    return redirect("/app?force-reload=true", 303);
  } catch (err) {
    console.error("Error occurred while processing billing cancel:", err);
    return redirect("/app?force-reload=true", 303);
  }
};