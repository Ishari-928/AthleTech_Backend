const ErrorCodes = require('../../constants/ErrorCodes');
class AppError extends Error {
  constructor(
    message = ErrorCodes.DEFAULT_ERROR.message,
    statusCode = ErrorCodes.DEFAULT_ERROR.code,
    httpStatus = ErrorCodes.DEFAULT_ERROR.httpStatus,
  ) {
    super(message); // Error message
    this.statusCode = statusCode; // custom error status code
    this.httpStatus = httpStatus; // Http status code
    this.isCustomError = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
