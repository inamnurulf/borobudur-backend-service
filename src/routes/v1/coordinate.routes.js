const express = require("express");
const router = express.Router();
const { sendMessage } = require("../../controllers/v1/coordinate.controller");
const { validate } = require("../../validator/coordinate");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(failedResponse({ errors: errors.array(), message: "Validation failed" }));
    }
  
    try {
      const { latitude, longitude, client_id } = req.body;
      const result = await sendMessage({ latitude, longitude, client_id });
      res.status(200).json(successResponse({ message: result.message }));
    } catch (err) {
      res.status(500).json(failedResponse({ message: err.message }));
    }
  });
  
module.exports = router;
