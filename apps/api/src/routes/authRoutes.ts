import type { FastifyInstance } from 'fastify'
import {
  changePasswordController,
  completeRegistrationController,
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
  resendOtpController,
  resetPasswordController,
  verificationStatusController,
  verifyOtpController,
} from '../controllers/authController'
import {
  authChangePasswordBodySchema,
  authCompleteRegistrationBodySchema,
  authForgotPasswordBodySchema,
  authForgotPasswordResponseSchema,
  authLoginBodySchema,
  authRefreshBodySchema,
  authRegisterBodySchema,
  authRegisterResponseSchema,
  authResendOtpBodySchema,
  authResendOtpResponseSchema,
  authResponseSchema,
  authResetPasswordBodySchema,
  authVerificationStatusQuerySchema,
  authVerificationStatusResponseSchema,
  authVerifyOtpBodySchema,
  meResponseSchema,
  successResponseSchema,
} from '../schemas/authSchemas'
import { requireProtectedAuth } from '../utils/protectionMiddleware'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', {
    schema: {
      body: authRegisterBodySchema,
      response: {
        201: authRegisterResponseSchema,
      },
    },
    handler: registerController,
  })

  app.get('/auth/verification-status', {
    schema: {
      querystring: authVerificationStatusQuerySchema,
      response: {
        200: authVerificationStatusResponseSchema,
      },
    },
    handler: verificationStatusController,
  })

  app.post('/auth/verify-otp', {
    schema: {
      body: authVerifyOtpBodySchema,
      response: {
        200: authVerificationStatusResponseSchema,
      },
    },
    handler: verifyOtpController,
  })

  app.post('/auth/resend-otp', {
    schema: {
      body: authResendOtpBodySchema,
      response: {
        200: authResendOtpResponseSchema,
      },
    },
    handler: resendOtpController,
  })

  app.post('/auth/register/complete', {
    schema: {
      body: authCompleteRegistrationBodySchema,
      response: {
        200: authResponseSchema,
      },
    },
    handler: completeRegistrationController,
  })

  app.post('/auth/login', {
    schema: {
      body: authLoginBodySchema,
      response: {
        200: authResponseSchema,
      },
    },
    handler: loginController,
  })

  app.post('/auth/forgot-password', {
    schema: {
      body: authForgotPasswordBodySchema,
      response: {
        200: authForgotPasswordResponseSchema,
      },
    },
    handler: forgotPasswordController,
  })

  app.post('/auth/reset-password', {
    schema: {
      body: authResetPasswordBodySchema,
      response: {
        200: authResponseSchema,
      },
    },
    handler: resetPasswordController,
  })

  app.post('/auth/change-password', {
    preHandler: requireProtectedAuth,
    schema: {
      body: authChangePasswordBodySchema,
      response: {
        200: successResponseSchema,
      },
    },
    handler: changePasswordController,
  })

  app.post('/auth/refresh', {
    schema: {
      body: authRefreshBodySchema,
      response: {
        200: authResponseSchema,
      },
    },
    handler: refreshController,
  })

  app.post('/auth/logout', {
    preHandler: requireProtectedAuth,
    schema: {
      response: {
        200: successResponseSchema,
      },
    },
    handler: logoutController,
  })

  app.get('/auth/me', {
    preHandler: requireProtectedAuth,
    schema: {
      response: {
        200: meResponseSchema,
      },
    },
    handler: meController,
  })

  app.get('/protected/ping', {
    preHandler: requireProtectedAuth,
    handler: async () => ({ ok: true }),
  })
}
