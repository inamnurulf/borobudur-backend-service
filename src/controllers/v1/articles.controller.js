const articlesRepository = require("../../repositories/articles.repository");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");
const imageService = require("../../services/image_services");
const { resolveExt } = require("./helper/fileExt");

class ArticlesController {
  /**
   * Get all articles
   */
  async getAllArticles(req) {
    const { status, author, date_from, date_to, q, page, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (author) filters.author = author;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (q) filters.q = q;

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    const result = await withTransaction(async (client) => {
      return await articlesRepository.findAll(filters, pagination, client);
    });

    return result;
  }

  /**
   * Get article by slug
   * Query: ?include_draft=true to allow drafts
   */
  async getArticleBySlug(req) {
    const { slug } = req.params;
    const { include_draft } = req.query;

    if (!slug) {
      throw new CustomError({
        message: "Article slug is required",
        statusCode: 400,
      });
    }

    const article = await withTransaction(async (client) => {
      const data = await articlesRepository.findBySlug(
        slug,
        { includeDraft: String(include_draft).toLowerCase() === "true" },
        client
      );
      if (!data) {
        throw new CustomError({
          message: "Article not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return article;
  }

  /**
   * Get article by ID
   */
  async getArticleById(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Article ID is required",
        statusCode: 400,
      });
    }

    const article = await withTransaction(async (client) => {
      const data = await articlesRepository.findById(id, client);
      if (!data) {
        throw new CustomError({
          message: "Article not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return article;
  }

  /**
   * Create a new article (supports single image upload + thumbnail)
   */
  async createArticle(req) {
    let {
      title,
      content,
      publication_date,
      image_url,
      thumbnail_image_url,
      slug,
      author,
      status,
      seo_metadata,
    } = req.body;

    if (!title || !content || !publication_date || !author || !status) {
      throw new CustomError({
        message:
          "title, content, publication_date, author, and status are required",
        statusCode: 400,
      });
    }

    if (typeof seo_metadata === "string") {
      try {
        seo_metadata = JSON.parse(seo_metadata);
      } catch {
        // ignore invalid JSON; let it be stored as null or original string if desired
      }
    }

    // If a file is uploaded, store image + thumbnail
    if (req.file && req.file.buffer) {
      const ext = resolveExt(req.file.originalname, req.file.mimetype);
      const slugForFile = slug || this.generateSlug(title);
      const filename = `${slugForFile}${ext}`;

      const uploaded = await imageService.uploadImageWithThumbnail({
        buffer: req.file.buffer,
        filename,
        mimeType: req.file.mimetype,
        public: true,
        thumb: { width: 640, height: 360, format: "webp", quality: 72 },
        // compress: { format: "webp", quality: 65 },
      });

      image_url =
        uploaded?.original?.url ||
        (uploaded?.original?.id
          ? imageService.getImageUrl(uploaded.original.id)
          : null);

      thumbnail_image_url =
        uploaded?.thumbnail?.url ||
        (uploaded?.thumbnail?.id
          ? imageService.getImageUrl(uploaded.thumbnail.id)
          : null);
    }

    const newArticle = await withTransaction(async (client) => {
      // Check slug uniqueness if provided
      if (slug) {
        const existingSlug = await articlesRepository.findBySlug(
          slug,
          { includeDraft: true },
          client
        );
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const created = await articlesRepository.createArticle(
        {
          title,
          content,
          publication_date,
          image_url: image_url || null,
          thumbnail_image_url: thumbnail_image_url || null,
          slug: slug || this.generateSlug(title),
          author,
          status,
          seo_metadata: seo_metadata ?? null,
        },
        client
      );

      return created;
    });

    return newArticle;
  }

  /**
   * Update article (overwrite image if a new file is uploaded)
   */
  async updateArticle(req) {
    const { id } = req.params;
    let {
      title,
      content,
      publication_date,
      image_url,
      thumbnail_image_url,
      slug,
      author,
      status,
      seo_metadata,
    } = req.body;

    if (!id) {
      throw new CustomError({
        message: "Article ID is required",
        statusCode: 400,
      });
    }

    if (typeof seo_metadata === "string") {
      try {
        seo_metadata = JSON.parse(seo_metadata);
      } catch {
        // ignore invalid JSON
      }
    }

    const updatedArticle = await withTransaction(async (client) => {
      const existing = await articlesRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Article not found",
          statusCode: 404,
        });
      }

      // Slug collision check if changed
      if (slug && slug !== existing.slug) {
        const existingSlug = await articlesRepository.findBySlug(
          slug,
          { includeDraft: true },
          client
        );
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const slugToUse = slug || existing.slug;

      // Keep existing image URLs unless explicitly overridden
      let nextImageUrl =
        typeof image_url !== "undefined" ? image_url : existing.image_url;
      let nextThumbUrl =
        typeof thumbnail_image_url !== "undefined"
          ? thumbnail_image_url
          : existing.thumbnail_image_url;

      // If new file uploaded, overwrite existing
      if (req.file && req.file.buffer) {
        const ext = resolveExt(req.file.originalname, req.file.mimetype);
        const filename = `${slugToUse}${ext || ""}`;

        const uploaded = await imageService.uploadImageWithThumbnail({
          buffer: req.file.buffer,
          filename,
          mimeType: req.file.mimetype,
          public: true,
          overwrite: true,
          thumb: { width: 640, height: 360, format: "webp", quality: 72 },
          // compress: { format: "webp", quality: 65 },
        });

        nextImageUrl =
          uploaded?.original?.url ||
          (uploaded?.original?.id
            ? imageService.getImageUrl(uploaded.original.id)
            : null);

        nextThumbUrl =
          uploaded?.thumbnail?.url ||
          (uploaded?.thumbnail?.id
            ? imageService.getImageUrl(uploaded.thumbnail.id)
            : null);
      }

      const updated = await articlesRepository.updateArticle(
        id,
        {
          title: typeof title !== "undefined" ? title : existing.title,
          content: typeof content !== "undefined" ? content : existing.content,
          publication_date:
            typeof publication_date !== "undefined"
              ? publication_date
              : existing.publication_date,
          image_url: nextImageUrl ?? null,
          thumbnail_image_url: nextThumbUrl ?? null,
          slug: slugToUse,
          author: typeof author !== "undefined" ? author : existing.author,
          status: typeof status !== "undefined" ? status : existing.status,
          seo_metadata:
            typeof seo_metadata !== "undefined"
              ? seo_metadata
              : existing.seo_metadata,
        },
        client
      );

      return updated;
    });

    return updatedArticle;
  }

  /**
   * Increment article views
   */
  async incrementViews(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Article ID is required",
        statusCode: 400,
      });
    }

    const updated = await withTransaction(async (client) => {
      const existing = await articlesRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Article not found",
          statusCode: 404,
        });
      }
      return await articlesRepository.incrementViews(id, client);
    });

    return updated;
  }

  /**
   * Delete article
   */
  async deleteArticle(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Article ID is required",
        statusCode: 400,
      });
    }

    await withTransaction(async (client) => {
      const existing = await articlesRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Article not found",
          statusCode: 404,
        });
      }
      await articlesRepository.deleteArticle(id, client);
    });

    return { id };
  }

  /**
   * Generate slug from title
   */
  generateSlug(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 255);
  }
}

module.exports = new ArticlesController();
