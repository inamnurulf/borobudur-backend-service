class CustomError extends Error {
    constructor({ message, statusCode = 500, errors = null }) {
      super(message);
      this.statusCode = statusCode;
      this.errors = errors;
      Error.captureStackTrace(this, this.constructor);
    }
  }
module.exports = CustomError;  