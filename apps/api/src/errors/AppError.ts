// src/errors/AppError.ts

export class AppError extends Error {
  public statusCode: number
  public safeMessage: string
  public code: string

  constructor(
    message: string,          // internal message (logs)
    statusCode: number,
    safeMessage: string,      // client-safe message
    code: string              // machine-readable code
  ) {
    super(message)

    this.statusCode = statusCode
    this.safeMessage = safeMessage
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}