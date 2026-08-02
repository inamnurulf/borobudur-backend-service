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
    req.user = decoded;
    next();
  } catch (err) {
    logger.error("Token verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const publicPaths = [
  { method: "GET", path: /^\/api\/example/ },
  { method: "GET", path: /^\/api-docs/ },
  { method: "POST", path: /^\/v1\/auth\/register$/ },
  { method: "POST", path: /^\/v1\/auth\/login$/ },
  { method: "POST", path: /^\/v1\/auth\/refresh-token$/ },
  { method: "POST", path: /^\/v1\/auth\/forgot-password$/ },
  { method: "POST", path: /^\/v1\/auth\/verify-email$/ },
  { method: "POST", path: /^\/v1\/auth\/resend-verification$/ },
  { method: "POST", path: /^\/v1\/auth\/reset-password$/ },
  { method: "POST", path: /^\/v1\/provider\/google$/ },
  { method: "GET", path: /^\/v1\/nodes\/?$/ },
  { method: "GET", path: /^\/v1\/edges\/?$/ },
  { method: "GET", path: /^\/v1\/temples/ },
  { method: "GET", path: /^\/v2\/temples(?!\/floor-correction)/ },
  { method: "GET", path: /^\/v1\/point-of-interest\/?$/ },
  { method: "GET", path: /^\/v1\/point-of-interest\/nearby$/ },
  { method: "GET", path: /^\/v2\/point-of-interest\/nearby$/ },
  { method: "GET", path: /^\/v1\/articles\/?$/ },
  { method: "GET", path: /^\/v1\/articles\/slug\// },
  { method: "GET", path: /^\/v1\/news\/?$/ },
  { method: "GET", path: /^\/v1\/news\/slug\// },
  { method: "GET", path: /^\/v1\/events\/?$/ },
  { method: "GET", path: /^\/v1\/events\/slug\// },
  { method: "PATCH", path: /^\/v1\/(articles|news|events)\/\d+\/views$/ },
];

const conditionalAuth = (req, res, next) => {
  const isPublic = publicPaths.some(
    ({ method, path }) =>
      req.method === method && path.test(req.originalUrl || req.url)
  );

  if (isPublic) {
    return next();
  }

  return authenticate(req, res, next);
};

module.exports = { authenticate, conditionalAuth };
