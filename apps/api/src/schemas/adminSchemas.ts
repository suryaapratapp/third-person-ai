import { z } from 'zod'
import { UPLOAD_SESSION_STATUS } from 'third-person-ai/shared/statuses.js'


const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const adminUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
}).strict()

export const adminUserCreateBodySchema = z.object({
  email: z.string().trim().email().transform(val => val.toLowerCase()),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1).nullable().optional(),
  phone: z.string().trim() .min(1).transform(val => val.replace(/\s+/g, ''))
  .refine(val => /^\+?[1-9]\d{1,14}$/.test(val), {
    message: "Invalid phone number format",
  }).optional(),
  dob: z.string().datetime().or(z.string().date()).nullable().optional(),
  password: z.string().min(8).optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
  oauthProvider: z.enum(['google']).optional(),

})
.refine(data => {
  const hasPassword = !!data.password
  const hasOAuth = !!data.oauthProvider
  return hasPassword !== hasOAuth
}, {
  message: "Provide either password OR OAuth, not both"
})

export const adminUserUpdateBodySchema = z
  .object({
    email: z.string().trim().email().transform(val => val.toLowerCase()).optional(),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).nullable().optional(),
    phone: z.string().trim() .min(1).transform(val => val.replace(/\s+/g, ''))
    .refine(val => /^\+?[1-9]\d{1,14}$/.test(val), {
    message: "Invalid phone number format",
      }).optional(),  
    dob: z.string().datetime().or(z.string().date()).nullable().optional(),
    password: z.string().min(8).optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
  

export const adminSessionListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.string().trim().min(1).optional(),
})
  .strict()

export const adminSessionUpdateBodySchema = z
  .object({
    sourceApp: z.string().trim().min(1).transform(val => val.toLowerCase()).optional(),
    status: z.enum(Object.values(UPLOAD_SESSION_STATUS) as [string, ...string[]]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
  .strict()

export const adminIdParamsSchema = z.object({
  id: z.string().min(1),
})
.strict()

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>
export type AdminUserCreateBody = z.infer<typeof adminUserCreateBodySchema>
export type AdminUserUpdateBody = z.infer<typeof adminUserUpdateBodySchema>
export type AdminSessionListQuery = z.infer<typeof adminSessionListQuerySchema>
export type AdminSessionUpdateBody = z.infer<typeof adminSessionUpdateBodySchema>
export type AdminIdParams = z.infer<typeof adminIdParamsSchema>
