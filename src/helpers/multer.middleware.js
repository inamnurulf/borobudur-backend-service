const multer = require('multer');
const sharp = require('sharp');
const { fileTypeFromBuffer } = require('file-type');
const slugify = require('slugify');

const { CustomError } = require('../helpers/customError');

/**
 * Sanitize a filename into a safe slug + preserved extension.
 */
function sanitizeFilename(originalName, fallbackExt = '') {
  const lastDot = originalName.lastIndexOf('.');
  const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const ext = lastDot > 0 ? originalName.slice(lastDot + 1) : fallbackExt;
  const safeBase = slugify(base, { lower: true, strict: true, trim: true }) || 'file';
  const safeExt = (ext || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

/**
 * Map Multer errors to friendly API errors.
 */
function mapMulterError(err) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'File too large.' };
  }
  if (err && err.code === 'LIMIT_FILE_COUNT') {
    return { status: 400, message: 'Too many files uploaded.' };
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return { status: 400, message: 'Unexpected file field.' };
  }
  if (err && err.code === 'LIMIT_PART_COUNT') {
    return { status: 400, message: 'Too many parts in multipart form.' };
  }
  if (err && err.code === 'LIMIT_FIELD_KEY') {
    return { status: 400, message: 'A field name is too long.' };
  }
  if (err && err.code === 'LIMIT_FIELD_VALUE') {
    return { status: 400, message: 'A field value is too long.' };
  }
  if (err && err.code === 'LIMIT_FIELD_COUNT') {
    return { status: 400, message: 'Too many non-file fields.' };
  }
  return { status: 400, message: err?.message || 'Upload error.' };
}

/**
 * Create a secure upload middleware set.
 * Returns: { uploadSingle(fieldName), uploadArray(fieldName, maxFiles), errors }
 */
function createSecureUpload({
  // Allowed types (magic byte checked)
  allowImages = true,
  allowPDF = false, // set true only if you really need PDFs
  allowedImageFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'], // magic ext whitelist
  // Size/Count limits
  maxFileSizeMB = 5,
  maxFiles = 1,         // for array uploads
  maxFields = 20,
  maxFieldSizeKB = 64,  // per non-file field
  maxPartCount = 50,
  // Image quality constraints
  imageMinWidth = 1,
  imageMinHeight = 1,
  imageMaxWidth = 6000,
  imageMaxHeight = 6000,
  allowAnimatedGif = false,
  // Misc
  queryToken = true,    // not used here, but useful if you integrate with URL-builder
} = {}) {

  const storage = multer.memoryStorage();

  // Conservative mimetype pre-filter (quick reject); final check happens later with file-type
  const quickMimeWhitelist = new Set([
    ...(allowImages ? ['image/jpeg','image/jpg','image/png','image/webp','image/gif'] : []),
    ...(allowPDF ? ['application/pdf'] : []),
  ]);

  const upload = multer({
    storage,
    limits: {
      fileSize: maxFileSizeMB * 1024 * 1024,
      files: maxFiles,
      fields: maxFields,
      fieldSize: maxFieldSizeKB * 1024,
      parts: maxPartCount,
    },
    fileFilter: (req, file, cb) => {
      // Quick header filter by mimetype (not final)
      if (!quickMimeWhitelist.has(file.mimetype)) {
        return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      }
      cb(null, true);
    },
  });

  /**
   * Post-processor validator (magic bytes + dimensions + animation).
   * Use AFTER upload.single/array.
   */
  const validateUploadedFiles = (fieldName, { array = false } = {}) => {
    return async (req, res, next) => {
      try {
        const files = array ? (req.files || []) : (req.file ? [req.file] : []);

        if (!files.length) {
          return next({ status: 400, message: 'No file uploaded.' });
        }

        for (const file of files) {
          // --- Magic byte detection
          const ft = await fileTypeFromBuffer(file.buffer);
          const ext = (ft?.ext || '').toLowerCase();
          const mime = (ft?.mime || '').toLowerCase();

          // Validate by *true* type
          const isImage = mime.startsWith('image/');
          const isPdf = mime === 'application/pdf';

          if (allowImages && isImage) {
            if (!allowedImageFormats.includes(ext)) {
              return next({ status: 400, message: `Unsupported image format: ${ext}` });
            }
            // Further image checks (dimensions & animation)
            try {
              // animated: sharp can tell pages for GIF when animated:true
              const meta = await sharp(file.buffer, { animated: true }).metadata();

              if (meta.width < imageMinWidth || meta.height < imageMinHeight) {
                return next({ status: 400, message: `Image too small. Min ${imageMinWidth}x${imageMinHeight}px.` });
              }
              if (meta.width > imageMaxWidth || meta.height > imageMaxHeight) {
                return next({ status: 400, message: `Image too large. Max ${imageMaxWidth}x${imageMaxHeight}px.` });
              }

              // Block animated GIF unless allowed
              if (!allowAnimatedGif && ext === 'gif' && typeof meta.pages === 'number' && meta.pages > 1) {
                return next({ status: 400, message: 'Animated GIFs are not allowed.' });
              }
            } catch (e) {
              return next({ status: 400, message: 'Invalid or corrupt image.' });
            }

            // Sanitize filename (keep original extension from magic if available)
            const safeName = sanitizeFilename(file.originalname, ext);
            file.safeOriginalName = safeName; // attach a safe name for later storage

          } else if (allowPDF && isPdf) {
            // PDFs: we only accept correct magic; further validation (malware) should be external (e.g., ClamAV)
            const safeName = sanitizeFilename(file.originalname, 'pdf');
            file.safeOriginalName = safeName;
          } else {
            return next({ status: 400, message: 'Disallowed file type.' });
          }
        }

        next();
      } catch (err) {
        next(err);
      }
    };
  };

  /**
   * Handy wrappers that return [multerMiddleware, validatorMiddleware]
   * You can use these in routes directly.
   */
  function uploadSingle(fieldName) {
    // Note: you still need an error handler to map Multer errors nicely (see below)
    return [upload.single(fieldName), validateUploadedFiles(fieldName)];
  }

  function uploadArray(fieldName, count = maxFiles) {
    return [upload.array(fieldName, count), validateUploadedFiles(fieldName, { array: true })];
  }

  /**
   * Centralized error handler for upload routes.
   * Use this *after* your route handler in the middleware chain.
   */
function errorsToNext() {
    // eslint-disable-next-line no-unused-vars
    return (err, req, res, next) => {
      if (err instanceof multer.MulterError) {
        const { status, message } = mapMulterError(err);
        return next(new CustomError({
          message,
          statusCode: status,
          errors: { code: err.code, field: err.field }
        }));
      }
      // our own validator errors or anything else
      const status = err?.status || 400;
      const message = err?.message || 'Upload validation failed.';
      return next(new CustomError({
        message,
        statusCode: status,
        errors: err
      }));
    };
  }

  return { uploadSingle, uploadArray, errorsToNext };
}

module.exports = { createSecureUpload, sanitizeFilename };
