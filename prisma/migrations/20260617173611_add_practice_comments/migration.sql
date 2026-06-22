-- CreateTable
CREATE TABLE "practice_comments" (
    "id" SERIAL NOT NULL,
    "practice_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_comments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "practice_comments" ADD CONSTRAINT "practice_comments_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_comments" ADD CONSTRAINT "practice_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
