import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  changePassword,
  completeRegistration,
  forgotPassword,
  getCurrentUser,
  getVerificationStatus,
  loginWithEmail,
  logoutUser,
  refreshSession,
  registerWithEmail,
  resendRegistrationOtp,
  resetPassword,
  verifyRegistrationOtp,
} from '../services/authService'

function isInfraError(message: string): boolean {
  return /can't reach database server|invalid `prisma\.|prisma.*invocation|P1001|ECONNREFUSED/i.test(message)
}

function safeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  const message = error.message?.trim()
  if (!message) return fallback
  if (isInfraError(message)) return 'Service temporarily unavailable. Please try again shortly.'
  if (message.length > 200) return fallback
  return message
}

type LoginBody = {
  email: string
  password: string
}

type RefreshBody = {
  refreshToken: string
}

type RegisterBody = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string | null
  dob?: string | null
}

type VerificationStatusQuery = {
  email: string
}

type VerifyOtpBody = {
  email: string
  channel: 'email' | 'phone'
  otp: string
}

type ResendOtpBody = {
  email: string
  channel: 'email' | 'phone'
}

type CompleteRegistrationBody = {
  email: string
}

type ForgotPasswordBody = {
  email: string
}

type ResetPasswordBody = {
  email: string
  otp: string
  newPassword: string
}

type ChangePasswordBody = {
  currentPassword: string
  newPassword: string
}

export async function registerController(request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
  try {
    const result = await registerWithEmail(request.body)
    return reply.status(201).send(result)
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Registration failed'
    if (isInfraError(rawMessage)) {
      return reply.status(503).send({ error: 'Service temporarily unavailable. Please try again shortly.' })
    }
    const message = safeErrorMessage(error, 'Registration failed')
    const statusCode = message.includes('already registered') ? 409 : 400
    return reply.status(statusCode).send({ error: message })
  }
}

export async function verificationStatusController(
  request: FastifyRequest<{ Querystring: VerificationStatusQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await getVerificationStatus(request.query.email)
    return reply.status(200).send(result)
  } catch (error) {
    const message = safeErrorMessage(error, 'Unable to fetch verification status')
    if (message === 'Service temporarily unavailable. Please try again shortly.') {
      return reply.status(503).send({ error: message })
    }
    const statusCode = message.includes('not found') ? 404 : 400
    return reply.status(statusCode).send({ error: message })
  }
}

export async function verifyOtpController(request: FastifyRequest<{ Body: VerifyOtpBody }>, reply: FastifyReply) {
  try {
    const result = await verifyRegistrationOtp(request.body)
    return reply.status(200).send(result)
  } catch (error) {
    const message = safeErrorMessage(error, 'Verification failed')
    if (message === 'Service temporarily unavailable. Please try again shortly.') {
      return reply.status(503).send({ error: message })
    }
    const statusCode = message.includes('not found') ? 404 : 400
    return reply.status(statusCode).send({ error: message })
  }
}

export async function resendOtpController(request: FastifyRequest<{ Body: ResendOtpBody }>, reply: FastifyReply) {
  try {
    const result = await resendRegistrationOtp(request.body)
    return reply.status(200).send(result)
  } catch (error) {
    const message = safeErrorMessage(error, 'Unable to resend OTP')
    if (message === 'Service temporarily unavailable. Please try again shortly.') {
      return reply.status(503).send({ error: message })
    }
    const statusCode = message.includes('not found') ? 404 : 400
    return reply.status(statusCode).send({ error: message })
  }
}

export async function completeRegistrationController(
  request: FastifyRequest<{ Body: CompleteRegistrationBody }>,
  reply: FastifyReply,
) {
  try {
    const result = await completeRegistration(request.body.email)
    return reply.status(200).send(result)
  } catch (error) {
    const message = safeErrorMessage(error, 'Unable to complete registration')
    if (message === 'Service temporarily unavailable. Please try again shortly.') {
      return reply.status(503).send({ error: message })
    }
    const statusCode = message.includes('required') ? 403 : 400
    return reply.status(statusCode).send({ error: message })
  }
}

export async function loginController(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
  try {
    const result = await loginWithEmail(request.body.email, request.body.password)
    return reply.status(200).send(result)
  } catch (error) {
    const message = safeErrorMessage(error, 'Invalid email or password')
    if (message === 'Service temporarily unavailable. Please try again shortly.') {
      return reply.status(503).send({ error: message })
    }
    const statusCode = message.includes('not verified') ? 403 : 401
    return reply.status(statusCode).send({ error: message })
  }
}

export async function forgotPasswordController(
  request: FastifyRequest<{ Body: ForgotPasswordBody }>,
  reply: FastifyReply,
) {
  try {
    const result = await forgotPassword(request.body.email)
    return reply.status(200).send(result)
  } catch {
    return reply
      .status(200)
      .send({ success: true, message: 'If an account exists for this email, a reset code has been sent.' })
  }
}

export async function resetPasswordController(
  request: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply,
) {
  try {
    const result = await resetPassword(request.body)
    return reply.status(200).send(result)
  } catch (error) {
    const message = safeErrorMessage(error, 'Unable to reset password')
    if (message === 'Service temporarily unavailable. Please try again shortly.') {
      return reply.status(503).send({ error: message })
    }
    return reply.status(400).send({ error: message })
  }
}

export async function changePasswordController(
  request: FastifyRequest<{ Body: ChangePasswordBody }>,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  try {
    await changePassword({
      userId: request.authUserId,
      currentPassword: request.body.currentPassword,
      newPassword: request.body.newPassword,
    })
    return reply.status(200).send({ success: true })
  } catch (error) {
    const message = safeErrorMessage(error, 'Unable to change password')
    if (message === 'Service temporarily unavailable. Please try again shortly.') {
      return reply.status(503).send({ error: message })
    }
    return reply.status(400).send({ error: message })
  }
}

export async function logoutController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  await logoutUser(request.authUserId)
  return reply.status(200).send({ success: true })
}

export async function refreshController(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
  try {
    const result = await refreshSession(request.body.refreshToken)
    return reply.status(200).send(result)
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }
}

export async function meController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const user = await getCurrentUser(request.authUserId)
  if (!user) {
    return reply.status(404).send({ error: 'User not found' })
  }

  return reply.status(200).send({ user })
}
