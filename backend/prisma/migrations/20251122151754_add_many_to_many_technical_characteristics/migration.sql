/*
  Warnings:

  - You are about to drop the column `familyId` on the `technical_characteristics` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `technical_characteristics` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "technical_characteristics" DROP CONSTRAINT "technical_characteristics_familyId_fkey";

-- DropForeignKey
ALTER TABLE "technical_characteristics" DROP CONSTRAINT "technical_characteristics_variantId_fkey";

-- AlterTable
ALTER TABLE "technical_characteristics" DROP COLUMN "familyId",
DROP COLUMN "variantId";

-- CreateTable
CREATE TABLE "technical_characteristic_families" (
    "id" TEXT NOT NULL,
    "technicalCharacteristicId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_characteristic_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_characteristic_variants" (
    "id" TEXT NOT NULL,
    "technicalCharacteristicId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_characteristic_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technical_characteristic_families_technicalCharacteristicId_key" ON "technical_characteristic_families"("technicalCharacteristicId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "technical_characteristic_variants_technicalCharacteristicId_key" ON "technical_characteristic_variants"("technicalCharacteristicId", "variantId");

-- AddForeignKey
ALTER TABLE "technical_characteristic_families" ADD CONSTRAINT "technical_characteristic_families_technicalCharacteristicI_fkey" FOREIGN KEY ("technicalCharacteristicId") REFERENCES "technical_characteristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_characteristic_families" ADD CONSTRAINT "technical_characteristic_families_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_characteristic_variants" ADD CONSTRAINT "technical_characteristic_variants_technicalCharacteristicI_fkey" FOREIGN KEY ("technicalCharacteristicId") REFERENCES "technical_characteristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_characteristic_variants" ADD CONSTRAINT "technical_characteristic_variants_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
