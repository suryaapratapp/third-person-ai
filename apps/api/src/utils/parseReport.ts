import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from './env'

export async function readParseReport(params: {
  sessionId: string
  storagePath?: string | null
}): Promise<unknown | null> {
  if (params.storagePath?.startsWith('gdrive://')) {
    // New approach: parse report is not written to local fs for cloud uploads.
    return null
  }

  const filePath = params.storagePath
    ? path.resolve(path.dirname(params.storagePath), 'parse-report.json')
    : path.resolve(process.cwd(), env.uploadDir, params.sessionId, 'parse-report.json')

  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}
