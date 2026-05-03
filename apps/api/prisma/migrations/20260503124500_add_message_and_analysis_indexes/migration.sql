CREATE INDEX IF NOT EXISTS "messages_uploadSessionId_timestamp_idx"
ON "messages" ("uploadSessionId", "timestamp");

CREATE INDEX IF NOT EXISTS "analysis_runs_uploadSessionId_status_idx"
ON "analysis_runs" ("uploadSessionId", "status");
