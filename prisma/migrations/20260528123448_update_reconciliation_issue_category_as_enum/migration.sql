/*
  Warnings:

  - The `category` column on the `reconciliation_issues` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "reconciliation_issue_category" AS ENUM ('USAGE', 'SUBSCRIPTION_PAYMENT');

-- AlterTable
ALTER TABLE "reconciliation_issues" DROP COLUMN "category",
ADD COLUMN     "category" "reconciliation_issue_category" NOT NULL DEFAULT 'USAGE';

-- CreateIndex
CREATE INDEX "reconciliation_issues_category_idx" ON "reconciliation_issues"("category");
