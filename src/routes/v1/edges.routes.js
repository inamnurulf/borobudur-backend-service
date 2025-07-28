const express = require("express");
const router = express.Router();
const edgesController = require("../../controllers/v1/edges.controller");
const { validate } = require("../../validator/edges");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const authenticate = require("../../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Edges
 *   description: Road segments (edges) management
 */

/**
 * @swagger
 * /v1/edges/path:
 *   get:
 *     summary: Compute shortest path between two nodes
 *     tags: [Edges]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: integer
 *         required: true
 *       - in: query
 *         name: target
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Sequence of edges forming the shortest path
 */
router.get("/path", authenticate, async (req, res) => {
  try {
    const { source, target } = req.query;
    const result = await edgesController.getShortestPath({ source, target, user: req.user });
    res.status(200).json(successResponse({ message: "Shortest path computed", data: result }));
  } catch (err) {
    logger.error("Error in getShortestPath:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/edges:
 *   get:
 *     summary: Get all edges
 *     tags: [Edges]
 *     responses:
 *       200:
 *         description: List of all edges
 */
router.get("/", async (req, res) => {
  try {
    const result = await edgesController.getAllEdges(req);
    res.status(200).json(successResponse({ message: "Edges fetched", data: result }));
  } catch (err) {
    logger.error("Error in getAllEdges:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/edges/{id}:
 *   get:
 *     summary: Get edge by ID
 *     tags: [Edges]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Edge detail
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await edgesController.getEdgeById(req);
    res.status(200).json(successResponse({ message: "Edge detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getEdgeById:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/edges:
 *   post:
 *     summary: Create a new edge
 *     tags: [Edges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source
 *               - target
 *               - cost
 *               - geom
 *             properties:
 *               source:
 *                 type: integer
 *               target:
 *                 type: integer
 *               cost:
 *                 type: number
 *               geom:
 *                 type: object
 *                 description: GeoJSON LineString
 *     responses:
 *       201:
 *         description: Edge created successfully
 */
router.post("/", validate("createEdge"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await edgesController.createEdge(req);
    res.status(201).json(successResponse({ message: "Edge created", data: result }));
  } catch (err) {
    logger.error("Error in createEdge:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/edges/{id}:
 *   put:
 *     summary: Update an edge
 *     tags: [Edges]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: integer
 *               target:
 *                 type: integer
 *               cost:
 *                 type: number
 *               geom:
 *                 type: object
 *                 description: GeoJSON LineString
 *     responses:
 *       200:
 *         description: Edge updated
 */
router.put("/:id", authenticate, validate("updateEdge"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await edgesController.updateEdge(req);
    res.status(200).json(successResponse({ message: "Edge updated", data: result }));
  } catch (err) {
    logger.error("Error in updateEdge:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/edges/{id}:
 *   delete:
 *     summary: Delete an edge
 *     tags: [Edges]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Edge deleted
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const result = await edgesController.deleteEdge(req);
    res.status(200).json(successResponse({ message: "Edge deleted", data: result }));
  } catch (err) {
    logger.error("Error in deleteEdge:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
