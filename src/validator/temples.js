const { query } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    /**
     * GET /v1/temples/graph
     */
    case "getGraph": {
      return [
        query("bbox")
          .optional()
          .matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
          .withMessage("bbox must be 'minLon,minLat,maxLon,maxLat'"),

        query("area_id")
          .optional()
          .isInt({ min: 1 })
          .withMessage("area_id must be integer"),

        query("type")
          .optional()
          .isIn(["walkway", "road", "stairs", "ramp"])
          .withMessage("type must be one of: walkway, road, stairs, ramp"),
      ];
    }

    /**
     * GET /v1/temples/features
     */
    case "getFeatures": {
      return [
        query("type")
          .optional()
          .isString().withMessage("type must be a string"),

        query("q")
          .optional()
          .isString().withMessage("q must be a string"),

        query("bbox")
          .optional()
          .matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
          .withMessage("bbox must be 'minLon,minLat,maxLon,maxLat'"),

        query("near")
          .optional()
          .matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
          .withMessage("near must be 'lat,lon'"),

        query("radius")
          .optional()
          .isFloat({ min: 0 })
          .withMessage("radius must be >= 0"),

        query("page")
          .optional()
          .isInt({ min: 1 })
          .withMessage("page must be >= 1"),

        query("limit")
          .optional()
          .isInt({ min: 1, max: 100 })
          .withMessage("limit must be between 1 and 100"),
      ];
    }

    /**
     * GET /v1/temples/features/nearest
     */
    case "getNearestFeatures": {
      return [
        query("lat")
          .exists().withMessage("lat is required")
          .bail()
          .isFloat({ min: -90, max: 90 })
          .withMessage("lat must be between -90 and 90"),

        query("lon")
          .exists().withMessage("lon is required")
          .bail()
          .isFloat({ min: -180, max: 180 })
          .withMessage("lon must be between -180 and 180"),

        query("type")
          .optional()
          .isString().withMessage("type must be a string"),

        query("radius")
          .optional()
          .isFloat({ min: 0 })
          .withMessage("radius must be >= 0"),

        query("page")
          .optional()
          .isInt({ min: 1 })
          .withMessage("page must be >= 1"),

        query("limit")
          .optional()
          .isInt({ min: 1, max: 50 })
          .withMessage("limit must be between 1 and 50"),
      ];
    }

    /**
     * GET /v1/temples/navigation/route
     */
    case "getRoute": {
      return [
        query("fromLat")
          .exists().withMessage("fromLat is required")
          .bail()
          .isFloat({ min: -90, max: 90 })
          .withMessage("fromLat must be between -90 and 90"),

        query("fromLon")
          .exists().withMessage("fromLon is required")
          .bail()
          .isFloat({ min: -180, max: 180 })
          .withMessage("fromLon must be between -180 and 180"),

        query("toNodeId")
          .exists().withMessage("toNodeId is required")
          .bail()
          .isInt({ min: 1 })
          .withMessage("toNodeId must be an integer"),

        query("profile")
          .optional()
          .isIn(["walking", "accessible"])
          .withMessage("profile must be walking or accessible"),

        query("area_id")
          .optional()
          .isInt({ min: 1 })
          .withMessage("area_id must be integer"),

        query("alternatives")
          .optional()
          .isInt({ min: 0, max: 3 })
          .withMessage("alternatives must be between 0 and 3"),
      ];
    }

    default:
      return [];
  }
};
