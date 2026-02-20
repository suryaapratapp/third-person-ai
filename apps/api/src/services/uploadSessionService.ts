import { prisma } from '../utils/prisma'

export type UploadSessionDto = {
  id: string
  status: string
  sourceApp: string
  createdAt: string
}

export type UploadedFileDto = {
  id: string
  uploadSessionId: string
  storagePath: string
  mime: string
  size: number
  createdAt: string
}

function toUploadSessionDto(value: {
  id: string
  status: string
  sourceApp: string
  createdAt: Date
}): UploadSessionDto {
  return {
    id: value.id,
    status: value.status,
    sourceApp: value.sourceApp,
    createdAt: value.createdAt.toISOString(),
  }
}

function toUploadedFileDto(value: {
  id: string
  uploadSessionId: string
  storagePath: string
  mime: string
  size: number
  createdAt: Date
}): UploadedFileDto {
  return {
    id: value.id,
    uploadSessionId: value.uploadSessionId,
    storagePath: value.storagePath,
    mime: value.mime,
    size: value.size,
    createdAt: value.createdAt.toISOString(),
  }
}

export async function createUploadSession(userId: string, sourceApp: string): Promise<UploadSessionDto> {
  const session = await prisma.uploadSession.create({
    data: {
      userId,
      sourceApp,
      status: 'READY',
    },
    select: {
      id: true,
      status: true,
      sourceApp: true,
      createdAt: true,
    },
  })

  return toUploadSessionDto(session)
}

export async function listUserUploadSessions(userId: string): Promise<UploadSessionDto[]> {
  const sessions = await prisma.uploadSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      sourceApp: true,
      createdAt: true,
    },
  })

  return sessions.map(toUploadSessionDto)
}

export async function getUserUploadSessionById(userId: string, id: string): Promise<UploadSessionDto | null> {
  const session = await prisma.uploadSession.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
      status: true,
      sourceApp: true,
      createdAt: true,
    },
  })

  if (!session) return null
  return toUploadSessionDto(session)
}

export async function createUploadedFileMetadata(params: {
  uploadSessionId: string
  storagePath: string
  mime: string
  size: number
}): Promise<UploadedFileDto> {
  const uploadedFile = await prisma.uploadedFile.create({
    data: {
      uploadSessionId: params.uploadSessionId,
      storagePath: params.storagePath,
      mime: params.mime,
      size: params.size,
    },
    select: {
      id: true,
      uploadSessionId: true,
      storagePath: true,
      mime: true,
      size: true,
      createdAt: true,
    },
  })

  return toUploadedFileDto(uploadedFile)
}

export async function getLatestUploadedFilePath(uploadSessionId: string): Promise<string | null> {
  const file = await prisma.uploadedFile.findFirst({
    where: { uploadSessionId },
    orderBy: { createdAt: 'desc' },
    select: { storagePath: true },
  })

  return file?.storagePath ?? null
}

export async function updateUploadSessionStatus(
  sessionId: string,
  status: string,
): Promise<UploadSessionDto> {
  const session = await prisma.uploadSession.update({
    where: { id: sessionId },
    data: { status },
    select: {
      id: true,
      status: true,
      sourceApp: true,
      createdAt: true,
    },
  })

  return toUploadSessionDto(session)
}
