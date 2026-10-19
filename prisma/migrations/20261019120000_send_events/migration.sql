-- CreateTable
CREATE TABLE "SendEvent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "status" "RecipientStatus" NOT NULL,
    "error" TEXT,
    "providerJobId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'worker',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "SendEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SendEvent_campaignId_sentAt_idx" ON "SendEvent"("campaignId", "sentAt");

-- CreateIndex
CREATE INDEX "SendEvent_campaignId_email_idx" ON "SendEvent"("campaignId", "email");

-- AddForeignKey
ALTER TABLE "SendEvent" ADD CONSTRAINT "SendEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
