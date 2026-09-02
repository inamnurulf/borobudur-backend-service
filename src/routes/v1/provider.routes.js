const express = require("express");
const router = express.Router();
const providerController = require("../../controllers/v1/provider.controller");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");

/**
 * @swagger
 * tags:
 *   name: Provider
 *   description: Third-party authentication providers
 */

/**
 * @swagger
 * /v1/provider/google:
 *   post:
 *     summary: Login or register via Google OAuth2
 *     tags: [Provider]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - redirect_uri
 *             properties:
 *               code:
 *                 type: string
 *                 description: Google authorization code
 *               redirect_uri:
 *                 type: string
 *                 description: Redirect URI used by the client (sent via body)
 *     responses:
 *       200:
 *         description: Google login successful (user data + tokens)
 */
router.post("/google", async (req, res) => {
  try {
    const errors = validationResult(req); 
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await providerController.googleLogin(req); 
    res
      .status(200)
      .json(successResponse({ message: "Google login successful", data: result }));
  } catch (err) {
    logger.error("Error in googleLogin:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
