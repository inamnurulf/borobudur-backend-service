// validator/edges.js

const { body } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    case "createEdge": {
      return [
        body("source")
          .exists().withMessage("Source node ID is required")
          .bail()
          .isInt({ gt: 0 }).withMessage("Source must be a positive integer"),

        body("target")
          .exists().withMessage("Target node ID is required")
          .bail()
          .isInt({ gt: 0 }).withMessage("Target must be a positive integer"),

        body("cost")
          .exists().withMessage("Cost is required")
          .bail()
          .isFloat({ min: 0 }).withMessage("Cost must be a non-negative number"),

        body("geom")
          .exists().withMessage("geom (GeoJSON) is required")
          .bail()
          .custom((value) => {
            if (typeof value !== "object" || value === null) {
              throw new Error("geom must be a valid GeoJSON object");
            }
            const { type, coordinates } = value;
            if (type !== "LineString") {
              throw new Error("geom.type must be 'LineString'");
            }
            if (!Array.isArray(coordinates)) {
              throw new Error("geom.coordinates must be an array");
            }
            // Optional: ensure each coordinate is [lon, lat]
            for (const coord of coordinates) {
              if (
                !Array.isArray(coord) ||
                coord.length !== 2 ||
                typeof coord[0] !== "number" ||
                typeof coord[1] !== "number"
              ) {
                throw new Error(
                  "Each coordinate must be an array of two numbers [longitude, latitude]"
                );
              }
            }
            return true;
          }),
      ];
    }

    case "updateEdge": {
      return [
        body("source")
          .optional()
          .isInt({ gt: 0 }).withMessage("Source must be a positive integer"),

        body("target")
          .optional()
          .isInt({ gt: 0 }).withMessage("Target must be a positive integer"),

        body("cost")
          .optional()
          .isFloat({ min: 0 }).withMessage("Cost must be a non-negative number"),

        body("geom")
          .optional()
          .custom((value) => {
            if (typeof value !== "object" || value === null) {
              throw new Error("geom must be a valid GeoJSON object");
            }
            const { type, coordinates } = value;
            if (type !== "LineString") {
              throw new Error("geom.type must be 'LineString'");
            }
            if (!Array.isArray(coordinates)) {
              throw new Error("geom.coordinates must be an array");
            }
            for (const coord of coordinates) {
              if (
                !Array.isArray(coord) ||
                coord.length !== 2 ||
                typeof coord[0] !== "number" ||
                typeof coord[1] !== "number"
              ) {
                throw new Error(
                  "Each coordinate must be an array of two numbers [longitude, latitude]"
                );
              }
            }
            return true;
          }),
      ];
    }

    default:
      return [];
  }
};
