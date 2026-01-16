// class ApiError extends Error {
//   constructor(message, statusCode = 500, details = {}) {
//     super(message);
//     this.name = this.constructor.name;
//     this.statusCode = statusCode;
//     this.details = details;
//     Error.captureStackTrace(this, this.constructor);
//   }
// }
// module.exports = ApiError;


class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;