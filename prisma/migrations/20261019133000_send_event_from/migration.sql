-- AlterTable
ALTER TABLE "SendEvent" ADD COLUMN "fromEmail" TEXT;

-- Existing events belong to the campaign provider that was used to send them
UPDATE "SendEvent" AS event
SET "fromEmail" = provider."fromEmail"
FROM "Campaign" AS campaign
JOIN "Provider" AS provider ON provider."id" = campaign."providerId"
WHERE event."campaignId" = campaign."id"
  AND event."fromEmail" IS NULL;
