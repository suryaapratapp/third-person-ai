import { z } from 'zod'

export const PersonaEnum = z.enum(['coach', 'bestie'])
export const ToneEnum = z.enum(['gentle', 'balanced', 'direct'])

