const { body } = require("express-validator");

exports.validate = (method) => {
  switch (method) {
    case "createArticle": {
      return [
        body("title")
          .exists().withMessage("Title is required")
          .bail()
          .isString().withMessage("Title must be a string")
          .trim()
          .isLength({ min: 1, max: 255 }).withMessage("Title must be between 1 and 255 characters"),

        body("content")
          .exists().withMessage("Content is required")
          .bail()
          .isString().withMessage("Content must be a string")
          .trim()
          .isLength({ min: 1 }).withMessage("Content cannot be empty"),

        body("publication_date")
          .exists().withMessage("Publication date is required")
          .bail()
          .isISO8601().withMessage("Publication date must be a valid ISO 8601 date (YYYY-MM-DD)")
          .toDate(),

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

        body("author")
          .exists().withMessage("Author is required")
          .bail()
          .isString().withMessage("Author must be a string")
          .trim()
          .isLength({ min: 1, max: 100 }).withMessage("Author must be between 1 and 100 characters"),

        body("status")
          .exists().withMessage("Status is required")
          .bail()
          .isIn(["draft", "published", "archived"]).withMessage("Status must be one of: draft, published, archived"),

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

    case "updateArticle": {
      return [
        body("title")
          .optional()
          .isString().withMessage("Title must be a string")
          .trim()
          .isLength({ min: 1, max: 255 }).withMessage("Title must be between 1 and 255 characters"),

        body("content")
          .optional()
          .isString().withMessage("Content must be a string")
          .trim()
          .isLength({ min: 1 }).withMessage("Content cannot be empty"),

        body("publication_date")
          .optional()
          .isISO8601().withMessage("Publication date must be a valid ISO 8601 date (YYYY-MM-DD)")
          .toDate(),

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

        body("author")
          .optional()
          .isString().withMessage("Author must be a string")
          .trim()
          .isLength({ min: 1, max: 100 }).withMessage("Author must be between 1 and 100 characters"),

        body("status")
          .optional()
          .isIn(["draft", "published", "archived"]).withMessage("Status must be one of: draft, published, archived"),

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
