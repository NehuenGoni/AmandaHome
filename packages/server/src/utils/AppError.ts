/**
 * Error operacional esperado (vs. bugs no controlados). El error handler
 * central usa `isOperational` para decidir si el mensaje es seguro de
 * exponer al cliente tal cual, o si debe devolver un mensaje genérico.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Solicitud inválida", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Datos inválidos", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No autorizado") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicto con el estado actual del recurso", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Demasiadas solicitudes, intentá de nuevo más tarde") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "El servicio no está disponible en este momento") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}
