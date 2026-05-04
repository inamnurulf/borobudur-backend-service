const express = require("express");
const router = express.Router();

const templesRoutes = require("./temples.routes");
const pointOfInterestRoutes = require("./point-of-interest.routes");


router.use("/temples", templesRoutes);
router.use("/point-of-interest", pointOfInterestRoutes);

module.exports = router;
