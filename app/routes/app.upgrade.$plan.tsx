import type {  LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, BILLING_OBJECTS } from "../shopify.server";
import { BillingReplacementBehavior } from "@shopify/shopify-app-remix/server";
import { useLoaderData, useNavigate  } from "@remix-run/react";
import { useEffect } from "react";
import prisma from "@/lib/db.server";
import type { ICouponBillingPlan, PlanObject } from "@/types/billing";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try{
    const plan = params.plan as "Starter" | "Pro" | "Business" | "Enterprise";
    const { billing, session, admin } = await authenticate.admin(request);
    let { shop } = session;
    let myShop = shop?.replace(".myshopify.com", "");

    const searchParams = new URL(request.url).searchParams;
    const coupon = searchParams.get("coupon") || "";
    const existingBilling = await billing.check({});
    const currentBilling = existingBilling?.appSubscriptions?.[0];
    let validCouponExist: boolean = false;

    const shopDBData = await prisma.shop.findFirst({ 
      where: { domain: session?.shop }, 
      select: {
        billing: {
          select: {
            current_billing_end: true,
          }
        }
      } 
    });

    const couponData = await prisma.billingCoupon.findFirst({
      where: {
        code: coupon
      }
    });

    const couponPlans: ICouponBillingPlan[] = couponData?.plans ? JSON.parse(couponData.plans) : [];
    let selectedCouponPlan: ICouponBillingPlan | null = null;

    if(Array.isArray(couponPlans) && couponPlans.length > 0) {
      for (const couponPlan of couponPlans) {
        if (couponPlan.planName === plan) {
          selectedCouponPlan = couponPlan;
          validCouponExist = true;
          break;
        }
      }
    }

    const planObj: PlanObject | undefined = BILLING_OBJECTS[plan as keyof typeof BILLING_OBJECTS];

    const response = await admin.graphql(
      `#graphql
      mutation AppSubscriptionCreate(
        $name: String!, 
        $lineItems: [AppSubscriptionLineItemInput!]!, 
        $returnUrl: URL!, 
        $test: Boolean!, 
        $trialDays: Int!, 
        $replacementBehavior: AppSubscriptionReplacementBehavior!
      ) {
        appSubscriptionCreate(
          name: $name, 
          returnUrl: $returnUrl, 
          lineItems: $lineItems, 
          test: $test,
          trialDays: $trialDays,
          replacementBehavior: $replacementBehavior
        ) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
            test
            trialDays
            currentPeriodEnd
            status
            lineItems{
              plan{
                pricingDetails{
                  ...on AppRecurringPricing{
                    price{
                      amount
                      currencyCode
                    }
                    interval
                    discount{
                      durationLimitInIntervals
                      priceAfterDiscount{
                        amount
                        currencyCode
                      }
                      value
                      remainingDurationInIntervals
                    }
                  }
                }
              }
            }
          }
          confirmationUrl
        }
      }`,
      {
        variables: {
          "name": plan,
          "test": process?.env?.BILLING_ENV === "development",
          "trialDays": (currentBilling?.id || shopDBData?.billing?.current_billing_end) ? 0 : 3,
          "replacementBehavior": BillingReplacementBehavior.Standard,
          "returnUrl": `https://admin.shopify.com/store/${myShop}/apps/${process.env.SHOPIFY_APP_NAME}/app/billing-success?coupon=${validCouponExist ? coupon : ""}`,
          "lineItems": [
            {
              "plan": {
                "appRecurringPricingDetails": {
                  "price": {
                    "amount": planObj.amount,
                    "currencyCode": planObj.currencyCode
                  },
                  "interval": "EVERY_30_DAYS",
                  ...((validCouponExist && selectedCouponPlan) && {
                    "discount": {
                      "value": {
                        ...((selectedCouponPlan?.type === "PERCENTAGE_DISCOUNT") ? {
                          "percentage": selectedCouponPlan?.value ? +selectedCouponPlan?.value : 0,
                        } : {
                          "amount": (selectedCouponPlan?.type === "FIXED_AMOUNT_DISCOUNT") ? +selectedCouponPlan!.value : (selectedCouponPlan?.type === "FIXED_PRICE") ? planObj!.amount - +selectedCouponPlan!.value : 0,
                        }),
                      },
                      ...(selectedCouponPlan?.durationLimitIntervals && {
                        "durationLimitInIntervals": selectedCouponPlan?.durationLimitIntervals
                      }),
                    }
                  }),
                }
              }
            }
          ]
        },
      },
    );

    const data = await response.json();

    return {
      success: data?.data?.appSubscriptionCreate?.confirmationUrl ? true : false,
      message: data?.data?.appSubscriptionCreate?.confirmationUrl ? "ok" : data?.data?.appSubscriptionCreate?.userErrors?.[0]?.message || "Sorry, something went wrong.",
      confirmationUrl: data?.data?.appSubscriptionCreate?.confirmationUrl ? data?.data?.appSubscriptionCreate?.confirmationUrl : null,
    }
  }catch(e: any){
    console.error("Error in upgrading plan: ", e);

    return {
      success: false,
      message: e?.message || "Sorry, something went wrong.",
      confirmationUrl: null,
    };
  }
};

export default function UpgradePlan() {
  const { confirmationUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    if (confirmationUrl && typeof window !== "undefined") {
      window.parent.location.href = confirmationUrl;
    }else{
      navigate("/app/pricing", { replace: true });
    }
  }, [confirmationUrl, navigate]);

  return null;
}