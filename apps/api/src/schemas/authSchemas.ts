const baseUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    firstName: { type: ['string', 'null'] },
    lastName: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    dob: { type: ['string', 'null'] },
    emailVerified: { type: 'boolean' },
    phoneVerified: { type: 'boolean' },
    createdAt: { type: 'string' },
  },
  required: ['id', 'email', 'firstName', 'lastName', 'phone', 'dob', 'emailVerified', 'phoneVerified', 'createdAt'],
} as const

const verificationSummarySchema = {
  type: 'object',
  properties: {
    emailVerified: { type: 'boolean' },
    phoneVerified: { type: 'boolean' },
    phoneRequired: { type: 'boolean' },
    emailOtpExpiresAt: { type: ['string', 'null'] },
    phoneOtpExpiresAt: { type: ['string', 'null'] },
  },
  required: ['emailVerified', 'phoneVerified', 'phoneRequired', 'emailOtpExpiresAt', 'phoneOtpExpiresAt'],
} as const

export const authRegisterBodySchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string', minLength: 1 },
    lastName: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
    phone: { type: ['string', 'null'] },
    dob: { type: ['string', 'null'] },
  },
  required: ['firstName', 'lastName', 'email', 'password'],
  additionalProperties: false,
} as const

export const authRegisterResponseSchema = {
  type: 'object',
  properties: {
    user: baseUserSchema,
    verification: verificationSummarySchema,
    demoOtp: {
      type: 'object',
      properties: {
        emailOtp: { type: 'string' },
        phoneOtp: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  required: ['user', 'verification'],
} as const

export const authVerificationStatusQuerySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
  },
  required: ['email'],
  additionalProperties: false,
} as const

export const authVerificationStatusResponseSchema = {
  type: 'object',
  properties: {
    user: baseUserSchema,
    verification: verificationSummarySchema,
  },
  required: ['user', 'verification'],
} as const

export const authVerifyOtpBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    channel: { type: 'string', enum: ['email', 'phone'] },
    otp: { type: 'string', minLength: 4, maxLength: 10 },
  },
  required: ['email', 'channel', 'otp'],
  additionalProperties: false,
} as const

export const authResendOtpBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    channel: { type: 'string', enum: ['email', 'phone'] },
  },
  required: ['email', 'channel'],
  additionalProperties: false,
} as const

export const authResendOtpResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    channel: { type: 'string', enum: ['email', 'phone'] },
    expiresAt: { type: 'string' },
    demoOtp: { type: 'string' },
  },
  required: ['success', 'channel', 'expiresAt'],
} as const

export const authCompleteRegistrationBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
  },
  required: ['email'],
  additionalProperties: false,
} as const

export const authLoginBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
  required: ['email', 'password'],
  additionalProperties: false,
} as const

export const authRefreshBodySchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string', minLength: 1 },
  },
  required: ['refreshToken'],
  additionalProperties: false,
} as const

export const authForgotPasswordBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
  },
  required: ['email'],
  additionalProperties: false,
} as const

export const authForgotPasswordResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    expiresAt: { type: 'string' },
    demoOtp: { type: 'string' },
  },
  required: ['success', 'message'],
} as const

export const authResetPasswordBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    otp: { type: 'string', minLength: 4, maxLength: 10 },
    newPassword: { type: 'string', minLength: 8 },
  },
  required: ['email', 'otp', 'newPassword'],
  additionalProperties: false,
} as const

export const authChangePasswordBodySchema = {
  type: 'object',
  properties: {
    currentPassword: { type: 'string', minLength: 1 },
    newPassword: { type: 'string', minLength: 8 },
  },
  required: ['currentPassword', 'newPassword'],
  additionalProperties: false,
} as const

export const successResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
  required: ['success'],
} as const

export const authResponseSchema = {
  type: 'object',
  properties: {
    user: baseUserSchema,
    tokens: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
      required: ['accessToken', 'refreshToken'],
    },
  },
  required: ['user', 'tokens'],
} as const

export const meResponseSchema = {
  type: 'object',
  properties: {
    user: baseUserSchema,
  },
  required: ['user'],
} as const
