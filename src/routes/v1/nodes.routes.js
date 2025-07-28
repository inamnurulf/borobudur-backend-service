const express = require("express");
const router = express.Router();
const nodesController = require("../../controllers/v1/nodes.controller");
const { validate } = require("../../validator/nodes");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const authenticate = require("../../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Nodes
 *   description: Nodes (POI and intersections) management
 */

/**
 * @swagger
 * /v1/nodes:
 *   get:
 *     summary: Get all nodes
 *     tags: [Nodes]
 *     responses:
 *       200:
 *         description: List of all nodes
 */
router.get("/", async (req, res) => {
  try {
    const result = await nodesController.getAllNodes(req);
    res.status(200).json(successResponse({ message: "Nodes fetched", data: result }));
  } catch (err) {
    logger.error("Error in getAllNodes:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/nodes/{id}:
 *   get:
 *     summary: Get node by ID
 *     tags: [Nodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Node detail
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await nodesController.getNodeById(req);
    res.status(200).json(successResponse({ message: "Node detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getNodeById:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/nodes:
 *   post:
 *     summary: Create a new node
 *     tags: [Nodes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - longitude
 *               - latitude
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 description: poi or intersection
 *               longitude:
 *                 type: number
 *               latitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Node created successfully
 */
router.post("/",  validate("createNode"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await nodesController.createNode(req);
    res.status(201).json(successResponse({ message: "Node created", data: result }));
  } catch (err) {
    logger.error("Error in createNode:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/nodes/{id}:
 *   put:
 *     summary: Update a node
 *     tags: [Nodes]
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
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               longitude:
 *                 type: number
 *               latitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Node updated
 */
router.put("/:id", authenticate, validate("updateNode"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await nodesController.updateNode(req);
    res.status(200).json(successResponse({ message: "Node updated", data: result }));
  } catch (err) {
    logger.error("Error in updateNode:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/nodes/{id}:
 *   delete:
 *     summary: Delete a node
 *     tags: [Nodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Node deleted
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const result = await nodesController.deleteNode(req);
    res.status(200).json(successResponse({ message: "Node deleted", data: result }));
  } catch (err) {
    logger.error("Error in deleteNode:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
