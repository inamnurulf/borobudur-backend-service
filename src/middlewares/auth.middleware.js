const jwt = require("jsonwebtoken");
const logger = require("../config/logger");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains id, email, name, role
    next();
  } catch (err) {
    logger.error("Token verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
