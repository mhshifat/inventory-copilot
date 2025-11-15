import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, BILLING_OBJECTS } from "../shopify.server";
import { SyncLogType } from "@prisma/client";
import type { BillingCouponType, ICouponBillingPlan, PlanObject, PlanType } from "@/types/billing";
import prisma from "@/lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const searchParams = new URL(request.url).searchParams;
    const coupon = searchParams.get("coupon") || "";
    const { billing, session, redirect } = await authenticate.admin(request);

    try {
        let trialEndDate: Date | null = null; // Assuming trialEndDate is not used in this context, otherwise it should be defined or removed.
        const existingBilling = await billing.check({});
        const currentBilling = existingBilling.appSubscriptions?.[0];
        
        if (currentBilling?.status !== "ACTIVE") return redirect("/app?force-reload=true", 303);
        if (currentBilling?.trialDays > 0) {
            trialEndDate = new Date(currentBilling.createdAt);
            trialEndDate.setDate(trialEndDate.getDate() + currentBilling.trialDays);
        }

        // const currentPlanObj: PlanObject | undefined = Object.values(BILLING_OBJECTS).find(plan => plan.title === currentBilling.name);
        const currentPlanObj: PlanObject | undefined = BILLING_OBJECTS[currentBilling.name as keyof typeof BILLING_OBJECTS];
        let selectedCouponPlan: ICouponBillingPlan | null = null;
        let couponExists: boolean = false;

        if(coupon && currentBilling.name){
            const couponData = await prisma.billingCoupon.findFirst({
                where: {
                    code: coupon
                }
            });
    
          const couponPlans: ICouponBillingPlan[] = couponData?.plans ? JSON.parse(couponData.plans) : [];
    
          if(Array.isArray(couponPlans) && couponPlans.length > 0) {
              for (const couponPlan of couponPlans) {
                if (couponPlan.planName === currentBilling.name) {
                    couponExists = true;
                    selectedCouponPlan = couponPlan;
                    break;
                }
              }
          }
        }
    
        const shop = await prisma.shop.findFirst({
            where: { domain: session?.shop },
            select: {
                id: true,
                billing: {
                    select: {
                        current_plan_id: true,
                        current_plan_name: true,
                        current_billing_start: true,
                        current_billing_end: true,
                        current_product_limit: true,
                        current_plan_cycle: true,
                        current_plan_price: true,
                        trial_taken: true,
                        previous_plan_id: true,
                        previous_plan_name: true,
                        previous_billing_start: true,
                        previous_billing_end: true,
                        previous_product_limit: true,
                        cancelled_subscription_at: true,
                        status: true,
                    }
                }
            }
        });

        if (!shop) {
            throw new Error("Shop not found");
        }

        let priceAfterCoupon: number = currentPlanObj?.amount;
        let productLimitAfterCoupon: number = currentPlanObj?.attributes.productLimit;


        if(couponExists === true && selectedCouponPlan){
          if(selectedCouponPlan?.type === 'FIXED_AMOUNT_DISCOUNT'){
            priceAfterCoupon = currentPlanObj.amount - selectedCouponPlan.value;
          }else if(selectedCouponPlan?.type === 'PERCENTAGE_DISCOUNT'){
            priceAfterCoupon = currentPlanObj.amount * (1 - selectedCouponPlan.value / 100);
          }else if(selectedCouponPlan?.type === 'FIXED_PRICE'){
            priceAfterCoupon = selectedCouponPlan.value;
          }

          if(selectedCouponPlan?.productLimit > 0) productLimitAfterCoupon = selectedCouponPlan.productLimit;
        }

        const billingCreateObject = {
            current_plan_id: currentBilling.id,
            current_plan_name: currentBilling.name as PlanType,
            current_billing_start: currentBilling.createdAt, 
            current_billing_end: currentBilling.currentPeriodEnd,
            current_plan_cycle: "MONTHLY",
            current_product_limit: couponExists === true ? productLimitAfterCoupon : currentPlanObj?.attributes.productLimit || 0,
            current_plan_price: couponExists === true ? priceAfterCoupon : currentPlanObj?.amount || 0,
            trial_taken: true,
            previous_plan_id: shop?.billing?.current_plan_id || null,
            previous_plan_name: shop?.billing?.current_plan_name || null,
            previous_billing_start: shop?.billing?.current_billing_start || null,
            previous_billing_end: shop?.billing?.current_billing_end || null,
            previous_product_limit: shop?.billing?.current_product_limit || 0,
            previous_plan_cycle: shop?.billing?.current_plan_cycle || "MONTHLY",
            previous_plan_price: shop?.billing?.current_plan_price || 0,
            shop_id: shop.id,
            coupon_applied: couponExists === true ? true : false,
            coupon_plan_name: couponExists === true ? currentBilling.name as PlanType : null,
            coupon_value: couponExists === true ? selectedCouponPlan?.value : null,
            coupon_value_type: couponExists === true ? selectedCouponPlan?.type as BillingCouponType : null,
            coupon_product_limit: couponExists === true ? selectedCouponPlan?.productLimit : null,
            coupon_duration_limit_intervals: couponExists === true ? selectedCouponPlan?.durationLimitIntervals || null : null,
            coupon_plan_cycle: couponExists === true ? selectedCouponPlan?.planCycle || null : null,
            ...(couponExists === true && { coupon_code: coupon }),
            ...(trialEndDate ? { trial_end: trialEndDate } : {}),
        } as const;

        await prisma.billing.upsert({
            where: { shop_id: shop?.id },
            create: billingCreateObject,
            update: {
                current_plan_id: currentBilling.id,
                current_plan_name: currentBilling.name as PlanType,
                current_billing_start: currentBilling.createdAt, 
                current_billing_end: currentBilling.currentPeriodEnd,
                current_product_limit: couponExists === true ? productLimitAfterCoupon : currentPlanObj?.attributes.productLimit || 0,
                current_plan_price: couponExists === true ? priceAfterCoupon : currentPlanObj?.amount || 0,
                current_plan_cycle: "MONTHLY",
                trial_taken: true,
                previous_plan_id: shop?.billing?.current_plan_id || null,
                previous_plan_name: shop?.billing?.current_plan_name || null,
                previous_billing_start: shop?.billing?.current_billing_start || null,
                previous_billing_end: shop?.billing?.current_billing_end || null,
                previous_product_limit: shop?.billing?.current_product_limit || 0,
                previous_plan_cycle: shop?.billing?.current_plan_cycle || "MONTHLY",
                previous_plan_price: shop?.billing?.current_plan_price || 0,
                coupon_applied: couponExists === true ? true : false,
                coupon_plan_name: couponExists === true ? currentBilling.name as PlanType : null,
                coupon_value: couponExists === true ? selectedCouponPlan?.value : null,
                coupon_value_type: couponExists === true ? selectedCouponPlan?.type as BillingCouponType : null,
                coupon_product_limit: couponExists === true ? selectedCouponPlan?.productLimit : null,
                coupon_duration_limit_intervals: couponExists === true ? selectedCouponPlan?.durationLimitIntervals || null : null,
                coupon_plan_cycle: couponExists === true ? selectedCouponPlan?.planCycle || null : null,
                ...(couponExists === true && { coupon_code: coupon }),
                ...(trialEndDate ? { trial_end: trialEndDate } : {}),
            }
        });

        await prisma.syncLog.create({
          data: {
            type: SyncLogType.BILLING_PLAN_CHANGE,
            message: `Billing plan${couponExists ? " (with coupon: " + coupon + ")" : ""} changed in the shop(${session?.shop})`,
            created_at: new Date(),
            shop_id: shop?.id,
            status: "COMPLETED",
          },
          select: {
            id: true,
          },
        });

        return redirect("/app?force-reload=true", 303);
    } catch (error) {
        console.error("Error occurred while processing billing success:", error);
        return redirect("/app?force-reload=true", 303);
    }
};