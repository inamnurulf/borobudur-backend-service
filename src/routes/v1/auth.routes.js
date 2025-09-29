const express = require("express");
const router = express.Router();
const authController = require("../../controllers/v1/auth.controller");
const { validate } = require("../../validator/auth");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");
const authenticate = require("../../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post("/register", validate("register"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await authController.register(req, res);
    res
      .status(201)
      .json(successResponse({ message: result.message, data: result.user }));
  } catch (err) {
    console.log("Error in register:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Login and get tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens returned
 */
router.post("/login", validate("login"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await authController.login(req, res);
    res
      .status(201)
      .json(successResponse({ message: "Login Success", data: result }));
  } catch (err) {
    logger.error("Error in login:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens returned
 */
router.post("/refresh-token", validate("refreshToken"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await authController.refreshToken(req, res);
    res
      .status(201)
      .json(successResponse({ message: "Token refreshed", data: result }));
  } catch (err) {
    logger.error("Error in refreshToken:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", authenticate, validate("logout"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await authController.logout(req, res);
    res.status(201).json(successResponse({ message: result.message }));
  } catch (err) {
    logger.error("Error in logout:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/auth/me:
 *   get:
 *     summary: Get current logged in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await authController.getCurrentUser(req, res);
    res
      .status(201)
      .json(successResponse({ message: result.message, data: result.user }));
  } catch (err) {
    logger.error("Error in getCurrentUser:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/auth/forgot-password:
 *   post:
 *     summary: Send a password reset code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code sent
 */
router.post(
  "/forgot-password",
  validate("forgot-password"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        throw new CustomError({
          message: "Validation failed",
          statusCode: 400,
          errors: errors.array(),
        });
      const result = await authController.forgotPassword(req, res);
      res.status(201).json(successResponse({ message: result.message }));
    } catch (err) {
      logger.error("Error in forgotPassword:", err);
      await failedResponse({ res, req, errors: err });
    }
  }
);

/**
 * @swagger
 * /v1/auth/verify-code:
 *   post:
 *     summary: Verify the email code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code verified successfully
 */
router.post("/verify-email", validate("verify-email"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await authController.verifyEmail(req);
    res
      .status(201)
      .json(successResponse({ message: result.message, data: result.user }));
  } catch (err) {
    logger.error("Error in verifyCode:", err);
    await failedResponse({ res, req, errors: err });
  }
});

/**
 * @swagger
 * /v1/auth/resend-verification:
 *   post:
 *     summary: Resend the email verification code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code resent successfully
 */
router.post(
  "/resend-verification",
  validate("resend-verification"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        throw new CustomError({
          message: "Validation failed",
          statusCode: 400,
          errors: errors.array(),
        });

      const result = await authController.resendVerification(req);

      res.status(200).json(
        successResponse({
          message: result.message,
          data: result.data,
        })
      );
    } catch (err) {
      logger.error("Error in resendVerification:", err);
      await failedResponse({ res, req, errors: err });
    }
  }
);

/**
 * @swagger
 * /v1/auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password has been reset
 */
router.post("/reset-password", validate("reset-password"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    const result = await authController.resetPassword(req, res);
    res
      .status(201)
      .json(successResponse({ message: result.message, data: result.user }));
  } catch (err) {
    logger.error("Error in resetPassword:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
