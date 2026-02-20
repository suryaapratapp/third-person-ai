import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import {
  createUploadSessionBodySchema,
  uploadSessionPasteBodySchema,
  uploadSessionParamsSchema,
} from '../schemas/uploadSessionSchemas'
import {
  createUploadSession,
  createUploadedFileMetadata,
  getLatestUploadedFilePath,
  getUserUploadSessionById,
  listUserUploadSessions,
  updateUploadSessionStatus,
} from '../services/uploadSessionService'
import { enqueueParseExportJob } from '../services/queueService'
import {
  savePastedTextLocally,
  saveMultipartFileLocally,
  validateFileExtensionForSourceApp,
} from '../utils/fileUpload'
import { readParseReport } from '../utils/parseReport'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

export async function createUploadSessionController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedBody = createUploadSessionBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: formatZodError(parsedBody.error),
    })
  }

  const session = await createUploadSession(
    request.authUserId,
    parsedBody.data.sourceApp,
  )

  return reply.status(201).send({ session })
}

export async function listUploadSessionsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const sessions = await listUserUploadSessions(request.authUserId)
  return reply.status(200).send({ sessions })
}

export async function getUploadSessionController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = uploadSessionParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const session = await getUserUploadSessionById(
    request.authUserId,
    parsedParams.data.id,
  )

  if (!session) {
    return reply.status(404).send({ error: 'Upload session not found' })
  }

  const latestStoragePath = await getLatestUploadedFilePath(session.id)
  const parseReport = await readParseReport({ sessionId: session.id, storagePath: latestStoragePath })

  if (session.status === 'FAILED' && parseReport && typeof parseReport === 'object') {
    const payload = parseReport as Record<string, unknown>
    if (payload.error === 'ParseFailed') {
      return reply.status(422).send(payload)
    }
  }

  return reply.status(200).send({ session, parseReport })
}

export async function uploadSessionFileController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = uploadSessionParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const session = await getUserUploadSessionById(
    request.authUserId,
    parsedParams.data.id,
  )

  if (!session) {
    return reply.status(404).send({ error: 'Upload session not found' })
  }

  const uploadedPart = await request.file()
  if (!uploadedPart) {
    return reply.status(400).send({ error: 'No file uploaded' })
  }

  const extensionError = validateFileExtensionForSourceApp(
    session.sourceApp,
    uploadedPart.filename,
  )

  if (extensionError) {
    return reply.status(400).send({ error: extensionError })
  }

  try {
    const saved = await saveMultipartFileLocally(uploadedPart, session.id)

    const uploadedFile = await createUploadedFileMetadata({
      uploadSessionId: session.id,
      storagePath: saved.storagePath,
      mime: uploadedPart.mimetype,
      size: saved.size,
    })

    await updateUploadSessionStatus(session.id, 'QUEUED')
    await enqueueParseExportJob(session.id)

    return reply.status(201).send({
      file: {
        id: uploadedFile.id,
        uploadSessionId: uploadedFile.uploadSessionId,
        storagePath: uploadedFile.storagePath,
        mime: uploadedFile.mime,
        size: uploadedFile.size,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload file'
    return reply.status(400).send({ error: message })
  }
}

function buildPastePreflight(text: string): {
  status: 'success' | 'parsing_failure'
  message: string
  stats: {
    charCount: number
    lineCount: number
    estimatedMessageCount: number
  }
  warnings: string[]
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const estimatedMessageCount = lines.filter((line) => line.includes(':')).length
  const warnings: string[] = []

  if (estimatedMessageCount === 0) {
    warnings.push('No clear "sender: message" patterns detected.')
  }

  if (lines.length < 3) {
    warnings.push('Very short input may not produce reliable analysis.')
  }

  const hasEnoughContent = lines.length > 0 && text.trim().length >= 20
  return {
    status: hasEnoughContent ? 'success' : 'parsing_failure',
    message: hasEnoughContent
      ? 'Paste accepted and preflight checks complete.'
      : 'Parsing failure: provide more chat text content.',
    stats: {
      charCount: text.length,
      lineCount: lines.length,
      estimatedMessageCount,
    },
    warnings,
  }
}

export async function pasteUploadSessionController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = uploadSessionParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const parsedBody = uploadSessionPasteBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: formatZodError(parsedBody.error),
    })
  }

  const session = await getUserUploadSessionById(
    request.authUserId,
    parsedParams.data.id,
  )

  if (!session) {
    return reply.status(404).send({ error: 'Upload session not found' })
  }

  const preflight = buildPastePreflight(parsedBody.data.text)

  try {
    const saved = await savePastedTextLocally(parsedBody.data.text, session.id)
    const uploadedFile = await createUploadedFileMetadata({
      uploadSessionId: session.id,
      storagePath: saved.storagePath,
      mime: 'text/plain',
      size: saved.size,
    })

    await updateUploadSessionStatus(session.id, 'QUEUED')
    await enqueueParseExportJob(session.id)

    const responseCode = preflight.status === 'success' ? 201 : 200
    return reply.status(responseCode).send({
      status: preflight.status,
      message: preflight.message,
      preflight: preflight.stats,
      warnings: preflight.warnings,
      record: {
        id: uploadedFile.id,
        uploadSessionId: uploadedFile.uploadSessionId,
        storagePath: uploadedFile.storagePath,
        mime: uploadedFile.mime,
        size: uploadedFile.size,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store pasted chat'
    return reply.status(400).send({ error: message })
  }
}
