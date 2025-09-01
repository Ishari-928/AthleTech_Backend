const ErrorCodes = require('../../constants/ErrorCodes');
const AppError = require('./AppError');

class CustomInternalServerError extends AppError {
  constructor(message = ErrorCodes.CUSTOM_INTERNAL_SERVER_ERROR.message) {
    super(message, ErrorCodes.CUSTOM_INTERNAL_SERVER_ERROR.code, ErrorCodes.CUSTOM_INTERNAL_SERVER_ERROR.httpStatus);
  }
}

class RecordNotFoundError extends AppError {
  constructor(message = ErrorCodes.RECORD_NOT_FOUND.message) {
    super(message, ErrorCodes.RECORD_NOT_FOUND.code, ErrorCodes.RECORD_NOT_FOUND.httpStatus);
  }
}

class ValidationFailureError extends AppError {
  constructor(message = ErrorCodes.VALIDATION_FAILURE.message) {
    super(message, ErrorCodes.VALIDATION_FAILURE.code, ErrorCodes.VALIDATION_FAILURE.httpStatus);
  }
}

class InvalidFormatError extends AppError {
  constructor(message = ErrorCodes.INVALID_FORMAT.message) {
    super(message, ErrorCodes.INVALID_FORMAT.code, ErrorCodes.INVALID_FORMAT.httpStatus);
  }
}

class DuplicateRecordsError extends AppError {
  constructor(message = ErrorCodes.DUPLICATE_ENTRIES.message) {
    super(message, ErrorCodes.DUPLICATE_ENTRIES.code, ErrorCodes.DUPLICATE_ENTRIES.httpStatus);
  }
}

class BadRequestError extends AppError {
  constructor(message = ErrorCodes.BAD_REQUEST.message) {
    super(message, ErrorCodes.BAD_REQUEST.code, ErrorCodes.BAD_REQUEST.httpStatus);
  }
}

class RequestBodyItemNotFoundError extends AppError {
  constructor(message = ErrorCodes.REQUEST_BODY_ITEM_NOT_FOUND.message) {
    super(message, ErrorCodes.REQUEST_BODY_ITEM_NOT_FOUND.code, ErrorCodes.REQUEST_BODY_ITEM_NOT_FOUND.httpStatus);
  }
}

class DeletionBlockedError extends AppError {
  constructor(message = ErrorCodes.DELETION_BLOCKED.message) {
    super(message, ErrorCodes.DELETION_BLOCKED.code, ErrorCodes.DELETION_BLOCKED.httpStatus);
  }
}

class FileNotFoundError extends AppError {
  constructor(message = ErrorCodes.FILE_NOT_FOUND.message) {
    super(message, ErrorCodes.FILE_NOT_FOUND.code, ErrorCodes.FILE_NOT_FOUND.httpStatus);
  }
}

class UserBlockedError extends AppError {
  constructor(message = ErrorCodes.USER_BLOCKED.message) {
    super(message, ErrorCodes.USER_BLOCKED.code, ErrorCodes.USER_BLOCKED.httpStatus);
  }
}

class PasswordMismatchError extends AppError {
  constructor(message = ErrorCodes.PASSWORD_MISMATCH.message) {
    super(message, ErrorCodes.PASSWORD_MISMATCH.code, ErrorCodes.PASSWORD_MISMATCH.httpStatus);
  }
}

class PermissionDeniedError extends AppError {
  constructor(message = ErrorCodes.PERMISSION_DENIED.message) {
    super(message, ErrorCodes.PERMISSION_DENIED.code, ErrorCodes.PERMISSION_DENIED.httpStatus);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = ErrorCodes.UNAUTHORIZED.message) {
    super(message, ErrorCodes.UNAUTHORIZED.code, ErrorCodes.UNAUTHORIZED.httpStatus);
  }
}

module.exports = {
  CustomInternalServerError,
  RecordNotFoundError,
  ValidationFailureError,
  InvalidFormatError,
  DuplicateRecordsError,
  BadRequestError,
  RequestBodyItemNotFoundError,
  DeletionBlockedError,
  FileNotFoundError,
  UserBlockedError,
  PasswordMismatchError,
  PermissionDeniedError,
  UnauthorizedError,
};
