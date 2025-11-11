-- AlterTable
ALTER TABLE "users" ADD COLUMN "telegram_id" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");
