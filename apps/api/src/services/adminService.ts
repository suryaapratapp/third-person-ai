import { prisma } from '../utils/prisma'
import { hashPassword } from '../utils/password'
import { Prisma } from '@prisma/client'
import type {
  AdminSessionListQuery,
  AdminSessionUpdateBody,
  AdminUserCreateBody,
  AdminUserUpdateBody,
  AdminUsersQuery,
} from '../schemas/adminSchemas'
import { NotFoundError } from '../errors/NotFoundError'
import { ConflictError } from '../errors/ConflictError'
import { ValidationError } from '../errors/ValidationError'

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
  const page = Math.min(Math.max(query.page, 1), 1000)
  const pageSize = Math.min(query.pageSize, 100) 
  const skip = (page - 1) * pageSize
  const search = query.search?.trim()   //can switch to cursor based pagination

  // return all users
  const where: Prisma.UserWhereInput = {}

  //filter by search term if provided
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' as const } },
      { firstName: { contains: search, mode: 'insensitive' as const } },
      { lastName: { contains: search, mode: 'insensitive' as const } },
    ]
  }
 
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
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


//create user
export async function createAdminUser(body: AdminUserCreateBody) {
  const hashedPassword = body.password ? await hashPassword(body.password) : null

  //validating dob
   if (body.dob !== undefined){

     if (body.dob === null) {
         throw new ValidationError('Date of birth cannot be null')
    }

   const parsed = new Date(body.dob)
    if (isNaN(parsed.getTime())) {
      throw new ValidationError('Invalid date of birth')
    }
    
  }

 
  const created = await prisma.user.create({
    data: {
      email: body.email.trim().toLowerCase(),
      firstName: body.firstName.trim(),
      lastName: body.lastName?body.lastName.trim():null,
      phone: body.phone ? body.phone.trim() : null,
      dob: body.dob ? new Date(body.dob): null,
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
    firstName?: string
    lastName?: string | null
    phone?: string | null
    dob?: Date 
    hashedPassword?: string 
    emailVerified?: boolean
    phoneVerified?: boolean
  } = {}


  //check if user exists
  const user = await prisma.user.findUnique({ where: { id } })
  //validate user existence
  if (!user) {
    throw new NotFoundError('User not found')
  }

  // validate and prepare fields for update
  if (body.email !== undefined){
    
    const email = body.email.trim().toLowerCase()

    //email already in use by another account validation
    if(email!==user.email){
        const existing = await prisma.user.findUnique({ where: { email } })
          if (existing && existing.id !== id) {
          throw new ConflictError('Email already in use')
          }
          patch.email = email
    }
  }
    
  if (body.firstName !== undefined){
      
    if(patch.firstName === ''){
      throw new ValidationError('First name cannot be empty')
    }
      patch.firstName = body.firstName.trim()
  }
  if (body.lastName !== undefined) patch.lastName = body.lastName ? body.lastName.trim() : null
  if (body.phone !== undefined) patch.phone = body.phone ? body.phone.trim() : null
  if (body.dob !== undefined){

     if (body.dob === null) {
         throw new ValidationError('Date of birth cannot be null')
    }

   const date = new Date(body.dob)
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date of birth')
    }
    patch.dob = date

  }
  if (body.password !== undefined) {
     if (!body.password) {
      throw new ValidationError('Password cannot be empty')
    }
    patch.hashedPassword = await hashPassword(body.password)
  }
  if (body.emailVerified !== undefined) patch.emailVerified = body.emailVerified
  if (body.phoneVerified !== undefined) patch.phoneVerified = body.phoneVerified

  if(Object.keys(patch).length === 0){
    throw new ValidationError('At least one field must be provided for update')
  }

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
  const user = await prisma.user.findUnique({
    where: { id },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // if (user.role === 'SUPER_ADMIN') {   // can add role field in user model if needed for this validation
  //   throw new ForbiddenError('Cannot delete super admin')
  // }

  await prisma.user.delete({
    where: { id },
  })

  return { success: true }
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
  const page = Math.min(Math.max(query.page, 1), 1000)
  const pageSize = Math.min(Math.max(query.pageSize, 1), 100)
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
      orderBy:[
         { createdAt: 'desc' },
          { id: 'desc' },
      ],
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
      userEmail: session.user?.email ?? '',
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

  if (body.status === undefined && body.sourceApp === undefined) {
      throw new ValidationError('No fields provided for update')
  }

 
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
        select:{ 
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
    userEmail: updated.user?.email ?? '',
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
