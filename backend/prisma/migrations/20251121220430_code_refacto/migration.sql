
-- AlterTable
ALTER TABLE "families" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "families_code_key" ON "families"("code");

-- CreateIndex
CREATE UNIQUE INDEX "variants_familyId_code_key" ON "variants"("familyId", "code");
