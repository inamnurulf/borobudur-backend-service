const { body } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    case "createEvent": {
      return [
        body("name")
          .exists().withMessage("Name is required")
          .bail()
          .isString().withMessage("Name must be a string")
          .trim()
          .isLength({ min: 1, max: 255 }).withMessage("Name must be between 1 and 255 characters"),

        body("description")
          .exists().withMessage("Description is required")
          .bail()
          .isString().withMessage("Description must be a string")
          .trim()
          .isLength({ min: 1 }).withMessage("Description cannot be empty"),

        body("type")
          .exists().withMessage("Type is required")
          .bail()
          .isString().withMessage("Type must be a string")
          .trim()
          .isLength({ min: 1, max: 50 }).withMessage("Type must be between 1 and 50 characters"),

        body("start_date")
          .exists().withMessage("Start date is required")
          .bail()
          .isISO8601().withMessage("Start date must be a valid ISO 8601 datetime (YYYY-MM-DDTHH:mm:ss.sssZ)")
          .toDate(),

        body("end_date")
          .optional()
          .isISO8601().withMessage("End date must be a valid ISO 8601 datetime (YYYY-MM-DDTHH:mm:ss.sssZ)")
          .toDate()
          .custom((value, { req }) => {
            if (value && req.body.start_date) {
              const startDate = new Date(req.body.start_date);
              const endDate = new Date(value);
              if (endDate <= startDate) {
                throw new Error("End date must be after start date");
              }
            }
            return true;
          }),

        body("location")
          .exists().withMessage("Location is required")
          .bail()
          .isString().withMessage("Location must be a string")
          .trim()
          .isLength({ min: 1, max: 255 }).withMessage("Location must be between 1 and 255 characters"),

        body("image_url")
          .optional()
          .isString().withMessage("Image URL must be a string")
          .trim()
          .isLength({ max: 255 }).withMessage("Image URL must not exceed 255 characters")
          .isURL().withMessage("Image URL must be a valid URL"),

        body("thumbnail_image_url")
          .optional()
          .isString().withMessage("Thumbnail image URL must be a string")
          .trim()
          .isLength({ max: 255 }).withMessage("Thumbnail image URL must not exceed 255 characters")
          .isURL().withMessage("Thumbnail image URL must be a valid URL"),

        body("slug")
          .optional()
          .isString().withMessage("Slug must be a string")
          .trim()
          .isLength({ max: 255 }).withMessage("Slug must not exceed 255 characters")
          .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),

        body("status")
          .exists().withMessage("Status is required")
          .bail()
          .isIn(["upcoming", "in_progress", "completed", "canceled"]).withMessage("Status must be one of: upcoming, in_progress, completed, canceled"),

        body("seo_metadata")
          .optional()
          .isObject().withMessage("SEO metadata must be an object"),

        body("seo_metadata.title")
          .optional()
          .isString().withMessage("SEO title must be a string")
          .trim()
          .isLength({ max: 60 }).withMessage("SEO title should not exceed 60 characters"),

        body("seo_metadata.description")
          .optional()
          .isString().withMessage("SEO description must be a string")
          .trim()
          .isLength({ max: 160 }).withMessage("SEO description should not exceed 160 characters"),

        body("seo_metadata.keywords")
          .optional()
          .isArray().withMessage("SEO keywords must be an array"),

        body("seo_metadata.keywords.*")
          .optional()
          .isString().withMessage("Each SEO keyword must be a string")
          .trim(),
      ];
    }

    case "updateEvent": {
      return [
        // Optional, but if provided must be valid
        body("name")
          .optional()
          .isString().withMessage("Name must be a string")
          .trim()
          .isLength({ min: 1, max: 255 }).withMessage("Name must be between 1 and 255 characters"),

        body("description")
          .optional()
          .isString().withMessage("Description must be a string")
          .trim()
          .isLength({ min: 1 }).withMessage("Description cannot be empty"),

        body("type")
          .optional()
          .isString().withMessage("Type must be a string")
          .trim()
          .isLength({ min: 1, max: 50 }).withMessage("Type must be between 1 and 50 characters"),

        body("start_date")
          .optional()
          .isISO8601().withMessage("Start date must be a valid ISO 8601 datetime (YYYY-MM-DDTHH:mm:ss.sssZ)")
          .toDate(),

        body("end_date")
          .optional()
          .isISO8601().withMessage("End date must be a valid ISO 8601 datetime (YYYY-MM-DDTHH:mm:ss.sssZ)")
          .toDate()
          .custom((value, { req }) => {
            if (value && req.body.start_date) {
              const startDate = new Date(req.body.start_date);
              const endDate = new Date(value);
              if (endDate <= startDate) {
                throw new Error("End date must be after start date");
              }
            }
            return true;
          }),

        body("location")
          .optional()
          .isString().withMessage("Location must be a string")
          .trim()
          .isLength({ min: 1, max: 255 }).withMessage("Location must be between 1 and 255 characters"),

        body("image_url")
          .optional()
          .isString().withMessage("Image URL must be a string")
          .trim()
          .isLength({ max: 255 }).withMessage("Image URL must not exceed 255 characters")
          .isURL().withMessage("Image URL must be a valid URL"),

        body("thumbnail_image_url")
          .optional()
          .isString().withMessage("Thumbnail image URL must be a string")
          .trim()
          .isLength({ max: 255 }).withMessage("Thumbnail image URL must not exceed 255 characters")
          .isURL().withMessage("Thumbnail image URL must be a valid URL"),

        body("slug")
          .optional()
          .isString().withMessage("Slug must be a string")
          .trim()
          .isLength({ max: 255 }).withMessage("Slug must not exceed 255 characters")
          .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),

        body("status")
          .optional()
          .isIn(["upcoming", "in_progress", "completed", "canceled"]).withMessage("Status must be one of: upcoming, in_progress, completed, canceled"),

        body("seo_metadata")
          .optional()
          .isObject().withMessage("SEO metadata must be an object"),

        body("seo_metadata.title")
          .optional()
          .isString().withMessage("SEO title must be a string")
          .trim()
          .isLength({ max: 60 }).withMessage("SEO title should not exceed 60 characters"),

        body("seo_metadata.description")
          .optional()
          .isString().withMessage("SEO description must be a string")
          .trim()
          .isLength({ max: 160 }).withMessage("SEO description should not exceed 160 characters"),

        body("seo_metadata.keywords")
          .optional()
          .isArray().withMessage("SEO keywords must be an array"),

        body("seo_metadata.keywords.*")
          .optional()
          .isString().withMessage("Each SEO keyword must be a string")
          .trim(),
      ];
    }

    default:
      return [];
  }
};