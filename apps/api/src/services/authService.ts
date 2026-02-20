import { VerificationChannel, VerificationPurpose } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { hashPassword, comparePassword } from '../utils/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { env } from '../utils/env'

type PublicUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  dob: string | null
  emailVerified: boolean
  phoneVerified: boolean
  createdAt: string
}

type AuthResult = {
  user: PublicUser
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

type RegisterInput = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string | null
  dob?: string | null
}

type VerificationSummary = {
  emailVerified: boolean
  phoneVerified: boolean
  phoneRequired: boolean
  emailOtpExpiresAt: string | null
  phoneOtpExpiresAt: string | null
}

type RegisterStartResult = {
  user: PublicUser
  verification: VerificationSummary
  demoOtp?: {
    emailOtp?: string
    phoneOtp?: string
  }
}

type ResendOtpResult = {
  success: true
  channel: 'email' | 'phone'
  expiresAt: string
  demoOtp?: string
}

type VerificationStatusResult = {
  user: PublicUser
  verification: VerificationSummary
}

type ForgotPasswordResult = {
  success: true
  message: string
  expiresAt?: string
  demoOtp?: string
}

const OTP_EXPIRY_MINUTES = 10
const isDemoAuthMode = env.analysisMode === 'mock'

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function sanitizeName(value: string): string {
  return value.trim()
}

function sanitizePhone(value: string): string {
  return value.replace(/[\s()-]/g, '')
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'Password must be at least 8 characters long'
  if (!/[A-Z]/.test(password)) return 'Password must include at least 1 uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must include at least 1 lowercase letter'
  if (!/\d/.test(password)) return 'Password must include at least 1 number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least 1 special character'
  return null
}

function validatePhone(phone: string): boolean {
  return /^\+[0-9]{7,15}$/.test(phone)
}

function parseDob(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date of birth')
  }
  return parsed
}

