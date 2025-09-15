const express = require("express");
const router = express.Router();

const articlesController = require("../../controllers/v1/articles.controller");
const { validate } = require("../../validator/articles");
const { validationResult } = require("express-validator");

const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const authenticate = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/multer.middleware");

/**
 * @swagger
 * tags:
 *   name: Articles
 *   description: Articles management
 */

/**
 * @swagger
 * /v1/articles:
 *   get:
 *     summary: Get all articles
 *     tags: [Articles]
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
 *         description: Filter by author (ILIKE)
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Publication date from (inclusive)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Publication date to (inclusive)
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search in title and content (ILIKE)
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
 *         description: List of all articles
 */
router.get("/", async (req, res) => {
  try {
    const result = await articlesController.getAllArticles(req);
    res
      .status(200)
      .json(successResponse({ message: "Articles fetched", data: result }));
  } catch (err) {
    logger.error("Error in getAllArticles:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/articles/slug/{slug}:
 *   get:
 *     summary: Get article by slug
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: include_draft
 *         schema:
 *           type: boolean
 *         description: If true, allow returning draft
 *     responses:
 *       200:
 *         description: Article detail
 */
router.get("/slug/:slug", async (req, res) => {
  try {
    const result = await articlesController.getArticleBySlug(req);
    res
      .status(200)
      .json(successResponse({ message: "Article detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getArticleBySlug:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Article detail
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await articlesController.getArticleById(req);
    res
      .status(200)
      .json(successResponse({ message: "Article detail fetched", data: result }));
  } catch (err) {
    logger.error("Error in getArticleById:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/articles:
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - publication_date
 *               - author
 *               - status
 *             properties:
 *               headerImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional image to upload (main image); thumbnail auto-generated
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
 *                 additionalProperties: true
 *     responses:
 *       201:
 *         description: Article created successfully
 */
router.post(
  "/",
  authenticate,
  ...upload.uploadSingle("headerImage"),
  validate("createArticle"),
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

      const result = await articlesController.createArticle(req);
      res
        .status(201)
        .json(successResponse({ message: "Article created", data: result }));
    } catch (err) {
      logger.error("Error in createArticle:", err);
      await failedResponse({ res, req, errors: err });
    }
  }
);

/**
 * @swagger
 * /v1/articles/{id}:
 *   put:
 *     summary: Update an article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               headerImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional new image; will overwrite existing and regenerate thumbnail
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
 *         description: Article updated
 */
router.put(
  "/:id",
  authenticate,
  ...upload.uploadSingle("headerImage"),
  validate("updateArticle"),
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

      const result = await articlesController.updateArticle(req);
      res
        .status(200)
        .json(successResponse({ message: "Article updated", data: result }));
    } catch (err) {
      logger.error("Error in updateArticle:", err);
      await failedResponse({ res, req, errors: err });
    }
  }
);

/**
 * @swagger
 * /v1/articles/{id}/views:
 *   patch:
 *     summary: Increment article views
 *     tags: [Articles]
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
    const result = await articlesController.incrementViews(req);
    res
      .status(200)
      .json(successResponse({ message: "Views incremented", data: result }));
  } catch (err) {
    logger.error("Error in incrementViews:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/articles/{id}:
 *   delete:
 *     summary: Delete an article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Article deleted
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const result = await articlesController.deleteArticle(req);
    res
      .status(200)
      .json(successResponse({ message: "Article deleted", data: result }));
  } catch (err) {
    logger.error("Error in deleteArticle:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
