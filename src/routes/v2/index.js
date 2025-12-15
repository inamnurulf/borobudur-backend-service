const express = require("express");
const router = express.Router();

const templesRoutes = require("./temples.routes");


router.use("/temples", templesRoutes);

module.exports = router;
