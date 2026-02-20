import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from './env'

export type AccessTokenPayload = {
  sub: string
  email: string
  type: 'access'
}

export type RefreshTokenPayload = {
  sub: string
  email: string
  type: 'refresh'
}

function toExpiresIn(value: string): SignOptions['expiresIn'] {
  return value as SignOptions['expiresIn']
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: toExpiresIn(env.accessTokenTtl),
  })
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: toExpiresIn(env.refreshTokenTtl),
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload
    if (decoded.type !== 'access') return null
    return decoded
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload
    if (decoded.type !== 'refresh') return null
    return decoded
  } catch {
    return null
  }
}
