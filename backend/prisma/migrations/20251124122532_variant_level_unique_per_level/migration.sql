
-- DropIndex
DROP INDEX "variants_familyId_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "variants_familyId_code_variantLevel_key" ON "variants"("familyId", "code", "variantLevel");
