const express = require("express");
const router = express.Router();
const coordinateRoutes = require("./coordinate.routes");
const authRoutes = require("./auth.routes");
const nodesRoutes = require("./nodes.routes");
const edgesRoutes = require("./edges.routes");
const pointOfInterestRoutes = require("./point-of-interest.routes");
const providerRoutes = require("./provider.routes");

router.use("/coordinate", coordinateRoutes);
router.use("/auth", authRoutes);
router.use("/nodes", nodesRoutes);
router.use("/edges", edgesRoutes);
router.use("/point-of-interest", pointOfInterestRoutes);
router.use("/provider", providerRoutes);


module.exports = router;
