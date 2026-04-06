import { z } from 'zod'

export const personEntityTypeSchema = z.enum([
  'Friend',
  'Partner',
  'Crush',
  'Family',
  'Cousin',
  'Sibling',
  'Colleague',
  'Other',
])

export const profileParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const createProfileBodySchema = z
  .object({
    personEntityId: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    type: personEntityTypeSchema.optional(),
    profileJSON: z.unknown(),     //can be more specific if we have a defined structure for the profile data
  })
  .superRefine((value, ctx) => {
    const hasEntityId = !!value.personEntityId
    const hasNameAndType = !!value.name && !!value.type

    if (!hasEntityId && !hasNameAndType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide personEntityId or both name and type.',
        path: [],
      })
    }
  })

export type ProfileParams = z.infer<typeof profileParamsSchema>
export type CreateProfileBody = z.infer<typeof createProfileBodySchema>
