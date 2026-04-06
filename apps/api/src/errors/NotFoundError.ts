import { AppError } from './AppError'

export class NotFoundError extends AppError {
   public details?: unknown

  constructor(
    message = 'Resource not found',
    details?: unknown
  ) {
    super(
      message,
      400,
      'Invalid request data',
      'RESOURCE_NOT_FOUND_ERROR'
    )

    this.details = details
  }
}
