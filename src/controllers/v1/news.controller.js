const newsRepository = require("../../repositories/news.repository");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");
const imageService = require("../../services/image_services");
const path = require("path");

class NewsController {
  /**
   * Get all news
   */
  async getAllNews(req) {
    const { status, author, page, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (author) filters.author = author;

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const news = await withTransaction(async (client) => {
      return await newsRepository.findAll(filters, pagination, client);
    });

    return news;
  }

  /**
   * Get news by slug
   */
  async getNewsBySlug(req) {
    const { slug } = req.params;

    if (!slug) {
      throw new CustomError({
        message: "News slug is required",
        statusCode: 400,
      });
    }

    const news = await withTransaction(async (client) => {
      const data = await newsRepository.findBySlug(slug, client);
      if (!data) {
        throw new CustomError({
          message: "News not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return news;
  }

  /**
   * Get news by ID
   */
  async getNewsById(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "News ID is required",
        statusCode: 400,
      });
    }

    const news = await withTransaction(async (client) => {
      const data = await newsRepository.findById(id, client);
      if (!data) {
        throw new CustomError({
          message: "News not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return news;
  }

  /**
   * Create a new news
   */
  async createNews(req) {
    const { title, content, publication_date, slug, author, status } = req.body;

    let { image_url, thumbnail_image_url, seo_metadata } = req.body;

    // Basic required validation
    if (!title || !content || !publication_date || !author || !status) {
      throw new CustomError({
        message:
          "title, content, publication_date, author, and status are required",
        statusCode: 400,
      });
    }

    // Parse SEO metadata if it’s a JSON string
    if (typeof seo_metadata === "string") {
      try {
        seo_metadata = JSON.parse(seo_metadata);
      } catch {
        // keep original string or null—don’t block creation
      }
    }

    // If a file was uploaded, push it to storage + create a thumbnail
    if (req.file) {
      let ext = path.extname(req.file.originalname).toLowerCase();

      const filename = `${slug}${ext}`;
      const uploaded = await imageService.uploadImageWithThumbnail({
        buffer: req.file.buffer,
        filename,
        mimeType: req.file.mimetype,
        public: true,
        // tweak as needed:
        thumb: { width: 640, height: 360, format: "webp", quality: 72 },
        // set to true or pass {format, quality} if you also want a compressed original stored
        // compress: { format: "webp", quality: 65 },
      });

      // Prefer service URLs; fallback to URL builder if service omits url
      image_url =
        uploaded.original.url || imageService.getImageUrl(uploaded.original.id);

      thumbnail_image_url =
        uploaded.thumbnail?.url ||
        (uploaded.thumbnail?.id
          ? imageService.getImageUrl(uploaded.thumbnail.id)
          : null);
    }

    // Transactional create (keeps your slug uniqueness check)
    const newNews = await withTransaction(async (client) => {
      if (slug) {
        const existingSlug = await newsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const created = await newsRepository.createNews(
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

    return newNews;
  }

  /**
   * Update news
   */
  /**
   * Update news (and overwrite image if a new file is uploaded)
   */
  async updateNews(req) {
    const { id } = req.params;

    // Body fields (may be partially provided)
    let {
      title,
      content,
      publication_date,
      image_url, // optional manual override
      thumbnail_image_url, // optional manual override
      slug,
      author,
      status,
      seo_metadata,
    } = req.body;

    if (!id) {
      throw new CustomError({
        message: "News ID is required",
        statusCode: 400,
      });
    }

    // Parse SEO metadata if it’s a JSON string
    if (typeof seo_metadata === "string") {
      try {
        seo_metadata = JSON.parse(seo_metadata);
      } catch {
        // keep original string or null—don’t block update
      }
    }

    const updatedNews = await withTransaction(async (client) => {
      // 1) Ensure the record exists
      const existing = await newsRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "News not found",
          statusCode: 404,
        });
      }

      // 2) Slug uniqueness check when slug changes
      if (slug && slug !== existing.slug) {
        const existingSlug = await newsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      // Determine the slug to use for filenames (new or existing)
      const slugToUse = slug || existing.slug;

      // Start from previous values; only change what’s provided
      let nextImageUrl =
        typeof image_url !== "undefined" ? image_url : existing.image_url;
      let nextThumbUrl =
        typeof thumbnail_image_url !== "undefined"
          ? thumbnail_image_url
          : existing.thumbnail_image_url;

      // 3) If a new file is uploaded, overwrite the stored image & thumb
      if (req.file && req.file.buffer) {
        // prefer the true type from MIME
        let ext = path.extname(req.file.originalname).toLowerCase();
        if (!ext) {
          // fallback to original name's ext if MIME wasn't mapped
          ext = path.extname(req.file.originalname).toLowerCase();
        }

        const filename = `${slugToUse}${ext || ""}`;

        const uploaded = await imageService.uploadImageWithThumbnail({
          buffer: req.file.buffer,
          filename,
          mimeType: req.file.mimetype,
          public: true,
          // overwrite behavior — implement inside your service if needed
          overwrite: true,
          thumb: { width: 640, height: 360, format: "webp", quality: 72 },
          // compress: { format: "webp", quality: 65 }, // optional
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

      // 4) Persist update (only provided fields will overwrite; others keep existing)
      const updated = await newsRepository.updateNews(
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

    return updatedNews;
  }

  /**
   * Increment news views
   */
  async incrementViews(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "News ID is required",
        statusCode: 400,
      });
    }

    const updatedNews = await withTransaction(async (client) => {
      const existing = await newsRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "News not found",
          statusCode: 404,
        });
      }

      const updated = await newsRepository.incrementViews(id, client);
      return updated;
    });

    return updatedNews;
  }

  /**
   * Delete news
   */
  async deleteNews(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "News ID is required",
        statusCode: 400,
      });
    }

    await withTransaction(async (client) => {
      const existing = await newsRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "News not found",
          statusCode: 404,
        });
      }
      await newsRepository.deleteNews(id, client);
    });

    return { id };
  }

  /**
   * Generate slug from title
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 255);
  }
}

module.exports = new NewsController();
