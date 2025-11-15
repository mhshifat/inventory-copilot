import type { BILLING_OBJECTS } from "app/shopify.server";

export type PlanCycle = 'MONTHLY' | 'ANNUAL';
export type BillingCouponType = 'PERCENTAGE_DISCOUNT' | 'FIXED_AMOUNT_DISCOUNT' | 'FIXED_PRICE';
export type PlanType = 'Starter' | 'Pro' | 'Business' | 'Enterprise';
export type PlanObject = (typeof BILLING_OBJECTS)[keyof typeof BILLING_OBJECTS];

export interface ICouponBillingPlan {          
    planName: PlanType;
    productLimit: number;
    value: number;
    type: BillingCouponType;
    planCycle?: PlanCycle;
    durationLimitIntervals?: number;               
}

export type PlanObjectWithCouponPlanIncluded = PlanObject & { couponPlan?: ICouponBillingPlan };