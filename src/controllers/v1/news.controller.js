const newsRepository = require("../../repositories/news.repository");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");

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
      limit: limit ? parseInt(limit) : 10
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
    const { 
      title, 
      content, 
      publication_date, 
      image_url, 
      thumbnail_image_url, 
      slug, 
      author, 
      status,
      seo_metadata 
    } = req.body;

    if (!title || !content || !publication_date || !author || !status) {
      throw new CustomError({
        message: "title, content, publication_date, author, and status are required",
        statusCode: 400,
      });
    }

    const newNews = await withTransaction(async (client) => {
      // Check if slug already exists (if provided)
      if (slug) {
        const existingSlug = await newsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const created = await newsRepository.createNews({
        title,
        content,
        publication_date,
        image_url,
        thumbnail_image_url,
        slug: slug || this.generateSlug(title),
        author,
        status,
        seo_metadata
      }, client);
      
      return created;
    });

    return newNews;
  }

  /**
   * Update news
   */
  async updateNews(req) {
    const { id } = req.params;
    const { 
      title, 
      content, 
      publication_date, 
      image_url, 
      thumbnail_image_url, 
      slug, 
      author, 
      status,
      seo_metadata 
    } = req.body;

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

      // Check if slug already exists (if provided and different from current)
      if (slug && slug !== existing.slug) {
        const existingSlug = await newsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const updated = await newsRepository.updateNews(id, {
        title,
        content,
        publication_date,
        image_url,
        thumbnail_image_url,
        slug,
        author,
        status,
        seo_metadata
      }, client);
      
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
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 255);
  }
}

module.exports = new NewsController();