/*
  Warnings:

  - You are about to drop the column `position` on the `technical_characteristics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "technical_characteristics" DROP COLUMN "position",
ADD COLUMN     "enumOptions" JSONB;
