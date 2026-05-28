-- AlterTable
ALTER TABLE "reconciliation_issues" ADD COLUMN     "category" VARCHAR(50) NOT NULL DEFAULT 'usage';

-- CreateIndex
CREATE INDEX "reconciliation_issues_category_idx" ON "reconciliation_issues"("category");
