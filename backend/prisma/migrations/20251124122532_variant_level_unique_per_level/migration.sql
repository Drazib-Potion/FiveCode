/*
  Warnings:

  - A unique constraint covering the columns `[familyId,code,variantLevel]` on the table `variants` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "variants_familyId_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "variants_familyId_code_variantLevel_key" ON "variants"("familyId", "code", "variantLevel");
