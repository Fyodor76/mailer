-- AlterEnum
ALTER TYPE "RecipientStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "RecipientStatus" ADD VALUE IF NOT EXISTS 'OPENED';
ALTER TYPE "RecipientStatus" ADD VALUE IF NOT EXISTS 'CLICKED';
ALTER TYPE "RecipientStatus" ADD VALUE IF NOT EXISTS 'BOUNCED';
ALTER TYPE "RecipientStatus" ADD VALUE IF NOT EXISTS 'SPAM';
ALTER TYPE "RecipientStatus" ADD VALUE IF NOT EXISTS 'UNSUBSCRIBED';

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT;
ALTER TABLE "Recipient" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Recipient" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipient_providerJobId_idx" ON "Recipient"("providerJobId");
CREATE INDEX IF NOT EXISTS "Recipient_email_idx" ON "Recipient"("email");
