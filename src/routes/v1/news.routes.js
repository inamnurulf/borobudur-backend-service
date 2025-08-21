const express = require("express");
const router = express.Router();
const newsController = require("../../controllers/v1/news.controller");
const { validate } = require("../../validator/news");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const authenticate = require("../../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: News
 *   description: News management
 */

/**
 * @swagger
 * /v1/news:
 *   get:
 *     summary: Get all news
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by status
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author
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
 *         description: List of all news
 */
router.get("/", async (req, res) => {
  try {
    const result = await newsController.getAllNews(req);
    res.status(200).json(successResponse({ message: "News fetched", data: result }));
  } catch (err) {
    logger.error("Error in getAllNews:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/news/slug/{slug}:
 *   get:
 *     summary: Get news by slug
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: News detail
 */
router.get("/slug/:slug", async (req, res) => {
  try {
    const result = await newsController.getNewsBySlug(req);
    res.status(200).json(successResponse({ message: "News detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getNewsBySlug:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/news/{id}:
 *   get:
 *     summary: Get news by ID
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: News detail
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await newsController.getNewsById(req);
    res.status(200).json(successResponse({ message: "News detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getNewsById:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/news:
 *   post:
 *     summary: Create a new news
 *     tags: [News]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - publication_date
 *               - author
 *               - status
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               content:
 *                 type: string
 *               publication_date:
 *                 type: string
 *                 format: date
 *               image_url:
 *                 type: string
 *                 maxLength: 255
 *               thumbnail_image_url:
 *                 type: string
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 maxLength: 255
 *               author:
 *                 type: string
 *                 maxLength: 100
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               seo_metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: News created successfully
 */
router.post("/", authenticate, validate("createNews"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await newsController.createNews(req);
    res.status(201).json(successResponse({ message: "News created", data: result }));
  } catch (err) {
    logger.error("Error in createNews:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/news/{id}:
 *   put:
 *     summary: Update a news
 *     tags: [News]
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
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               content:
 *                 type: string
 *               publication_date:
 *                 type: string
 *                 format: date
 *               image_url:
 *                 type: string
 *                 maxLength: 255
 *               thumbnail_image_url:
 *                 type: string
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 maxLength: 255
 *               author:
 *                 type: string
 *                 maxLength: 100
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               seo_metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: News updated
 */
router.put("/:id", authenticate, validate("updateNews"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }

    const result = await newsController.updateNews(req);
    res.status(200).json(successResponse({ message: "News updated", data: result }));
  } catch (err) {
    logger.error("Error in updateNews:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/news/{id}/views:
 *   patch:
 *     summary: Increment news views
 *     tags: [News]
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
    const result = await newsController.incrementViews(req);
    res.status(200).json(successResponse({ message: "Views incremented", data: result }));
  } catch (err) {
    logger.error("Error in incrementViews:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/news/{id}:
 *   delete:
 *     summary: Delete a news
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: News deleted
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const result = await newsController.deleteNews(req);
    res.status(200).json(successResponse({ message: "News deleted", data: result }));
  } catch (err) {
    logger.error("Error in deleteNews:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;