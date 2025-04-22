const pool = require("../config/db");

exports.successResponse = ({ message = "Success", data = null, code = 200 }) => {
  return {
    status: "success",
    message,
    data,
    code,
  };
};

exports.failedResponse = async ({ message = "Something went wrong", errors = null, code = 400, req = null }) => {
  // Log 500 errors to the database
  if (code === 500 && req) {
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
        errors?.stack || "No stack trace available",
        req.originalUrl,
        req.method,
        JSON.stringify(req.body),
        new Date(),
      ];

      await pool.query(query, values);
      console.log("✅ Error logged to database");
    } catch (dbError) {
      console.error("❌ Failed to log error to database:", dbError.message);
    }
  }

  return {
    status: "error",
    message,
    errors,
    code,
  };
};