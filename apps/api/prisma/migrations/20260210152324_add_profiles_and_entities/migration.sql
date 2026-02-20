-- CreateEnum
CREATE TYPE "public"."PersonEntityType" AS ENUM ('Friend', 'Partner', 'Crush', 'Family', 'Cousin', 'Sibling', 'Colleague', 'Other');

-- CreateTable
CREATE TABLE "public"."person_entities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."PersonEntityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personality_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personEntityId" TEXT NOT NULL,
    "profileJSON" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_entities_userId_idx" ON "public"."person_entities"("userId");

-- CreateIndex
CREATE INDEX "person_entities_type_idx" ON "public"."person_entities"("type");

-- CreateIndex
CREATE INDEX "personality_profiles_userId_idx" ON "public"."personality_profiles"("userId");

-- CreateIndex
CREATE INDEX "personality_profiles_personEntityId_idx" ON "public"."personality_profiles"("personEntityId");

-- AddForeignKey
ALTER TABLE "public"."person_entities" ADD CONSTRAINT "person_entities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personality_profiles" ADD CONSTRAINT "personality_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personality_profiles" ADD CONSTRAINT "personality_profiles_personEntityId_fkey" FOREIGN KEY ("personEntityId") REFERENCES "public"."person_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
