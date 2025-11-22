/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `families` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[familyId,code]` on the table `variants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `families` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `variants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "families" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "families_code_key" ON "families"("code");

-- CreateIndex
CREATE UNIQUE INDEX "variants_familyId_code_key" ON "variants"("familyId", "code");
