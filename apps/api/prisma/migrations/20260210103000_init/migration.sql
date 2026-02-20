-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."upload_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceApp" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."uploaded_files" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analysis_runs" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."insights" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."love_guru_threads" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "love_guru_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."love_guru_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "love_guru_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "upload_sessions_userId_idx" ON "public"."upload_sessions"("userId");

-- CreateIndex
CREATE INDEX "upload_sessions_sourceApp_idx" ON "public"."upload_sessions"("sourceApp");

-- CreateIndex
CREATE INDEX "uploaded_files_uploadSessionId_idx" ON "public"."uploaded_files"("uploadSessionId");

-- CreateIndex
CREATE INDEX "messages_uploadSessionId_idx" ON "public"."messages"("uploadSessionId");

-- CreateIndex
CREATE INDEX "messages_timestamp_idx" ON "public"."messages"("timestamp");

-- CreateIndex
CREATE INDEX "analysis_runs_uploadSessionId_idx" ON "public"."analysis_runs"("uploadSessionId");

-- CreateIndex
CREATE INDEX "insights_analysisRunId_idx" ON "public"."insights"("analysisRunId");

-- CreateIndex
CREATE INDEX "insights_type_idx" ON "public"."insights"("type");

-- CreateIndex
CREATE INDEX "love_guru_threads_analysisRunId_idx" ON "public"."love_guru_threads"("analysisRunId");

-- CreateIndex
CREATE INDEX "love_guru_messages_threadId_idx" ON "public"."love_guru_messages"("threadId");

-- CreateIndex
CREATE INDEX "love_guru_messages_role_idx" ON "public"."love_guru_messages"("role");

-- AddForeignKey
ALTER TABLE "public"."upload_sessions" ADD CONSTRAINT "upload_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uploaded_files" ADD CONSTRAINT "uploaded_files_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "public"."upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "public"."upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analysis_runs" ADD CONSTRAINT "analysis_runs_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "public"."upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."insights" ADD CONSTRAINT "insights_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "public"."analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."love_guru_threads" ADD CONSTRAINT "love_guru_threads_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "public"."analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."love_guru_messages" ADD CONSTRAINT "love_guru_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."love_guru_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

