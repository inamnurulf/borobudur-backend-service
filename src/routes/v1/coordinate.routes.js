const express = require("express");
const router = express.Router();
const { sendMessage } = require("../../controllers/v1/coordinate.controller");
const { validate } = require("../../validator/coordinate");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const coordinateController = require("../../controllers/v1/coordinate.controller");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");

/**
 * @swagger
 * /v1/coordinate/:
 *   post:
 *     summary: Send coordinates data
 *     description: This route accepts a client's coordinates and sends them to a controller.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               client_id:
 *                 type: string
 *                 description: The unique identifier for the client.
 *               latitude:
 *                 type: string
 *                 description: The latitude of the client's location.
 *               longitude:
 *                 type: string
 *                 description: The longitude of the client's location.
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request - missing or invalid parameters
 *       500:
 *         description: Internal server error
 */
router.post("/", validate("send-coordinate"), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError({
        message: "Validation failed",
        statusCode: 400,
        errors: errors.array(),
      });
    }
    const result = await coordinateController.sendCoordinate(req);
    res
      .status(200)
      .json(successResponse({ message: "Article updated", data: result }));
  } catch (err) {
    logger.error("Error in sendingCoordinate:", err);
    await failedResponse({ res, req, errors: err });
  }
});

module.exports = router;
