-- AlterTable
ALTER TABLE "public"."analysis_runs" ADD COLUMN     "personEntityId" TEXT;

-- CreateIndex
CREATE INDEX "analysis_runs_personEntityId_idx" ON "public"."analysis_runs"("personEntityId");

-- AddForeignKey
ALTER TABLE "public"."analysis_runs" ADD CONSTRAINT "analysis_runs_personEntityId_fkey" FOREIGN KEY ("personEntityId") REFERENCES "public"."person_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
