import { Readable } from 'node:stream'
import { drive } from './googleDrive'

export async function uploadToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured')
  }

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink, webContentLink',
  })

  const fileId = response.data.id
  if (!fileId) {
    throw new Error('Google Drive did not return a file id')
  }

  // OLD APPROACH: this made files public to anyone. We keep auth-only access now.
  // await drive.permissions.create({
  //   fileId,
  //   requestBody: {
  //     role: "reader",
  //     type: "anyone",
  //   },
  // });

  return {
    fileId,
    url: `https://drive.google.com/drive/uc?id=${fileId}`,
    viewUrl: response.data.webViewLink ?? null,
  }
}