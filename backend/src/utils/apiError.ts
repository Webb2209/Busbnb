/**
 * src/utils/apiError.ts
 * Typed error class used throughout the app.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code?: string) {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message: string) {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string, code?: string) {
    return new ApiError(409, message, code);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL');
  }
}
