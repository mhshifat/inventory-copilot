import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { Badge } from "app/components/ui/badge";
import { Button } from "app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "app/components/ui/card";
import { authenticate, BILLING_OBJECTS, STARTER } from "app/shopify.server";
import { ArrowLeftIcon, BuildingIcon, CheckCircleIcon, CrownIcon, RocketIcon, ZapIcon } from "lucide-react";
import { cn } from "app/lib/utils";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger,
  AlertDialogCancel, 
} from "app/components/ui/alert-dialog";
import { Input } from "app/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { BillingReplacementBehavior } from "@shopify/shopify-app-remix/server";
import type { ICouponBillingPlan, PlanObject, PlanObjectWithCouponPlanIncluded } from "@/types/billing";
import prisma from "@/lib/db.server";
import { useAppSubscription } from "@/components/providers/subscription";
import CancelSubscriptionDialog from "@/components/modules/billing/cancel-subscription-dialog";
import { toast } from "sonner";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try{
    const { session, admin } = await authenticate.admin(request);
    let couponPlans: ICouponBillingPlan[] = [];
    let billingPlans: PlanObjectWithCouponPlanIncluded[] = [];
    let couponPlansExist: boolean = false;

    const shopDBData = await prisma.shop.findFirst({ where: { domain: session?.shop }, select: {
      id: true,
      billing: {
        select: {
          trial_taken: true,
          coupon_applied: true,
          coupon_code: true,
          coupon_plan_name: true,
          coupon_value: true,
          coupon_value_type: true,
          coupon_duration_limit_intervals: true,
          coupon_product_limit: true,
          coupon_plan_cycle: true,
        }
      }
    } });

    const couponData = !shopDBData?.billing?.coupon_code ? null : await prisma.billingCoupon.findFirst({
      where: {
        code: shopDBData?.billing?.coupon_code,
      }
    });

    couponPlans = couponData?.plans ? JSON.parse(couponData.plans) : [];

    if((Array.isArray(couponPlans) && couponPlans.length > 0)) {
      let tempCapturedCouponTitles: string[] = [];

      for (const couponPlan of couponPlans) {
        const planObj = JSON.parse(JSON.stringify(BILLING_OBJECTS[couponPlan.planName as keyof typeof BILLING_OBJECTS]));
 
        if(planObj) {
          couponPlansExist = true;
          tempCapturedCouponTitles.push(planObj.title);

          if(couponPlan?.type === 'FIXED_AMOUNT_DISCOUNT'){
            planObj.amount = planObj.amount - couponPlan.value;
          }else if(couponPlan?.type === 'PERCENTAGE_DISCOUNT'){
            planObj.amount = planObj.amount * (1 - couponPlan.value / 100);
          }else if(couponPlan?.type === 'FIXED_PRICE'){
            planObj.amount = couponPlan.value;
          }

          if(couponPlan?.productLimit > 0) planObj.attributes.productLimit = couponPlan.productLimit;

          billingPlans.push({
            ...planObj,
            couponPlan
          });
        }
      }

      let tempBillingObjectValues = Object.values(BILLING_OBJECTS);

      if(
        tempCapturedCouponTitles?.length > 0 &&
        Array.isArray(tempBillingObjectValues) && 
        tempBillingObjectValues?.length > 0
      ){
        for(const tempBillingPlan of tempBillingObjectValues){
          if(tempCapturedCouponTitles.includes(tempBillingPlan.title) === true) continue;

          billingPlans.push(tempBillingPlan);
        }
      }
    }

    if(couponPlansExist === false) {
      billingPlans = Object.values(BILLING_OBJECTS);
    }

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

    if(shopifyProductsData?.data?.productsCount && session?.shop){
      await prisma.shop.update({
        where: { domain: session?.shop },
        data: {
          total_products: totalShopifyProducts,
          updated_at: new Date(),
        }
      });
    }

    const desiredOrder = ["Starter", "Pro", "Business", "Enterprise"];

    return {
      couponCode: shopDBData?.billing?.coupon_code || null,
      billingPlans: billingPlans.sort((a, b) => {
        return desiredOrder.indexOf(a.title) - desiredOrder.indexOf(b.title);
      }),
      couponPlansExist,
      couponPlans,
      totalShopifyProducts,
      shopDBData,
    }
  }catch(e: any){
    console.error("Error in pricing loader: ", e);

    return {
      billingPlans: [],
      couponPlansExist: false,
      couponPlans: [],
      totalShopifyProducts: 0,
      shopDBData: null,
      couponCode: null,
    }
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const response: {
    error: string;
    errors: unknown[];
    message: string;
    data: unknown;
    action?: string;
  } = {
    error: "",
    errors: [],
    message: "",
    data: null,
    action: "",
  };

  try {
    switch (request.method) {
      case "POST": {
        const body = await request.json();
        const { coupon } = body as { coupon?: string };
        const customCouponPlans: { 
          billingPlan: PlanObject, 
          couponPlan: ICouponBillingPlan,
          updatedPlanPrice: number,
          updatedPlanProductLimit: number 
        }[] = [];

        const couponData = await prisma.billingCoupon.findFirst({
          where: {
            code: coupon
          }
        });

        if (!couponData) throw new Error("Invalid coupon code");

        const couponPlans: ICouponBillingPlan[] = couponData?.plans ? JSON.parse(couponData.plans) : [];

        if(!(Array.isArray(couponPlans) && couponPlans.length > 0)) {
          throw new Error("No plans found in the app for the coupon code");
        }

        for (const couponPlan of couponPlans) {
          const planObj: PlanObject | undefined = BILLING_OBJECTS[couponPlan.planName as keyof typeof BILLING_OBJECTS];

          if(planObj) {
            let tempUpdatedPrice = planObj.amount;
            let tempUpdatedProductLimit = planObj.attributes.productLimit;

            if(couponPlan?.type === 'FIXED_AMOUNT_DISCOUNT'){
              tempUpdatedPrice = planObj.amount - couponPlan.value;
            }else if(couponPlan?.type === 'PERCENTAGE_DISCOUNT'){
              tempUpdatedPrice = planObj.amount * (1 - couponPlan.value / 100);
            }else if(couponPlan?.type === 'FIXED_PRICE'){
              tempUpdatedPrice = couponPlan.value;
            }

            if(couponPlan?.productLimit > 0) tempUpdatedProductLimit = couponPlan.productLimit;

            customCouponPlans.push({
              updatedPlanPrice: tempUpdatedPrice,
              updatedPlanProductLimit: tempUpdatedProductLimit,
              billingPlan: planObj,
              couponPlan,
            });
          }
        }

        if(!customCouponPlans?.length) {
          throw new Error("No matching plans found for the coupon code");
        }

        response.data = {
          customCouponPlans,
        };

        return response;
      }
      case "PUT": {
        const putBody = await request.json();
        const putBodyObj = putBody as { coupon?: string, plan?: string };
        const { billing, session, admin } = await authenticate.admin(request);
        let { shop } = session;
        let myShop = shop?.replace(".myshopify.com", "");
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
            code: putBodyObj.coupon
          }
        });

        const couponPlans: ICouponBillingPlan[] = couponData?.plans ? JSON.parse(couponData.plans) : [];
        let selectedCouponPlan: ICouponBillingPlan | null = null;

        if(Array.isArray(couponPlans) && couponPlans.length > 0) {
          for (const couponPlan of couponPlans) {
            if (couponPlan.planName === putBodyObj.plan) {
              selectedCouponPlan = couponPlan;
              validCouponExist = true;
              break;
            }
          }
        }

        const planObj: PlanObject | undefined = BILLING_OBJECTS[putBodyObj.plan as keyof typeof BILLING_OBJECTS];
        const responseQuery = await admin.graphql(
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
                "name": putBodyObj.plan,
                "test": process?.env?.BILLING_ENV === "development",
                "trialDays": (currentBilling?.id || shopDBData?.billing?.current_billing_end) ? 0 : (planObj?.trialDays || 0),
                "replacementBehavior": BillingReplacementBehavior.Standard,
                "returnUrl": `https://admin.shopify.com/store/${myShop}/apps/${process.env.SHOPIFY_APP_NAME}/app/billing-success?coupon=${validCouponExist ? putBodyObj.coupon : ""}`,
                "lineItems": [
                  {
                    "plan": {
                      "appRecurringPricingDetails": {
                        "price": {
                          "amount": planObj?.title === STARTER ? 1 : planObj.amount,
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
                        ...(planObj?.title === STARTER && {
                          "discount": {
                            "value": {
                              "percentage": 1,
                            }
                          }
                        })
                      }
                    }
                  }
                ]
              },
            },
        );
      
        const data = await responseQuery.json();
        response.message = data?.data?.appSubscriptionCreate?.confirmationUrl ? "ok" : data?.data?.appSubscriptionCreate?.userErrors?.[0]?.message || "Sorry, something went wrong.";
        const confirmationUrl = data?.data?.appSubscriptionCreate?.confirmationUrl ? data?.data?.appSubscriptionCreate?.confirmationUrl : null;
        
        if (data?.data?.appSubscriptionCreate?.userErrors?.length) {
          response.errors = data?.data?.appSubscriptionCreate?.userErrors;
          response.error = data?.data?.appSubscriptionCreate?.userErrors?.[0]?.message || "Sorry, something went wrong.";
          return response;
        }

        response.data = {
          confirmationUrl,
        };
        return response;
      }
      default:
        throw new Error(`Unsupported method: ${request.method}`);
    }
  } catch (err) {
    console.error("Error in pricing action: ", err);
    return response;
  }
}

