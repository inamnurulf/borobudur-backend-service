const { body } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    case "register": {
      return [
        body("name")
          .exists().withMessage("Name is required")
          .bail()
          .isString().withMessage("Name must be a string")
          .trim(),

        body("email")
          .exists().withMessage("Email is required")
          .bail()
          .isEmail().withMessage("Email must be valid"),

        body("password")
          .exists().withMessage("Password is required")
          .bail()
          .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
      ];
    }

    case "login": {
      return [
        body("email")
          .exists().withMessage("Email is required")
          .bail()
          .isEmail().withMessage("Email must be valid"),

        body("password")
          .exists().withMessage("Password is required")
      ];
    }

    case "refresh-token":
    case "logout": {
      return [
        body("refreshToken")
          .exists().withMessage("Refresh token is required"),
      ];
    }

    case "resend-verification":
    case "forgot-password": {
      return [
        body("email")
          .exists().withMessage("Email is required")
          .bail()
          .isEmail().withMessage("Email must be valid"),
      ];
    }

    case "verify-email": {
      return [
        body("email")
          .exists().withMessage("Email is required")
          .bail()
          .isEmail().withMessage("Email must be valid"),

        body("code")
          .exists().withMessage("Code is required")
          .bail()
          .isLength({ min: 6, max: 6 }).withMessage("Code must be 6 digits"),
      ];
    }

    case "reset-password": {
      return [
        body("email")
          .exists().withMessage("Email is required")
          .bail()
          .isEmail().withMessage("Email must be valid"),

        body("code")
          .exists().withMessage("Code is required")
          .bail()
          .isLength({ min: 6, max: 6 }).withMessage("Code must be 6 digits"),

        body("newPassword")
          .exists().withMessage("New password is required")
          .bail()
          .isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
      ];
    }

    default:
      return [];
  }
};
