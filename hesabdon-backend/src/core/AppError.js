export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
  static badRequest(m, code = 'BAD_REQUEST', d) { return new AppError(m, 400, code, d); }
  static unauthorized(m = 'احراز هویت لازم است', code = 'UNAUTHORIZED') { return new AppError(m, 401, code); }
  static forbidden(m = 'دسترسی مجاز نیست', code = 'FORBIDDEN') { return new AppError(m, 403, code); }
  static notFound(m = 'مورد درخواستی پیدا نشد', code = 'NOT_FOUND', d) { return new AppError(m, 404, code, d); }
  static conflict(m, code = 'CONFLICT', d) { return new AppError(m, 409, code, d); }
  static unprocessable(m, code = 'UNPROCESSABLE', d) { return new AppError(m, 422, code, d); }
}
