-- AlterTable
ALTER TABLE "public"."users"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "dob" TIMESTAMP(3),
ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Keep existing accounts usable after upgrade.
UPDATE "public"."users"
SET "emailVerified" = true
WHERE "emailVerified" = false;

-- CreateEnum
CREATE TYPE "public"."VerificationChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "public"."VerificationPurpose" AS ENUM ('REGISTER', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "public"."verification_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "public"."VerificationChannel" NOT NULL,
    "purpose" "public"."VerificationPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_codes_userId_purpose_channel_idx" ON "public"."verification_codes"("userId", "purpose", "channel");

-- CreateIndex
CREATE INDEX "verification_codes_expiresAt_idx" ON "public"."verification_codes"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."verification_codes" ADD CONSTRAINT "verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
