-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DOWNGRADE', 'UPGRADE', 'CANCELLED', 'EXPIRED', 'PENDING', 'ACTIVE', 'DECLINED', 'FROZEN');

-- CreateEnum
CREATE TYPE "PlanCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingCouponType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('Starter', 'Pro', 'Business', 'Enterprise');

-- CreateTable
CREATE TABLE "billings" (
    "id" SERIAL NOT NULL,
    "current_plan_id" TEXT NOT NULL,
    "current_plan_name" "PlanType" NOT NULL,
    "current_billing_start" TIMESTAMP(3) NOT NULL,
    "current_billing_end" TIMESTAMP(3) NOT NULL,
    "current_product_limit" INTEGER NOT NULL,
    "current_plan_price" DECIMAL(10,2) NOT NULL,
    "current_plan_cycle" "PlanCycle" NOT NULL,
    "remaining_credit" INTEGER DEFAULT 0,
    "trial_taken" BOOLEAN NOT NULL DEFAULT false,
    "trial_end" TIMESTAMP(3),
    "previous_plan_id" TEXT,
    "previous_plan_name" "PlanType",
    "previous_billing_start" TIMESTAMP(3),
    "previous_billing_end" TIMESTAMP(3),
    "previous_product_limit" INTEGER,
    "previous_plan_price" DECIMAL(10,2) NOT NULL,
    "previous_plan_cycle" "PlanCycle" NOT NULL,
    "cancelled_subscription_at" TIMESTAMP(3),
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "coupon_applied" BOOLEAN NOT NULL DEFAULT false,
    "coupon_code" TEXT,
    "coupon_plan_name" "PlanType",
    "coupon_value" DECIMAL(10,2),
    "coupon_value_type" "BillingCouponType",
    "coupon_duration_limit_intervals" INTEGER,
    "coupon_product_limit" INTEGER,
    "coupon_plan_cycle" "PlanCycle",
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "billings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_coupons" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "plans" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "allowed_domains" TEXT,
    "max_usage_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billings_shop_id_key" ON "billings"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_coupons_code_key" ON "billing_coupons"("code");

-- CreateIndex
CREATE INDEX "billing_coupons_code_idx" ON "billing_coupons"("code");

-- AddForeignKey
ALTER TABLE "billings" ADD CONSTRAINT "billings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
