const ErrorCodes = Object.freeze({
  DEFAULT_ERROR: {
    code: '500',
    message: 'An error occurred.',
    httpStatus: 500,
  },
  CUSTOM_INTERNAL_SERVER_ERROR: {
    code: '5000',
    message: 'Custom Internal Service Failure',
    httpStatus: 500,
  },
  RECORD_NOT_FOUND: {
    code: '5005',
    message: 'Record Not Found',
    httpStatus: 404,
  },
  VALIDATION_FAILURE: {
    code: '5010',
    message: 'Validation Failure. Invalid Arguments',
    httpStatus: 400,
  },
  INVALID_FORMAT: { 
    code: '5015', 
    message: 'Invalid Format', 
    httpStatus: 400 
},
  DUPLICATE_ENTRIES: {
    code: '5020',
    message: 'Duplicate Entries',
    httpStatus: 409,
  },
  BAD_REQUEST: { 
    code: '5025', 
    message: 'Bad Request', 
    httpStatus: 400 
},
  REQUEST_BODY_ITEM_NOT_FOUND: {
    code: '5030',
    message: 'Request Body Item Not Found',
    httpStatus: 404,
  },
  DELETION_BLOCKED: {
    code: '5035',
    message: 'Deletion Blocked.',
    httpStatus: 409,
  },
  FILE_NOT_FOUND: { 
    code: '5040', 
    message: 'File Not Found', 
    httpStatus: 404 
},
  USER_BLOCKED: {
    code: '5045',
    message: 'User is blocked. Contact support.',
    httpStatus: 403,
  },
  PASSWORD_MISMATCH: {
    code: '5050',
    message: 'Password mismatch. Please try again.',
    httpStatus: 400,
  },
  PERMISSION_DENIED: {
    code: '5055',
    message: 'Permission Denied!',
    httpStatus: 403,
  },
  UNAUTHORIZED: {
    code: '5060',
    message: 'Authentication required.',
    httpStatus: 401,
  },
});

module.exports = ErrorCodes;
