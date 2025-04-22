const express = require("express");
const router = express.Router();
const coordinateRoutes = require("./coordinate.routes");
const authRoutes = require("./auth.routes");

router.use("/coordinate", coordinateRoutes);
router.use("/auth", authRoutes);

module.exports = router;
