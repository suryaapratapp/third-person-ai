import { prisma } from '../utils/prisma'
import { hashPassword } from '../utils/password'
import type {
  AdminSessionListQuery,
  AdminSessionUpdateBody,
  AdminUserCreateBody,
  AdminUserUpdateBody,
  AdminUsersQuery,
} from '../schemas/adminSchemas'

type PaginationResult<T> = {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function toTotalPages(total: number, pageSize: number): number {
  if (total <= 0) return 0
  return Math.ceil(total / pageSize)
}

function toPublicUser(user: {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  dob: Date | null
  emailVerified: boolean
  phoneVerified: boolean
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    dob: user.dob ? user.dob.toISOString() : null,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt.toISOString(),
  }
}

export async function listAdminUsers(query: AdminUsersQuery): Promise<PaginationResult<ReturnType<typeof toPublicUser>>> {
  const page = query.page
  const pageSize = query.pageSize
  const skip = (page - 1) * pageSize
  const search = query.search?.trim()

  const where = search
    ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ],
    }
    : undefined

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dob: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    }),
  ])

  return {
    items: users.map(toPublicUser),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: toTotalPages(total, pageSize),
    },
  }
}

export async function createAdminUser(body: AdminUserCreateBody) {
  const hashedPassword = body.password ? await hashPassword(body.password) : null

  const created = await prisma.user.create({
    data: {
      email: body.email.trim().toLowerCase(),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: body.phone ? body.phone.trim() : null,
      dob: body.dob ? new Date(body.dob) : null,
      hashedPassword,
      emailVerified: body.emailVerified ?? false,
      phoneVerified: body.phoneVerified ?? false,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dob: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
    },
  })

  return toPublicUser(created)
}

export async function updateAdminUser(id: string, body: AdminUserUpdateBody) {
  const patch: {
    email?: string
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    dob?: Date | null
    hashedPassword?: string | null
    emailVerified?: boolean
    phoneVerified?: boolean
  } = {}

  if (body.email !== undefined) patch.email = body.email.trim().toLowerCase()
  if (body.firstName !== undefined) patch.firstName = body.firstName ? body.firstName.trim() : null
  if (body.lastName !== undefined) patch.lastName = body.lastName ? body.lastName.trim() : null
  if (body.phone !== undefined) patch.phone = body.phone ? body.phone.trim() : null
  if (body.dob !== undefined) patch.dob = body.dob ? new Date(body.dob) : null
  if (body.password !== undefined) {
    patch.hashedPassword = body.password ? await hashPassword(body.password) : null
  }
  if (body.emailVerified !== undefined) patch.emailVerified = body.emailVerified
  if (body.phoneVerified !== undefined) patch.phoneVerified = body.phoneVerified

  const updated = await prisma.user.update({
    where: { id },
    data: patch,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dob: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
    },
  })

  return toPublicUser(updated)
}

export async function deleteAdminUser(id: string) {
  await prisma.user.delete({ where: { id } })
}

export async function listAdminUploadSessions(query: AdminSessionListQuery): Promise<
  PaginationResult<{
    id: string
    userId: string
    userEmail: string
    sourceApp: string
    status: string
    messageCount: number
    fileCount: number
    createdAt: string
  }>
> {
  const page = query.page
  const pageSize = query.pageSize
  const skip = (page - 1) * pageSize
  const search = query.search?.trim()
  const status = query.status?.trim()

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
        OR: [
          { sourceApp: { contains: search, mode: 'insensitive' as const } },
          { user: { email: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
      : {}),
  }

  const [total, sessions] = await Promise.all([
    prisma.uploadSession.count({ where }),
    prisma.uploadSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        sourceApp: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
        messages: {
          select: {
            id: true,
          },
        },
        uploadedFiles: {
          select: {
            id: true,
          },
        },
      },
    }),
  ])

  return {
    items: sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      userEmail: session.user.email,
      sourceApp: session.sourceApp,
      status: session.status,
      messageCount: session.messages.length,
      fileCount: session.uploadedFiles.length,
      createdAt: session.createdAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: toTotalPages(total, pageSize),
    },
  }
}

export async function updateAdminUploadSession(id: string, body: AdminSessionUpdateBody) {
  const updated = await prisma.uploadSession.update({
    where: { id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.sourceApp !== undefined ? { sourceApp: body.sourceApp } : {}),
    },
    select: {
      id: true,
      userId: true,
      sourceApp: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          email: true,
        },
      },
      messages: {
        select: {
          id: true,
        },
      },
      uploadedFiles: {
        select: {
          id: true,
        },
      },
    },
  })

  return {
    id: updated.id,
    userId: updated.userId,
    userEmail: updated.user.email,
    sourceApp: updated.sourceApp,
    status: updated.status,
    messageCount: updated.messages.length,
    fileCount: updated.uploadedFiles.length,
    createdAt: updated.createdAt.toISOString(),
  }
}

export async function deleteAdminUploadSession(id: string) {
  await prisma.uploadSession.delete({ where: { id } })
}
