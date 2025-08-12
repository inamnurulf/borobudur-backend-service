const express = require("express");
const router = express.Router();
const poiController = require("../../controllers/v1/point_of_interest.controller");
const { validate } = require("../../validator/point_of_interest");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const authenticate = require("../../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: PointOfInterest
 *   description: Points of Interest listing and routing
 */

/**
 * @swagger
 * /v1/point-of-interest:
 *   get:
 *     summary: Get all POIs
 *     tags: [PointOfInterest]
 *     responses:
 *       200:
 *         description: List of all POIs
 */
router.get("/", async (req, res) => {
  try {
    const result = await poiController.getAllPOIs(req);
    res
      .status(200)
      .json(successResponse({ message: "POIs fetched", data: result }));
  } catch (err) {
    logger.error("Error in getAllPOIs:", err);
    await failedResponse({ res, req, errors: err });
  }
});

router.post("/", authenticate, validate("createPOI"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }
    const result = await poiController.createPOI(req);
    res.status(201).json(successResponse({ message: "POI created successfully", data: result }));
  } catch (err) {
    logger.error("Error in createPOI:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/point-of-interest/nearby:
 *   get:
 *     summary: Get nearby POIs given a location
 *     tags: [PointOfInterest]
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
 *         description: List of nearby POIs
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
    const result = await poiController.getNearbyPOIs(req);
    res
      .status(200)
      .json(successResponse({ message: "Nearby POIs fetched", data: result }));
  } catch (err) {
    logger.error("Error in getNearbyPOIs:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/point-of-interest/{poiId}/route:
 *   get:
 *     summary: Compute shortest path from a location to a POI
 *     tags: [PointOfInterest]
 *     parameters:
 *       - in: path
 *         name: poiId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Route from your location to the POI
 */
router.get(
  "/:poiId/route",
  authenticate,
  validate("routeToPOI"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new CustomError({
          message: "Validation failed",
          statusCode: 400,
          errors: errors.array(),
        });
      }
      // move poiId into query for controller
      req.query.poiId = req.params.poiId;
      const result = await poiController.routeToPOI(req);
      res
        .status(200)
        .json(successResponse({ message: "Route computed", data: result }));
    } catch (err) {
      logger.error("Error in routeToPOI:", err);
      await failedResponse({ res, req, errors: err });
    }
  }
);

router.get("/:id", validate("getPOIById"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }
    const result = await poiController.getPOIById(req);
    res
      .status(200)
      .json(successResponse({ message: "POI fetched", data: result }));
  } catch (err) {
    logger.error("Error in getPOIById:", err);
    await failedResponse({ res, req, errors: err });
  }
});

router.put("/:id", authenticate, validate("updatePOI"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }
    const result = await poiController.updatePOI(req);
    res
      .status(200)
      .json(
        successResponse({ message: "POI updated successfully", data: result })
      );
  } catch (err) {
    logger.error("Error in updatePOI:", err);
    await failedResponse({ res, req, errors: err });
  }
});

router.delete("/:id", authenticate, validate("deletePOI"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }
    const result = await poiController.deletePOI(req);
    res.status(200).json(successResponse({ message: result.message }));
  } catch (err) {
    logger.error("Error in deletePOI:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
