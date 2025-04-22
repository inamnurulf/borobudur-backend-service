const express = require("express");
const router = express.Router();
const coordinateRoutes = require("./coordinate.routes");

router.use("/coordinate", coordinateRoutes);

module.exports = router;
