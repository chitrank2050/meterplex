-- CreateEnum
CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "usage_event_status" AS ENUM ('PENDING', 'VALIDATED', 'AGGREGATED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "dead_letter_stage" AS ENUM ('INGESTION', 'PUBLISHING', 'VALIDATION', 'AGGREGATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "dead_letter_status" AS ENUM ('FAILED', 'RETRYING', 'RESOLVED', 'DISCARDED');

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID,
    "feature_lookup_key" VARCHAR(100) NOT NULL,
    "amount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "usage_event_status" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" VARCHAR(500),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "topic" VARCHAR(255) NOT NULL,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_status" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "last_error" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_aggregates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID,
    "feature_lookup_key" VARCHAR(100) NOT NULL,
    "period_key" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "last_event_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_events" (
    "id" UUID NOT NULL,
    "source_event_id" VARCHAR(255),
    "tenant_id" UUID,
    "topic" VARCHAR(255) NOT NULL,
    "failure_stage" "dead_letter_stage" NOT NULL,
    "failure_reason" VARCHAR(1000) NOT NULL,
    "original_payload" JSONB NOT NULL,
    "error_details" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" "dead_letter_status" NOT NULL DEFAULT 'FAILED',
    "first_failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_attempted_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_event_id_key" ON "usage_events"("event_id");

-- CreateIndex
CREATE INDEX "usage_events_tenant_id_feature_lookup_key_timestamp_idx" ON "usage_events"("tenant_id", "feature_lookup_key", "timestamp");

-- CreateIndex
CREATE INDEX "usage_events_status_idx" ON "usage_events"("status");

-- CreateIndex
CREATE INDEX "usage_events_subscription_id_idx" ON "usage_events"("subscription_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_next_retry_at_idx" ON "outbox_events"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "outbox_events_created_at_idx" ON "outbox_events"("created_at");

-- CreateIndex
CREATE INDEX "usage_aggregates_subscription_id_idx" ON "usage_aggregates"("subscription_id");

-- CreateIndex
CREATE INDEX "usage_aggregates_tenant_id_feature_lookup_key_idx" ON "usage_aggregates"("tenant_id", "feature_lookup_key");

-- CreateIndex
CREATE UNIQUE INDEX "usage_aggregates_tenant_id_feature_lookup_key_period_key_su_key" ON "usage_aggregates"("tenant_id", "feature_lookup_key", "period_key", "subscription_id");

-- CreateIndex
CREATE INDEX "dead_letter_events_status_idx" ON "dead_letter_events"("status");

-- CreateIndex
CREATE INDEX "dead_letter_events_tenant_id_idx" ON "dead_letter_events"("tenant_id");

-- CreateIndex
CREATE INDEX "dead_letter_events_failure_stage_idx" ON "dead_letter_events"("failure_stage");

-- CreateIndex
CREATE INDEX "dead_letter_events_first_failed_at_idx" ON "dead_letter_events"("first_failed_at");

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