function issueTokens(user: { id: string; email: string }) {
  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email }),
    refreshToken: signRefreshToken({ sub: user.id, email: user.email }),
  }
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
}): PublicUser {
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

function generateOtp(): string {
  if (isDemoAuthMode) return '123456'
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function createVerificationCode(params: {
  userId: string
  purpose: VerificationPurpose
  channel: VerificationChannel
}): Promise<{ otp: string; expiresAt: Date }> {
  const otp = generateOtp()
  const codeHash = await hashPassword(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000)

  await prisma.verificationCode.updateMany({
    where: {
      userId: params.userId,
      purpose: params.purpose,
      channel: params.channel,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  })

  await prisma.verificationCode.create({
    data: {
      userId: params.userId,
      purpose: params.purpose,
      channel: params.channel,
      codeHash,
      expiresAt,
    },
  })

  if (isDemoAuthMode) {
    // eslint-disable-next-line no-console
    console.info(`[demo-auth] ${params.purpose} ${params.channel} OTP for ${params.userId}: ${otp}`)
  }

  return { otp, expiresAt }
}

async function getActiveVerificationCode(params: {
  userId: string
  purpose: VerificationPurpose
  channel: VerificationChannel
}) {
  return prisma.verificationCode.findFirst({
    where: {
      userId: params.userId,
      purpose: params.purpose,
      channel: params.channel,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

async function verifyCode(params: {
  userId: string
  purpose: VerificationPurpose
  channel: VerificationChannel
  otp: string
}): Promise<boolean> {
  const code = await getActiveVerificationCode({
    userId: params.userId,
    purpose: params.purpose,
    channel: params.channel,
  })

  if (!code) return false

  const matched = isDemoAuthMode
    ? params.otp === '123456' || (await comparePassword(params.otp, code.codeHash))
    : await comparePassword(params.otp, code.codeHash)

  if (!matched) return false

  await prisma.verificationCode.update({
    where: { id: code.id },
    data: {
      consumedAt: new Date(),
    },
  })

  return true
}

async function getVerificationSummary(userId: string): Promise<VerificationSummary> {
  const [user, emailCode, phoneCode] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        phoneVerified: true,
        phone: true,
      },
    }),
    getActiveVerificationCode({
      userId,
      purpose: VerificationPurpose.REGISTER,
      channel: VerificationChannel.EMAIL,
    }),
    getActiveVerificationCode({
      userId,
      purpose: VerificationPurpose.REGISTER,
      channel: VerificationChannel.PHONE,
    }),
  ])

  return {
    emailVerified: Boolean(user?.emailVerified),
    phoneVerified: Boolean(user?.phoneVerified),
    phoneRequired: Boolean(user?.phone),
    emailOtpExpiresAt: emailCode?.expiresAt?.toISOString() || null,
    phoneOtpExpiresAt: phoneCode?.expiresAt?.toISOString() || null,
  }
}

export async function registerWithEmail(input: RegisterInput): Promise<RegisterStartResult> {
  const email = sanitizeEmail(input.email)
  const firstName = sanitizeName(input.firstName)
  const lastName = sanitizeName(input.lastName)
  const phone = input.phone ? sanitizePhone(input.phone) : null
  const dob = parseDob(input.dob)

  if (!firstName) {
    throw new Error('First name is required')
  }

  if (!lastName) {
    throw new Error('Last name is required')
  }

  if (!validateEmail(email)) {
    throw new Error('Invalid email format')
  }

  const passwordError = validatePassword(input.password)
  if (passwordError) {
    throw new Error(passwordError)
  }

  if (phone && !validatePhone(phone)) {
    throw new Error('Phone must include country code and digits only')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  const hashedPassword = await hashPassword(input.password)

  if (existing?.emailVerified) {
    throw new Error('Email is already registered')
  }

  const user = existing
    ? await prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName,
        lastName,
        phone,
        dob,
        hashedPassword,
        phoneVerified: phone ? existing.phone === phone && existing.phoneVerified : false,
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
    : await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        dob,
        hashedPassword,
        emailVerified: false,
        phoneVerified: false,
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

  const emailOtp = await createVerificationCode({
    userId: user.id,
    purpose: VerificationPurpose.REGISTER,
    channel: VerificationChannel.EMAIL,
  })

  let phoneOtp: { otp: string; expiresAt: Date } | null = null
  if (user.phone) {
    phoneOtp = await createVerificationCode({
      userId: user.id,
      purpose: VerificationPurpose.REGISTER,
      channel: VerificationChannel.PHONE,
    })
  }

  return {
    user: toPublicUser(user),
    verification: {
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      phoneRequired: Boolean(user.phone),
      emailOtpExpiresAt: emailOtp.expiresAt.toISOString(),
      phoneOtpExpiresAt: phoneOtp?.expiresAt.toISOString() || null,
    },
    demoOtp: isDemoAuthMode
      ? {
        emailOtp: emailOtp.otp,
        phoneOtp: phoneOtp?.otp,
      }
      : undefined,
  }
}

export async function getVerificationStatus(emailInput: string): Promise<VerificationStatusResult> {
  const email = sanitizeEmail(emailInput)
  const user = await prisma.user.findUnique({
    where: { email },
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

  if (!user) {
    throw new Error('User not found')
  }

  return {
    user: toPublicUser(user),
    verification: await getVerificationSummary(user.id),
  }
}

export async function verifyRegistrationOtp(params: {
  email: string
  channel: 'email' | 'phone'
  otp: string
}): Promise<VerificationStatusResult> {
  const email = sanitizeEmail(params.email)
  const user = await prisma.user.findUnique({
    where: { email },
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

  if (!user) {
    throw new Error('User not found')
  }

  const channel = params.channel === 'phone' ? VerificationChannel.PHONE : VerificationChannel.EMAIL
  if (channel === VerificationChannel.PHONE && !user.phone) {
    throw new Error('Phone number not provided')
  }

  const ok = await verifyCode({
    userId: user.id,
    purpose: VerificationPurpose.REGISTER,
    channel,
    otp: params.otp.trim(),
  })

  if (!ok) {
    throw new Error('Invalid or expired OTP')
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: channel === VerificationChannel.EMAIL ? { emailVerified: true } : { phoneVerified: true },
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

  return {
    user: toPublicUser(updated),
    verification: await getVerificationSummary(updated.id),
  }
}

export async function resendRegistrationOtp(params: {
  email: string
  channel: 'email' | 'phone'
}): Promise<ResendOtpResult> {
  const email = sanitizeEmail(params.email)
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      phone: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (params.channel === 'phone' && !user.phone) {
    throw new Error('Phone number not provided')
  }

  const channel = params.channel === 'phone' ? VerificationChannel.PHONE : VerificationChannel.EMAIL
  const otp = await createVerificationCode({
    userId: user.id,
    purpose: VerificationPurpose.REGISTER,
    channel,
  })

  return {
    success: true,
    channel: params.channel,
    expiresAt: otp.expiresAt.toISOString(),
    demoOtp: isDemoAuthMode ? otp.otp : undefined,
  }
}

export async function completeRegistration(emailInput: string): Promise<AuthResult> {
  const email = sanitizeEmail(emailInput)
  const user = await prisma.user.findUnique({
    where: { email },
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
      refreshTokenHash: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (!user.emailVerified) {
    throw new Error('Email verification is required')
  }

  const tokens = issueTokens(user)
  const refreshTokenHash = await hashPassword(tokens.refreshToken)

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  })

  return {
    user: toPublicUser(user),
    tokens,
  }
}

export async function loginWithEmail(emailInput: string, password: string): Promise<AuthResult> {
  const email = sanitizeEmail(emailInput)

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dob: true,
      emailVerified: true,
      phoneVerified: true,
      hashedPassword: true,
      createdAt: true,
    },
  })

  if (!user || !user.hashedPassword) {
    throw new Error('Invalid email or password')
  }

  if (!user.emailVerified) {
    throw new Error('Email not verified. Complete verification first.')
  }

  const isPasswordValid = await comparePassword(password, user.hashedPassword)
  if (!isPasswordValid) {
    throw new Error('Invalid email or password')
  }

  const tokens = issueTokens(user)
  const refreshTokenHash = await hashPassword(tokens.refreshToken)

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  })

  return {
    user: toPublicUser(user),
    tokens,
  }
}

export async function logoutUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshTokenHash: null,
    },
  })
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const payload = verifyRefreshToken(refreshToken)
  if (!payload) {
    throw new Error('Invalid refresh token')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
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
      refreshTokenHash: true,
    },
  })

  if (!user?.refreshTokenHash) {
    throw new Error('Refresh token not found')
  }

  const valid = await comparePassword(refreshToken, user.refreshTokenHash)
  if (!valid) {
    throw new Error('Invalid refresh token')
  }

  const tokens = issueTokens(user)
  const refreshTokenHash = await hashPassword(tokens.refreshToken)

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  })

  return {
    user: toPublicUser(user),
    tokens,
  }
}

