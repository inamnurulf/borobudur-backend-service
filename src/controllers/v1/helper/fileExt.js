const path = require("path");

/**
 * Map common image MIME types to file extensions.
 */
function mimeToExt(mime = "") {
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
  };
  return map[mime.toLowerCase()] || "";
}

/**
 * Resolve the safest file extension.
 * Prefer MIME, fallback to original filename extension.
 */
function resolveExt(originalName = "", mime = "") {
  const fromMime = mimeToExt(mime);
  if (fromMime) return fromMime;

  const fromName = path.extname(originalName);
  return fromName ? fromName.toLowerCase() : "";
}

module.exports = {
  mimeToExt,
  resolveExt,
};
