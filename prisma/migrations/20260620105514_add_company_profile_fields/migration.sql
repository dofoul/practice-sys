-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" VARCHAR(255);
