const { body } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    case "register": {
      return [
        body("name", "Name is required").exists().isString().trim(),
        body("email", "Valid email is required").exists().isEmail(),
        body("password", "Password must be at least 8 characters").exists().isLength({ min: 8 }),
      ];
    }

    case "login": {
      return [
        body("email", "Valid email is required").exists().isEmail(),
        body("password", "Password is required").exists()
      ];
    }

    case "refresh-token":
    case "logout": {
      return [
        body("refreshToken", "refreshToken is required").exists(),
      ];
    }

    case "forgot-password": {
      return [
        body("email", "Valid email is required").exists().isEmail(),
      ];
    }

    case "verify-code": {
      return [
        body("email", "Valid email is required").exists().isEmail(),
        body("code", "6-digit code is required").exists().isLength({ min: 6, max: 6 }),
      ];
    }

    case "reset-password": {
      return [
        body("email", "Valid email is required").exists().isEmail(),
        body("code", "6-digit code is required").exists().isLength({ min: 6, max: 6 }),
        body("newPassword", "Password must be at least 8 characters").exists().isLength({ min: 8 }),
      ];
    }

    default:
      return [];
  }
};
