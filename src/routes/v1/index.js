const express = require("express");
const router = express.Router();
const coordinateRoutes = require("./coordinate.routes");
const authRoutes = require("./auth.routes");
const nodesRoutes = require("./nodes.routes");

router.use("/coordinate", coordinateRoutes);
router.use("/auth", authRoutes);
router.use("/nodes", nodesRoutes);

module.exports = router;
