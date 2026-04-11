import type { MultipartFile } from '@fastify/multipart'
import { env } from './env'
import { uploadToGoogleDrive } from '../services/uploadToGoogleDrive'

const sourceAppAllowedExtensions: Record<string, string[]> = {
  whatsapp: ['txt'],
  imessage: ['csv', 'txt', 'json'],
  telegram: ['json', 'zip', 'html'],
  instagram: ['json', 'zip'],
  messenger: ['json', 'zip'],
  snapchat: ['json', 'zip'],
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].toLowerCase()
}

export function validateFileExtensionForSourceApp(sourceApp: string, filename: string): string | null {
  const normalizedSourceApp = sourceApp.toLowerCase()
  const allowed = sourceAppAllowedExtensions[normalizedSourceApp] ?? []

  if (!allowed.length) {
    return `File upload is not supported for ${normalizedSourceApp} yet`
  }

  const extension = getFileExtension(filename)
  if (!allowed.includes(extension)) {
    return `Unsupported file type .${extension || 'unknown'} for ${normalizedSourceApp}. Allowed: ${allowed.map((value) => `.${value}`).join(', ')}`
  }

  return null
}

function sanitizeFileName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildDriveStoragePath(fileId: string, fileName: string): string {
  return `gdrive://${fileId}/${sanitizeFileName(fileName)}`
}

async function readMultipartToBuffer(file: MultipartFile): Promise<{ buffer: Buffer; size: number }> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of file.file) {
    const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += next.length
    if (size > env.maxUploadFileSizeBytes) {
      throw new Error(`File exceeds max size of ${env.maxUploadFileSizeBytes} bytes`)
    }
    chunks.push(next)
  }

  return { buffer: Buffer.concat(chunks), size }
}

export async function saveMultipartFileToCloud(
  file: MultipartFile,
  uploadSessionId: string,
): Promise<{
  storagePath: string
  size: number
  storageProvider: string
  storageFileId: string
  storageFileUrl: string
  originalName: string
}> {
  const fileName = sanitizeFileName(file.filename || 'upload.bin')
  const uniqueName = `${uploadSessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${fileName}`
  const { buffer, size } = await readMultipartToBuffer(file)
  const uploaded = await uploadToGoogleDrive(buffer, uniqueName, file.mimetype || 'application/octet-stream')

  return {
    storagePath: buildDriveStoragePath(uploaded.fileId, fileName),
    size,
    storageProvider: 'google_drive',
    storageFileId: uploaded.fileId,
    storageFileUrl: uploaded.url,
    originalName: fileName,
  }
}

export async function savePastedTextToCloud(
  text: string,
  uploadSessionId: string,
): Promise<{
  storagePath: string
  size: number
  storageProvider: string
  storageFileId: string
  storageFileUrl: string
  originalName: string
}> {
  const content = Buffer.from(text, 'utf-8')
  const size = content.length
  if (size > env.maxUploadFileSizeBytes) {
    throw new Error(`Text exceeds max size of ${env.maxUploadFileSizeBytes} bytes`)
  }

  const fileName = `paste-${uploadSessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.txt`
  const uploaded = await uploadToGoogleDrive(content, fileName, 'text/plain')

  return {
    storagePath: buildDriveStoragePath(uploaded.fileId, fileName),
    size,
    storageProvider: 'google_drive',
    storageFileId: uploaded.fileId,
    storageFileUrl: uploaded.url,
    originalName: fileName,
  }
}

// OLD APPROACH: local disk upload for single-host deployments.
export async function saveMultipartFileLocally(
  file: MultipartFile,
  uploadSessionId: string,
): Promise<{
  storagePath: string
  size: number
  storageProvider: string
  storageFileId: string
  storageFileUrl: string
  originalName: string
}> {
  return saveMultipartFileToCloud(file, uploadSessionId)
}

// OLD APPROACH: local disk paste storage for single-host deployments.
export async function savePastedTextLocally(
  text: string,
  uploadSessionId: string,
): Promise<{
  storagePath: string
  size: number
  storageProvider: string
  storageFileId: string
  storageFileUrl: string
  originalName: string
}> {
  return savePastedTextToCloud(text, uploadSessionId)
}

