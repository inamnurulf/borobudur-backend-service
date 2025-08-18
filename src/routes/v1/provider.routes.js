const express = require("express");
const router = express.Router();
const providerController = require("../../controllers/v1/provider.controller");
const { validationResult } = require("express-validator");
const { successResponse, failedResponse } = require("../../helpers/response");
const logger = require("../../config/logger");
const CustomError = require("../../helpers/customError");


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
