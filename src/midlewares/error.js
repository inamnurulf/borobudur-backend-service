const CustomError = require("../helpers/CustomError");

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!(err instanceof CustomError)) {
    statusCode = statusCode || 500;
    message = message || "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
