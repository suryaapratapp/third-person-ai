import { AppError } from './AppError'

export class ValidationError extends AppError {
  public details?: unknown

  constructor(
    message = 'Validation failed',
    details?: unknown
  ) {
    super(
      message,
      400,
      'Invalid request data',
      'VALIDATION_ERROR'
    )

    this.details = details
  }
}