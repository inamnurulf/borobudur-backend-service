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
 * /v2/temples/graph:
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
 * /v2/temples/features:
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
 * /v2/temples/features/nearest:
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
 * /v2/temples/features/nearby-grouped:
 *   get:
 *     summary: Get nearby temple features grouped by floor and zone
 *     tags: [Temples]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lon
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radius
 *         schema: { type: number }
 *       - in: query
 *         name: floor
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Features grouped by detected floor and zone
 */
router.get("/features/nearby-grouped", validate("getNearbyGrouped"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({ message: "Validation failed", statusCode: 400, errors: errors.array() });
    }
    const result = await templesController.getNearbyGrouped(req);
    res.status(200).json(successResponse({ message: "Nearby grouped features fetched", data: result }));
  } catch (err) {
    logger.error("Error in getNearbyGrouped:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v2/temples/navigation/route-3d:
 *   get:
 *     summary: Compute 3D navigation route from a location to a node
 *     tags: [Temples]
 *     parameters:
 *       - in: query
 *         name: fromLat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: fromLon
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: toNodeId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: profile
 *         schema: { type: string, default: walking }
 *     responses:
 *       200:
 *         description: Route as 3D GeoJSON
 */
router.get("/navigation/route-3d", validate("getRoute3d"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({ message: "Validation failed", statusCode: 400, errors: errors.array() });
    }
    const result = await templesController.getRoute3d(req);
    res.status(200).json(successResponse({ message: "Route computed", data: result }));
  } catch (err) {
    logger.error("Error in getRoute3d:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v2/temples/navigation/route:
 *   get:
 *     summary: Compute floor-aware navigation route between two coordinates
 *     tags: [Temples]
 *     parameters:
 *       - in: query
 *         name: fromLat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: fromLon
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: toLat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: toLon
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: profile
 *         schema: { type: string, default: walking }
 *     responses:
 *       200:
 *         description: Route computed (floor-aware)
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

/**
 * @swagger
 * /v2/temples/floor-correction:
 *   post:
 *     summary: Correct the detected floor from a location and altitude
 *     tags: [Temples]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - longitude
 *               - latitude
 *               - altitude
 *             properties:
 *               longitude:
 *                 type: number
 *               latitude:
 *                 type: number
 *               altitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Floor correction computed
 */
router.post("/floor-correction", validate("correctFloor"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({ message: "Validation failed", statusCode: 400, errors: errors.array() });
    }
    const result = await templesController.correctFloor(req);
    res.status(200).json(successResponse({ message: "Floor correction computed", data: result }));
  } catch (err) {
    logger.error("Error in correctFloor:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
