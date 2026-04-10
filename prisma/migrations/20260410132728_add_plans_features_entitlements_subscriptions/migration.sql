-- CreateEnum
CREATE TYPE "plan_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "billing_interval" AS ENUM ('MONTHLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "feature_type" AS ENUM ('BOOLEAN', 'QUOTA', 'METERED');

-- CreateEnum
CREATE TYPE "limit_behavior" AS ENUM ('HARD', 'SOFT');

-- CreateEnum
CREATE TYPE "reset_period" AS ENUM ('MONTHLY', 'ANNUALLY', 'NEVER');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'PAUSED');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "plan_status" NOT NULL DEFAULT 'ACTIVE',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "interval" "billing_interval" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "lookup_key" VARCHAR(100) NOT NULL,
    "type" "feature_type" NOT NULL,
    "unit" VARCHAR(50),
    "description" TEXT,
    "status" "plan_status" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "value" BOOLEAN,
    "limit" INTEGER,
    "limit_behavior" "limit_behavior",
    "overage_price" INTEGER,
    "included_amount" INTEGER,
    "reset_period" "reset_period",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "price_id" UUID NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "billing_anchor" INTEGER NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_snapshots" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "feature_lookup_key" VARCHAR(100) NOT NULL,
    "feature_type" "feature_type" NOT NULL,
    "value" BOOLEAN,
    "limit" INTEGER,
    "limit_behavior" "limit_behavior",
    "overage_price" INTEGER,
    "included_amount" INTEGER,
    "reset_period" "reset_period",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plan_prices_plan_id_idx" ON "plan_prices"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_plan_id_interval_currency_key" ON "plan_prices"("plan_id", "interval", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "features_lookup_key_key" ON "features"("lookup_key");

-- CreateIndex
CREATE INDEX "entitlements_plan_id_idx" ON "entitlements"("plan_id");

-- CreateIndex
CREATE INDEX "entitlements_feature_id_idx" ON "entitlements"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_plan_id_feature_id_key" ON "entitlements"("plan_id", "feature_id");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "entitlement_snapshots_subscription_id_idx" ON "entitlement_snapshots"("subscription_id");

-- CreateIndex
CREATE INDEX "entitlement_snapshots_feature_lookup_key_idx" ON "entitlement_snapshots"("feature_lookup_key");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_snapshots_subscription_id_feature_lookup_key_key" ON "entitlement_snapshots"("subscription_id", "feature_lookup_key");

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "plan_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_snapshots" ADD CONSTRAINT "entitlement_snapshots_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
