import { Prisma, type PersonEntityType } from '@prisma/client'
import { prisma } from '../utils/prisma'

export type PersonEntityDto = {
  id: string
  userId: string
  name: string
  type: PersonEntityType
  createdAt: string
}

export type PersonalityProfileDto = {
  id: string
  userId: string
  personEntityId: string
  profileJSON: unknown
  createdAt: string
  personEntity: PersonEntityDto
}

function toPersonEntityDto(value: {
  id: string
  userId: string
  name: string
  type: PersonEntityType
  createdAt: Date
}): PersonEntityDto {
  return {
    id: value.id,
    userId: value.userId,
    name: value.name,
    type: value.type,
    createdAt: value.createdAt.toISOString(),
  }
}

function toProfileDto(value: {
  id: string
  userId: string
  personEntityId: string
  profileJSON: unknown
  createdAt: Date
  personEntity: {
    id: string
    userId: string
    name: string
    type: PersonEntityType
    createdAt: Date
  }
}): PersonalityProfileDto {
  return {
    id: value.id,
    userId: value.userId,
    personEntityId: value.personEntityId,
    profileJSON: value.profileJSON,
    createdAt: value.createdAt.toISOString(),
    personEntity: toPersonEntityDto(value.personEntity),
  }
}

async function getOwnedPersonEntity(userId: string, personEntityId: string) {
  return prisma.personEntity.findFirst({
    where: { id: personEntityId, userId },
    select: {
      id: true,
      userId: true,
      name: true,
      type: true,
      createdAt: true,
    },
  })
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {}
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function createProfileForUser(params: {
  userId: string
  personEntityId?: string
  name?: string
  type?: PersonEntityType
  profileJSON: unknown
}): Promise<PersonalityProfileDto | null> {
  let personEntityId = params.personEntityId

  if (personEntityId) {
    const existing = await getOwnedPersonEntity(params.userId, personEntityId)
    if (!existing) return null
  } else {
    if (!params.name || !params.type) return null
    const createdEntity = await prisma.personEntity.create({
      data: {
        userId: params.userId,
        name: params.name,
        type: params.type,
      },
      select: {
        id: true,
      },
    })
    personEntityId = createdEntity.id
  }

  const created = await prisma.personalityProfile.create({
    data: {
      userId: params.userId,
      personEntityId,
      profileJSON: toInputJsonValue(params.profileJSON),
    },
    select: {
      id: true,
    },
  })

  const profile = await prisma.personalityProfile.findUnique({
    where: {
      id: created.id,
    },
    select: {
      id: true,
      userId: true,
      personEntityId: true,
      profileJSON: true,
      createdAt: true,
      personEntity: {
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          createdAt: true,
        },
      },
    },
  })

  if (!profile) return null
  return toProfileDto(profile)
}

export async function listProfilesForUser(userId: string): Promise<PersonalityProfileDto[]> {
  const profiles = await prisma.personalityProfile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      personEntityId: true,
      profileJSON: true,
      createdAt: true,
      personEntity: {
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          createdAt: true,
        },
      },
    },
  })

  return profiles.map(toProfileDto)
}

export async function getProfileForUser(
  userId: string,
  profileId: string,
): Promise<PersonalityProfileDto | null> {
  const profile = await prisma.personalityProfile.findFirst({
    where: {
      id: profileId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      personEntityId: true,
      profileJSON: true,
      createdAt: true,
      personEntity: {
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          createdAt: true,
        },
      },
    },
  })

  if (!profile) return null
  return toProfileDto(profile)
}