export async function getCurrentUser(userId: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) return null
  return toPublicUser(user)
}

export async function forgotPassword(emailInput: string): Promise<ForgotPasswordResult> {
  const email = sanitizeEmail(emailInput)
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
    },
  })

  if (!user) {
    return {
      success: true,
      message: 'If an account exists for this email, a reset code has been sent.',
    }
  }

  const otp = await createVerificationCode({
    userId: user.id,
    purpose: VerificationPurpose.PASSWORD_RESET,
    channel: VerificationChannel.EMAIL,
  })

  return {
    success: true,
    message: 'If an account exists for this email, a reset code has been sent.',
    expiresAt: otp.expiresAt.toISOString(),
    demoOtp: isDemoAuthMode ? otp.otp : undefined,
  }
}

export async function resetPassword(params: {
  email: string
  otp: string
  newPassword: string
}): Promise<AuthResult> {
  const email = sanitizeEmail(params.email)
  const user = await prisma.user.findUnique({
    where: { email },
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

  if (!user) {
    throw new Error('Invalid reset request')
  }

  const passwordError = validatePassword(params.newPassword)
  if (passwordError) {
    throw new Error(passwordError)
  }

  const ok = await verifyCode({
    userId: user.id,
    purpose: VerificationPurpose.PASSWORD_RESET,
    channel: VerificationChannel.EMAIL,
    otp: params.otp.trim(),
  })

  if (!ok) {
    throw new Error('Invalid or expired reset code')
  }

  const hashedPassword = await hashPassword(params.newPassword)
  const tokens = issueTokens(user)
  const refreshTokenHash = await hashPassword(tokens.refreshToken)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
      refreshTokenHash,
      emailVerified: true,
    },
  })

  return {
    user: toPublicUser(user),
    tokens,
  }
}

export async function changePassword(params: {
  userId: string
  currentPassword: string
  newPassword: string
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      hashedPassword: true,
    },
  })

  if (!user?.hashedPassword) {
    throw new Error('User not found')
  }

  const validCurrent = await comparePassword(params.currentPassword, user.hashedPassword)
  if (!validCurrent) {
    throw new Error('Current password is incorrect')
  }

  const passwordError = validatePassword(params.newPassword)
  if (passwordError) {
    throw new Error(passwordError)
  }

  const hashedPassword = await hashPassword(params.newPassword)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
    },
  })
}