export default function PricingPage() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { currentSubscription } = useAppSubscription();
  const { 
      billingPlans,
      totalShopifyProducts,
      shopDBData,
      couponCode,
  } = useLoaderData<typeof loader>();
  const [coupon, setCoupon] = useState<string | null>(null);
  const couponPlansRef = useRef<any>(null);
  const isCouponFetchLoading = (fetcher.state === "loading" || fetcher.state === "submitting") && fetcher.formMethod === "POST";
  const confirmationUrl = (fetcher?.data as any)?.data?.confirmationUrl || null;
  const couponPlans = (fetcher?.data as any)?.data?.customCouponPlans;
  const error = (fetcher?.data as any)?.error || null;

  const getIcon = (name: string) => {
  switch (name) {
    case "Zap":
      return <ZapIcon className="w-6 h-6" />
    case "Crown":
      return <CrownIcon className="w-6 h-6" />
    case "Building":
      return <BuildingIcon className="w-6 h-6" />
    case "Rocket":
      return <RocketIcon className="w-6 h-6" />
    default:
      <ZapIcon className="w-6 h-6" />
  }
  }

  useEffect(() => {
    if (confirmationUrl && typeof window !== "undefined") {
      window.parent.location.href = confirmationUrl;
    }
  }, [confirmationUrl])

  useEffect(() => {
    if (couponPlans?.length > 0) {
      couponPlansRef.current = couponPlans || [];
    }
  }, [couponPlans])

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
  <div className="min-h-screen bg-background p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button
            // @ts-ignore 
            variant="outline" onClick={() => navigate("/app")}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to App
        </Button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl! font-bold! text-foreground mb-4">Pricing</h1>
        <p className="text-muted-foreground text-lg! max-w-2xl! mx-auto!">
          Choose the perfect plan for your business needs. Pro, and Business plans include a 3-day free trial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {(billingPlans as PlanObjectWithCouponPlanIncluded[]).map((rootPlan) => {
          const couponBillingPlan = couponPlansRef.current?.find((p: { billingPlan: PlanObject }) => p.billingPlan.title === rootPlan.title);
          const plan = couponBillingPlan?.billingPlan || rootPlan;
          if (couponBillingPlan) {
            plan.amount = couponBillingPlan?.couponPlan?.value;
            plan.attributes.productLimit = couponBillingPlan.couponPlan.productLimit;
          }
          return (
            <Card
              key={plan.title} 
              className={`flex flex-col overflow-visible! relative transition-all duration-200 hover:shadow-lg ${
                (plan.popular && totalShopifyProducts != plan.attributes.productLimit) ? 'ring-2 ring-primary' : ''
              } ${totalShopifyProducts >= plan.attributes.productLimit 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-lg'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}

                {totalShopifyProducts >= plan.attributes.productLimit && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant="destructive" className="text-xs">
                      Not Available
                    </Badge>
                  </div>
                )}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {getIcon(plan.icon)}
                </div>
                <CardTitle className="text-xl">{plan.title}</CardTitle>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-3xl! font-bold! text-primary">
                    ${plan.amount}
                  </span>
                  <span className="text-muted-foreground">/ {plan.interval}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature: string, index: number) => {
                    return (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <span>{feature?.includes("Up to") ? `Up to ${plan?.attributes?.productLimit} total products in the store` : feature}</span>
                      </li>
                    )
                  })}
                </ul>

                {totalShopifyProducts >= plan.attributes.productLimit && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                    <p className="text-sm text-destructive font-medium text-center">
                      Plan not available
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Your store has {totalShopifyProducts} products, which exceeds this plan's limit of {plan.attributes.productLimit} products.
                    </p>
                  </div>
                )}

                <div className="space-y-3 mt-auto">
                  <Button
                    onClick={() => {if (!(totalShopifyProducts >= plan.attributes.productLimit || currentSubscription?.name === plan.title)) {
                        fetcher.submit(JSON.stringify({ coupon: couponCode || coupon || "", plan: plan.title }), {
                          method: "PUT",
                          encType: "application/json",
                        });
                      }
                    }}
                    disabled={totalShopifyProducts >= plan.attributes.productLimit || currentSubscription?.name === plan.title}
                    className={cn("w-full", {
                      "cursor-not-allowed! pointer-events-auto!": totalShopifyProducts >= plan.attributes.productLimit || currentSubscription?.name === plan.title
                    })}
                    // @ts-ignore
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {currentSubscription?.name === plan.title ? "Currently Active Plan" : ((plan.title === "Enterprise" && !currentSubscription?.name) || (!currentSubscription && shopDBData?.billing?.trial_taken)) ? "Get Started" : currentSubscription?.id ? "Change Plan" : plan?.trialDays > 0 ? "Start Free Trial" : "Get Started"}
                  </Button>

                  {currentSubscription?.name === plan.title && currentSubscription?.createdAt && (
                    <div className="flex items-center justify-center">
                      <CancelSubscriptionDialog>
                        <Button
                            // @ts-ignore
                            variant="link">Cancel</Button>
                      </CancelSubscriptionDialog>
                    </div>
                  )}
                  
                  {(plan.title !== "Enterprise" && plan?.trialDays > 0 && !currentSubscription?.name && !shopDBData?.billing?.trial_taken) && (
                    <div className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        3-day free trial
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="bg-muted/30 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Understanding Your Subscription</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <p className="mb-2">
              <strong>3-day free trial:</strong> Available for Pro, and Business plans. You can cancel anytime during this trial period for a full refund, 
              and your subscription will be cancelled immediately.
            </p>
          </div>
          <div>
            <p className="mb-2">
              <strong>After trial:</strong> If you cancel your subscription post-trial, your plan will remain 
              active until the end of your current billing period.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          You will be redirected to a secure payment page to complete your details.
        </p>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        All charges are billed in USD. Recurring and usage-based charges&nbsp;
          <AlertDialog
            key={"AlertDialog_" + (fetcher.state !== "idle")}
          >
            <AlertDialogTrigger asChild>
              <span>are</span>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm">
              <AlertDialogCancel asChild>
                <button
                  className="absolute right-1 top-1 text-muted-foreground hover:text-foreground text-2xl leading-none p-0 m-0 bg-transparent border-none cursor-pointer"
                  aria-label="Close"
                >
                  <span className="text-2xl font-semibold">&times;</span>
                </button>
              </AlertDialogCancel>

              <AlertDialogHeader>
                <div className="flex items-center gap-2">
                  <AlertDialogTitle className="text-lg">
                    Have a Coupon Code?
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription>
                  Enter your coupon code below to apply a discount to your subscription. If your code is valid, the discount will be reflected at checkout.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="w-full mx-auto">
                <div
                  className="flex flex-col gap-3"
                >
                  <Input
                    type="text"
                    name="coupon"
                    placeholder="Enter coupon code"
                    className="border rounded px-3 py-2 w-full"
                    autoComplete="off"
                    value={coupon || ""}
                    onChange={e => setCoupon(e.target.value)}
                  />
                  <Button onClick={() => {
                    fetcher.submit(JSON.stringify({ coupon }), {
                      method: "POST",
                      encType: "application/json",
                    });
                  }} disabled={isCouponFetchLoading} loading={isCouponFetchLoading} type="submit" className="w-full">
                    Apply Coupon
                  </Button>

                  <AlertDialogCancel asChild disabled={isCouponFetchLoading}>
                    <Button
                        // @ts-ignore
                        variant="outline" className="bg-[#ef4444] text-white hover:bg-[#ed5d5d] hover:text-white" >Cancel</Button>
                  </AlertDialogCancel>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Coupon codes are case-sensitive and may have usage or expiry restrictions. If you have any issues, please contact support.
                </p>
              </div>

              {/* {(fetcher?.data as { data: { customPlan?: { features?: string[] } } })?.data?.customPlan && <ul className="mt-2 mb-4 list-none space-y-2 bg-muted/50 rounded-lg p-3 text-sm">
                {(fetcher?.data as { data: { customPlan?: { features?: string[] } } })?.data?.customPlan?.features?.map((item: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-muted-foreground">
                    <XCircleIcon className="h-4 w-4 text-destructive" />
                    {item}
                  </li>
                ))}
              </ul>} */}

              {/* {(fetcher?.data as { data: { customPlan?: { features?: string[] } } })?.data?.customPlan && <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                <Button loading={applyCouponLoading} disabled={applyCouponLoading} className="ml-0" onClick={() => {
                  setApplyCouponLoading(true);
                  navigate(`/app/upgrade/${(fetcher?.data as { data: { customPlan?: { title: string } } })?.data?.customPlan?.title}?coupon=${encodeURIComponent(coupon || '')}`);
                }}>Apply</Button>
                <AlertDialogCancel asChild disabled={applyCouponLoading}>
                  <Button variant="outline">Cancel</Button>
                </AlertDialogCancel>
              </AlertDialogFooter>} */}
            </AlertDialogContent>
          </AlertDialog>
          &nbsp;billed every 30 days.
      </div>
    </div>
  </div>
  ) 
}