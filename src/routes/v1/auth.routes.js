const express = require("express");
const router = express.Router();
const authController = require("../../controllers/v1/auth.controller");
const { validate } = require("../../validator/auth");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");

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
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
  try {
    const result = await authController.register(req.body);
    res.status(201).json(successResponse({ message: result.message }));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
  try {
    const result = await authController.login(req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
  try {
    const result = await authController.refreshToken(req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
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
router.post("/logout", validate("refreshToken"), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
  try {
    const result = await authController.logout(req.body);
    res.status(200).json(successResponse({ message: result.message }));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
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
router.get("/me", async (req, res) => {
  try {
    const result = await authController.getCurrentUser(req.user);
    res.status(200).json(successResponse(result));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
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
router.post("/forgot-password", validate("forgotPassword"), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
  try {
    const result = await authController.forgotPassword(req.body);
    res.status(200).json(successResponse({ message: result.message }));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
  }
});

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
router.post("/verify-code", validate("verifyCode"), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
  try {
    const result = await authController.verifyCode(req.body);
    res.status(200).json(successResponse({ message: result.message }));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
  }
});

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
router.post("/reset-password", validate("resetPassword"), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
  try {
    const result = await authController.resetPassword(req.body);
    res.status(200).json(successResponse({ message: result.message }));
  } catch (err) {
    res.status(500).json(failedResponse({ message: err.message }));
  }
});

module.exports = router;
