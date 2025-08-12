const { body, query, param } = require("express-validator");

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
      
    case "createPOI":
      return [
        body("node_id")
          .exists().withMessage("node_id is required")
          .bail()
          .isInt({ gt: 0 }).withMessage("node_id must be a positive integer"),

        body("description")
          .optional()
          .isString().withMessage("description must be a string")
          .trim()
          .notEmpty().withMessage("description cannot be empty"),

        body("opening_hours")
          .optional()
          .isObject().withMessage("opening_hours must be a valid JSON object"),
        
        body("contact_info")
          .optional()
          .isObject().withMessage("contact_info must be a valid JSON object"),

        body("image_url")
          .optional()
          .isURL().withMessage("image_url must be a valid URL"),

        body("rating")
          .optional()
          .isFloat({ min: 0, max: 5 }).withMessage("rating must be a number between 0 and 5"),

        body("metadata")
          .optional()
          .isObject().withMessage("metadata must be a valid JSON object"),
          
        body("is_active")
          .optional()
          .isBoolean().withMessage("is_active must be a boolean"),
          
        body("category_ids")
          .optional()
          .isArray().withMessage("category_ids must be an array")
          .bail()
          .custom((value) => {
            if (!value.every(item => typeof item === 'number' && item > 0)) {
              throw new Error("Each category_id must be a positive integer");
            }
            return true;
          }),
      ];

    case "getPOIById":
    case "deletePOI":
      return [
        param("id")
          .exists().withMessage("id is required")
          .bail()
          .isInt({ gt: 0 }).withMessage("id must be a positive integer"),
      ];

    case "updatePOI":
      return [
        param("id")
          .exists().withMessage("id is required")
          .bail()
          .isInt({ gt: 0 }).withMessage("id must be a positive integer"),
        
        // All fields are optional for an update
        body("node_id")
          .optional()
          .isInt({ gt: 0 }).withMessage("node_id must be a positive integer"),

        body("description")
          .optional()
          .isString().withMessage("description must be a string")
          .trim()
          .notEmpty().withMessage("description cannot be empty"),

        body("opening_hours")
          .optional()
          .isObject().withMessage("opening_hours must be a valid JSON object"),
        
        body("contact_info")
          .optional()
          .isObject().withMessage("contact_info must be a valid JSON object"),

        body("image_url")
          .optional()
          .isURL().withMessage("image_url must be a valid URL"),

        body("rating")
          .optional()
          .isFloat({ min: 0, max: 5 }).withMessage("rating must be a number between 0 and 5"),

        body("metadata")
          .optional()
          .isObject().withMessage("metadata must be a valid JSON object"),
          
        body("is_active")
          .optional()
          .isBoolean().withMessage("is_active must be a boolean"),

        body("category_ids")
          .optional()
          .isArray().withMessage("category_ids must be an array")
          .bail()
          .custom((value) => {
            if (!value.every(item => typeof item === 'number' && item > 0)) {
              throw new Error("Each category_id must be a positive integer");
            }
            return true;
          }),
      ];

    default:
      return [];
  }
};