import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { MultipartFile } from '@fastify/multipart'
import { env } from './env'

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

export async function saveMultipartFileLocally(
  file: MultipartFile,
  uploadSessionId: string,
): Promise<{ storagePath: string; size: number }> {
  const fileName = sanitizeFileName(file.filename || 'upload.bin')
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${fileName}`
  const sessionDir = path.resolve(process.cwd(), env.uploadDir, uploadSessionId)
  const targetPath = path.resolve(sessionDir, uniqueName)

  await mkdir(sessionDir, { recursive: true })

  let size = 0
  file.file.on('data', (chunk: Buffer) => {
    size += chunk.length
  })

  await pipeline(file.file, createWriteStream(targetPath))

  if (size > env.maxUploadFileSizeBytes) {
    throw new Error(`File exceeds max size of ${env.maxUploadFileSizeBytes} bytes`)
  }

  return {
    storagePath: targetPath,
    size,
  }
}

export async function savePastedTextLocally(
  text: string,
  uploadSessionId: string,
): Promise<{ storagePath: string; size: number }> {
  const fileName = `paste-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.txt`
  const sessionDir = path.resolve(process.cwd(), env.uploadDir, uploadSessionId)
  const targetPath = path.resolve(sessionDir, fileName)

  await mkdir(sessionDir, { recursive: true })

  const content = Buffer.from(text, 'utf-8')
  const size = content.length
  if (size > env.maxUploadFileSizeBytes) {
    throw new Error(`Text exceeds max size of ${env.maxUploadFileSizeBytes} bytes`)
  }

  const stream = createWriteStream(targetPath)
  stream.write(content)
  stream.end()

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })

  return {
    storagePath: targetPath,
    size,
  }
}
