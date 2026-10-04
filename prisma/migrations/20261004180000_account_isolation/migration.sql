-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "userId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "userId" TEXT;

-- Existing data belongs to dealercms; create the account if needed
INSERT INTO "User" ("id", "login", "passwordHash", "createdAt", "updatedAt")
VALUES (
  'cmdealercmsowner000000001',
  'dealercms',
  '7d7477f8e195a079d487a32f43cd5aa9:2e9024d7af0696572802d13aad546660c8b6d90ed9027209555dc246e8bd7ce194c7f5a352f2f7c9c96978649b297cbb17ac6a21d7ac9daf8826e6f192d96bf1',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("login") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Provider"
SET "userId" = (SELECT "id" FROM "User" WHERE "login" = 'dealercms')
WHERE "userId" IS NULL;

UPDATE "Campaign"
SET "userId" = (SELECT "id" FROM "User" WHERE "login" = 'dealercms')
WHERE "userId" IS NULL;

ALTER TABLE "Provider" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Campaign" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Provider_userId_idx" ON "Provider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_userId_type_key" ON "Provider"("userId", "type");

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
