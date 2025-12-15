const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const templesController = require("../../controllers/v2/temples.controller");

const { validate } = require("../../validator/temples");

/**
 * @swagger
 * tags:
 *   name: Temples
 *   description: Temple graph, features, and navigation
 */

/**
 * @swagger
 * /v1/temples/graph:
 *   get:
 *     summary: Get temple graph (nodes + edges) as GeoJSON
 *     tags: [Temples]
 *     parameters:
 *       - in: query
 *         name: bbox
 *         schema: { type: string, example: "minLon,minLat,maxLon,maxLat" }
 *       - in: query
 *         name: area_id
 *         schema: { type: integer }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [walkway, road, stairs, ramp] }
 *     responses:
 *       200:
 *         description: GeoJSON FeatureCollection (nodes + edges)
 */
router.get("/graph", validate("getGraph"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({ message: "Validation failed", statusCode: 400, errors: errors.array() });
    }
    const result = await templesController.getGraph(req);
    res.status(200).json(successResponse({ message: "Graph fetched", data: result }));
  } catch (err) {
    logger.error("Error in getGraph:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/temples/features:
 *   get:
 *     summary: Get temple features as GeoJSON
 *     tags: [Temples]
 */
router.get("/features", validate("getFeatures"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({ message: "Validation failed", statusCode: 400, errors: errors.array() });
    }
    const result = await templesController.getFeatures(req);
    res.status(200).json(successResponse({ message: "Features fetched", data: result }));
  } catch (err) {
    logger.error("Error in getFeatures:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/temples/features/nearest:
 *   get:
 *     summary: Get nearest temple features (paginated)
 *     tags: [Temples]
 */
router.get("/features/nearest", validate("getNearestFeatures"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({ message: "Validation failed", statusCode: 400, errors: errors.array() });
    }
    const result = await templesController.getNearestFeatures(req);
    res.status(200).json(successResponse({ message: "Nearest features fetched", data: result }));
  } catch (err) {
    logger.error("Error in getNearestFeatures:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/temples/navigation/route:
 *   get:
 *     summary: Compute navigation route between two points or features
 *     tags: [Temples]
 */
router.get("/navigation/route", validate("getRoute"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({ message: "Validation failed", statusCode: 400, errors: errors.array() });
    }
    const result = await templesController.getRoute(req);
    res.status(200).json(successResponse({ message: "Route computed", data: result }));
  } catch (err) {
    logger.error("Error in getRoute:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
