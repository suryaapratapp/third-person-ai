import { z } from 'zod'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const adminUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
})

export const adminUserCreateBodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().nullable().optional(),
  dob: z.string().datetime().or(z.string().date()).nullable().optional(),
  password: z.string().min(8).nullable().optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
})

export const adminUserUpdateBodySchema = z
  .object({
    email: z.string().email().optional(),
    firstName: z.string().trim().min(1).nullable().optional(),
    lastName: z.string().trim().min(1).nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    dob: z.string().datetime().or(z.string().date()).nullable().optional(),
    password: z.string().min(8).nullable().optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export const adminSessionListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
})

export const adminSessionUpdateBodySchema = z
  .object({
    sourceApp: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export const adminIdParamsSchema = z.object({
  id: z.string().min(1),
})

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>
export type AdminUserCreateBody = z.infer<typeof adminUserCreateBodySchema>
export type AdminUserUpdateBody = z.infer<typeof adminUserUpdateBodySchema>
export type AdminSessionListQuery = z.infer<typeof adminSessionListQuerySchema>
export type AdminSessionUpdateBody = z.infer<typeof adminSessionUpdateBodySchema>
export type AdminIdParams = z.infer<typeof adminIdParamsSchema>
