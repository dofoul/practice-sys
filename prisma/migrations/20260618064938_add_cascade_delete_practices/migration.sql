-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_practice_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_reviews" DROP CONSTRAINT "practice_reviews_practice_id_fkey";

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_reviews" ADD CONSTRAINT "practice_reviews_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
