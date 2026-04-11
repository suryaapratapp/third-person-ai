-- Add cloud-storage metadata fields for uploaded files.
-- Backward compatible: existing rows keep working with nullable new columns.
ALTER TABLE "uploaded_files"
ADD COLUMN "storageProvider" TEXT DEFAULT 'google_drive',
ADD COLUMN "storageFileId" TEXT,
ADD COLUMN "storageFileUrl" TEXT,
ADD COLUMN "originalName" TEXT;

CREATE INDEX "uploaded_files_storageFileId_idx" ON "uploaded_files"("storageFileId");
