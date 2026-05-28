-- CreateEnum
CREATE TYPE "reconciliation_run_status" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "reconciliation_issue_status" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "reconciliation_runs" (
    "id" UUID NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER,
    "tenants_checked" INTEGER NOT NULL DEFAULT 0,
    "issues_found" INTEGER NOT NULL DEFAULT 0,
    "status" "reconciliation_run_status" NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "triggered_by" VARCHAR(255) NOT NULL DEFAULT 'cron',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_issues" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "feature_lookup_key" VARCHAR(100) NOT NULL,
    "period_key" VARCHAR(20) NOT NULL,
    "expected" INTEGER NOT NULL,
    "actual" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "status" "reconciliation_issue_status" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_runs_ran_at_idx" ON "reconciliation_runs"("ran_at");

-- CreateIndex
CREATE INDEX "reconciliation_runs_status_idx" ON "reconciliation_runs"("status");

-- CreateIndex
CREATE INDEX "reconciliation_issues_run_id_idx" ON "reconciliation_issues"("run_id");

-- CreateIndex
CREATE INDEX "reconciliation_issues_tenant_id_idx" ON "reconciliation_issues"("tenant_id");

-- CreateIndex
CREATE INDEX "reconciliation_issues_status_idx" ON "reconciliation_issues"("status");

-- AddForeignKey
ALTER TABLE "reconciliation_issues" ADD CONSTRAINT "reconciliation_issues_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "reconciliation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
