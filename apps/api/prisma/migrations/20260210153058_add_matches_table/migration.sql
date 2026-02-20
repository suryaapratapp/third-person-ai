-- CreateTable
CREATE TABLE "public"."matches" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matches_requesterUserId_idx" ON "public"."matches"("requesterUserId");

-- CreateIndex
CREATE INDEX "matches_targetUserId_idx" ON "public"."matches"("targetUserId");

-- CreateIndex
CREATE INDEX "matches_score_idx" ON "public"."matches"("score");

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
