const eventsRepository = require("../../repositories/events.repository");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");

class EventsController {
  /**
   * Get all events
   */
  async getAllEvents(req) {
    const { status, type, location, start_date, end_date, page, limit } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (location) filters.location = location;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    };

    const events = await withTransaction(async (client) => {
      return await eventsRepository.findAll(filters, pagination, client);
    });

    return events;
  }

  /**
   * Get event by slug
   */
  async getEventBySlug(req) {
    const { slug } = req.params;

    if (!slug) {
      throw new CustomError({
        message: "Event slug is required",
        statusCode: 400,
      });
    }

    const event = await withTransaction(async (client) => {
      const data = await eventsRepository.findBySlug(slug, client);
      if (!data) {
        throw new CustomError({
          message: "Event not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return event;
  }

  /**
   * Get event by ID
   */
  async getEventById(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Event ID is required",
        statusCode: 400,
      });
    }

    const event = await withTransaction(async (client) => {
      const data = await eventsRepository.findById(id, client);
      if (!data) {
        throw new CustomError({
          message: "Event not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return event;
  }

  /**
   * Create a new event
   */
  async createEvent(req) {
    const { 
      name, 
      description, 
      type, 
      start_date, 
      end_date,
      location, 
      image_url, 
      thumbnail_image_url, 
      slug, 
      status,
      seo_metadata 
    } = req.body;

    if (!name || !description || !type || !start_date || !location || !status) {
      throw new CustomError({
        message: "name, description, type, start_date, location, and status are required",
        statusCode: 400,
      });
    }

    // Validate date logic
    if (end_date && new Date(start_date) >= new Date(end_date)) {
      throw new CustomError({
        message: "End date must be after start date",
        statusCode: 400,
      });
    }

    const newEvent = await withTransaction(async (client) => {
      // Check if slug already exists (if provided)
      if (slug) {
        const existingSlug = await eventsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const created = await eventsRepository.createEvent({
        name,
        description,
        type,
        start_date,
        end_date,
        location,
        image_url,
        thumbnail_image_url,
        slug: slug || this.generateSlug(name),
        status,
        seo_metadata
      }, client);
      
      return created;
    });

    return newEvent;
  }

  /**
   * Update event
   */
  async updateEvent(req) {
    const { id } = req.params;
    const { 
      name, 
      description, 
      type, 
      start_date, 
      end_date,
      location, 
      image_url, 
      thumbnail_image_url, 
      slug, 
      status,
      seo_metadata 
    } = req.body;

    if (!id) {
      throw new CustomError({
        message: "Event ID is required",
        statusCode: 400,
      });
    }

    // Validate date logic if both dates are provided
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      throw new CustomError({
        message: "End date must be after start date",
        statusCode: 400,
      });
    }

    const updatedEvent = await withTransaction(async (client) => {
      const existing = await eventsRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Event not found",
          statusCode: 404,
        });
      }

      // Check if slug already exists (if provided and different from current)
      if (slug && slug !== existing.slug) {
        const existingSlug = await eventsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const updated = await eventsRepository.updateEvent(id, {
        name,
        description,
        type,
        start_date,
        end_date,
        location,
        image_url,
        thumbnail_image_url,
        slug,
        status,
        seo_metadata
      }, client);
      
      return updated;
    });

    return updatedEvent;
  }

  /**
   * Increment event views
   */
  async incrementViews(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Event ID is required",
        statusCode: 400,
      });
    }

    const updatedEvent = await withTransaction(async (client) => {
      const existing = await eventsRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Event not found",
          statusCode: 404,
        });
      }

      const updated = await eventsRepository.incrementViews(id, client);
      return updated;
    });

    return updatedEvent;
  }

  /**
   * Delete event
   */
  async deleteEvent(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Event ID is required",
        statusCode: 400,
      });
    }

    await withTransaction(async (client) => {
      const existing = await eventsRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Event not found",
          statusCode: 404,
        });
      }
      await eventsRepository.deleteEvent(id, client);
    });

    return { id };
  }

  /**
   * Generate slug from name
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 255);
  }
}

module.exports = new EventsController();