const express = require("express");
const router = express.Router();
const {
    testController
} = require("../controllers/example.controller");

/**
 * @swagger
 * /api/example/:
 *   get:
 *     summary: Example route
 *     description: Returns a response from the test controller.
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Internal server error
 */
router.get("/", testController);

module.exports = router;