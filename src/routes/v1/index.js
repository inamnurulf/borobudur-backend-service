const express = require("express");
const router = express.Router();
const coordinateRoutes = require("./coordinate.routes");
const authRoutes = require("./auth.routes");
const nodesRoutes = require("./nodes.routes");
const edgesRoutes = require("./edges.routes");
const pointOfInterestRoutes = require("./point-of-interest.routes");
const providerRoutes = require("./provider.routes");
const newsRoutes = require("./news.routes");
const eventsRoutes = require("./events.routes");
const templesRoutes = require("./temples.routes");
const articlesRoutes = require("./articles.routes");

router.use("/coordinate", coordinateRoutes);
router.use("/auth", authRoutes);
router.use("/nodes", nodesRoutes);
router.use("/edges", edgesRoutes);
router.use("/point-of-interest", pointOfInterestRoutes);
router.use("/provider", providerRoutes);
router.use("/news", newsRoutes);
router.use("/events", eventsRoutes);
router.use("/temples", templesRoutes);
router.use("/articles", articlesRoutes);

module.exports = router;
