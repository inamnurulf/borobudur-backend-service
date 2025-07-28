const express = require("express");
const router = express.Router();
const coordinateRoutes = require("./coordinate.routes");
const authRoutes = require("./auth.routes");
const nodesRoutes = require("./nodes.routes");
const edgesRoutes = require("./edges.routes");

router.use("/coordinate", coordinateRoutes);
router.use("/auth", authRoutes);
router.use("/nodes", nodesRoutes);
router.use("/edges", edgesRoutes);

module.exports = router;
