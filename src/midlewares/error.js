const CustomError = require("../helpers/CustomError");
const pool = require("../config/db"); 

const errorHandler = async (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!(err instanceof CustomError)) {
    statusCode = statusCode || 500;
    message = message || "Internal Server Error";
  }

  // Log 500 errors to database
  if (statusCode === 500) {
    try {
      const query = `
        INSERT INTO server_errors (
          message, 
          stack, 
          request_url, 
          request_method, 
          request_body, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const values = [
        message,
        err.stack || 'No stack trace available',
        req.originalUrl,
        req.method,
        JSON.stringify(req.body),
        new Date()
      ];
      
      await pool.query(query, values);
      console.log('✅ Error logged to database');
    } catch (dbError) {
      console.error('❌ Failed to log error to database:', dbError.message);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;