const { body } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    case "createNode": {
      return [
        body("name")
          .exists().withMessage("Name is required")
          .bail()
          .isString().withMessage("Name must be a string")
          .trim(),

        body("type")
          .exists().withMessage("Type is required")
          .bail()
          .isIn(["poi", "intersection"]).withMessage("Type must be either 'poi' or 'intersection'"),

        body("longitude")
          .exists().withMessage("Longitude is required")
          .bail()
          .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be a valid number between -180 and 180"),

        body("latitude")
          .exists().withMessage("Latitude is required")
          .bail()
          .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be a valid number between -90 and 90"),
      ];
    }

    case "updateNode": {
      return [
        // opsional, tapi jika diisi maka harus valid
        body("name")
          .optional()
          .isString().withMessage("Name must be a string")
          .trim(),

        body("type")
          .optional()
          .isIn(["poi", "intersection"]).withMessage("Type must be either 'poi' or 'intersection'"),

        body("longitude")
          .optional()
          .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be a valid number between -180 and 180"),

        body("latitude")
          .optional()
          .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be a valid number between -90 and 90"),
      ];
    }

    default:
      return [];
  }
};
