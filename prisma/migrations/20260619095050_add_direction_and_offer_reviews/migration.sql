-- AlterTable
ALTER TABLE "practice_offers" ADD COLUMN     "direction" VARCHAR(128);

-- CreateTable
CREATE TABLE "offer_reviews" (
    "id" SERIAL NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "practice_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offer_reviews_practice_id_key" ON "offer_reviews"("practice_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_reviews_offer_id_student_id_key" ON "offer_reviews"("offer_id", "student_id");

-- AddForeignKey
ALTER TABLE "offer_reviews" ADD CONSTRAINT "offer_reviews_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "practice_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_reviews" ADD CONSTRAINT "offer_reviews_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_reviews" ADD CONSTRAINT "offer_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
