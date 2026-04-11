import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

export const drive = google.drive({
  version: 'v3',
  auth: oauth2Client,
})

export async function downloadFileBufferFromGoogleDrive(
  fileId: string,
): Promise<Buffer> {
  try {
    console.log(`[Google Drive] Downloading file: ${fileId}`)

    // Fetch metadata
    const metadata = await drive.files.get({
      fileId,
      fields: 'mimeType, name',
    })

    const mimeType = metadata.data.mimeType
    const name = metadata.data.name

    if (!mimeType) {
      throw new Error(`Unable to determine MIME type for file ${fileId}`)
    }

    // Google Workspace files require export
    if (mimeType.startsWith('application/vnd.google-apps')) {
      throw new Error(
        `File "${name}" is a Google Workspace document (${mimeType}). Please export it before processing.`,
      )
    }

    // Download binary content
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'arraybuffer',
      },
    )

    const bytes = response.data
    if (!bytes) {
      throw new Error(`Google Drive returned empty content for file ${fileId}`)
    }

    return Buffer.from(bytes as ArrayBuffer)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Google Drive error'
    throw new Error(`Failed to download file from Google Drive: ${message}`)
  }
}