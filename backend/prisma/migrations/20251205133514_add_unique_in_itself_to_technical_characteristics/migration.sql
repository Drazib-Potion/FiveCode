-- AlterTable
ALTER TABLE "technical_characteristics" ADD COLUMN     "uniqueInItself" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
