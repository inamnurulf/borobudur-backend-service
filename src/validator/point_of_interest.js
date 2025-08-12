
const { query, param } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    case "getNearbyPOIs":
      return [
        query("latitude")
          .exists().withMessage("latitude is required")
          .bail()
          .isFloat({ min: -90, max: 90 }).withMessage("latitude must be between -90 and 90"),

        query("longitude")
          .exists().withMessage("longitude is required")
          .bail()
          .isFloat({ min: -180, max: 180 }).withMessage("longitude must be between -180 and 180"),

        query("radius")
          .optional()
          .isInt({ min: 1 }).withMessage("radius must be a positive integer"),

        query("limit")
          .optional()
          .isInt({ min: 1 }).withMessage("limit must be a positive integer"),
      ];

    case "routeToPOI":
      return [
        param("poiId")
          .exists().withMessage("poiId is required")
          .bail()
          .isInt({ gt: 0 }).withMessage("poiId must be a positive integer"),

        query("latitude")
          .exists().withMessage("latitude is required")
          .bail()
          .isFloat({ min: -90, max: 90 }).withMessage("latitude must be between -90 and 90"),

        query("longitude")
          .exists().withMessage("longitude is required")
          .bail()
          .isFloat({ min: -180, max: 180 }).withMessage("longitude must be between -180 and 180"),
      ];

    default:
      return [];
  }
};
