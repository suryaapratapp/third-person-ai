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
    profileJSON: z.unknown(),
  })
  .superRefine((value, ctx) => {
    if (!value.personEntityId && (!value.name || !value.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['personEntityId'],
        message: 'Provide personEntityId or provide both name and type.',
      })
    }
  })

export type ProfileParams = z.infer<typeof profileParamsSchema>
export type CreateProfileBody = z.infer<typeof createProfileBodySchema>
