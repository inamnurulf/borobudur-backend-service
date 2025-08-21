const express = require("express");
const router = express.Router();
const eventsController = require("../../controllers/v1/events.controller");
const { validate } = require("../../validator/events");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const authenticate = require("../../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Events management
 */

/**
 * @swagger
 * /v1/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, in_progress, completed, canceled]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events starting from this date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events ending before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of all events
 */
router.get("/", async (req, res) => {
  try {
    const result = await eventsController.getAllEvents(req);
    res.status(200).json(successResponse({ message: "Events fetched", data: result }));
  } catch (err) {
    logger.error("Error in getAllEvents:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/events/slug/{slug}:
 *   get:
 *     summary: Get event by slug
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event detail
 */
router.get("/slug/:slug", async (req, res) => {
  try {
    const result = await eventsController.getEventBySlug(req);
    res.status(200).json(successResponse({ message: "Event detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getEventBySlug:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event detail
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await eventsController.getEventById(req);
    res.status(200).json(successResponse({ message: "Event detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getEventById:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - type
 *               - start_date
 *               - location
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 maxLength: 50
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *                 maxLength: 255
 *               image_url:
 *                 type: string
 *                 maxLength: 255
 *               thumbnail_image_url:
 *                 type: string
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 maxLength: 255
 *               status:
 *                 type: string
 *                 enum: [upcoming, in_progress, completed, canceled]
 *               seo_metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Event created successfully
 */
router.post("/", authenticate, validate("createEvent"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await eventsController.createEvent(req);
    res.status(201).json(successResponse({ message: "Event created", data: result }));
  } catch (err) {
    logger.error("Error in createEvent:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
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
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 maxLength: 50
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *                 maxLength: 255
 *               image_url:
 *                 type: string
 *                 maxLength: 255
 *               thumbnail_image_url:
 *                 type: string
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 maxLength: 255
 *               status:
 *                 type: string
 *                 enum: [upcoming, in_progress, completed, canceled]
 *               seo_metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event updated
 */
router.put("/:id", authenticate, validate("updateEvent"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await eventsController.updateEvent(req);
    res.status(200).json(successResponse({ message: "Event updated", data: result }));
  } catch (err) {
    logger.error("Error in updateEvent:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/events/{id}/views:
 *   patch:
 *     summary: Increment event views
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Views incremented
 */
router.patch("/:id/views", async (req, res) => {
  try {
    const result = await eventsController.incrementViews(req);
    res.status(200).json(successResponse({ message: "Views incremented", data: result }));
  } catch (err) {
    logger.error("Error in incrementViews:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event deleted
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const result = await eventsController.deleteEvent(req);
    res.status(200).json(successResponse({ message: "Event deleted", data: result }));
  } catch (err) {
    logger.error("Error in deleteEvent:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;