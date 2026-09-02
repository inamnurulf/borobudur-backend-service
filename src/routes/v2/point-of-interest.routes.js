const express = require("express");
const router = express.Router();
const poiV2Controller = require("../../controllers/v2/point_of_interest.controller");
const { validate } = require("../../validator/point_of_interest");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");

/**
 * @swagger
 * tags:
 *   name: PointOfInterestV2
 *   description: Points of Interest (v2)
 */

/**
 * @swagger
 * /v2/point-of-interest/nearby:
 *   get:
 *     summary: Get nearby POIs given a location (simplified response)
 *     tags: [PointOfInterestV2]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radius
 *         schema: { type: integer, default: 1000 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of nearby POIs (facilities)
 */
router.get("/nearby", validate("getNearbyPOIs"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }
    const result = await poiV2Controller.getNearbyPOIs(req);
    res
      .status(200)
      .json(successResponse({ message: "Nearby POIs fetched", data: result }));
  } catch (err) {
    logger.error("Error in v2 getNearbyPOIs:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
