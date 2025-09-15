const eventsRepository = require("../../repositories/events.repository");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");
const imageService = require("../../services/image_services");
const path = require("path");
const { resolveExt } = require("./helper/fileExt");

class EventsController {
  /**
   * Get all events
   */
  async getAllEvents(req) {
    const { status, type, location, start_date, end_date, page, limit } =
      req.query;

    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (location) filters.location = location;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
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
   * Create a new event (supports image upload like News)
   */
  async createEvent(req) {
    let {
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
      seo_metadata,
    } = req.body;

    if (!name || !description || !type || !start_date || !location || !status) {
      throw new CustomError({
        message:
          "name, description, type, start_date, location, and status are required",
        statusCode: 400,
      });
    }

    if (end_date && new Date(start_date) >= new Date(end_date)) {
      throw new CustomError({
        message: "End date must be after start date",
        statusCode: 400,
      });
    }

    if (typeof seo_metadata === "string") {
      try {
        seo_metadata = JSON.parse(seo_metadata);
      } catch {
        // ignore bad JSON; keep as string or null
      }
    }

    // If a file was uploaded, push it to storage + create a thumbnail
    if (req.file && req.file.buffer) {
      const ext = resolveExt(req.file.originalname, req.file.mimetype);
      const slugForFile = slug || this.generateSlug(name);
      const filename = `${slugForFile}${ext}`;

      const uploaded = await imageService.uploadImageWithThumbnail({
        buffer: req.file.buffer,
        filename,
        mimeType: req.file.mimetype,
        public: true,
        thumb: { width: 640, height: 360, format: "webp", quality: 72 },
        // compress: { format: "webp", quality: 65 }, // optional
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

    const newEvent = await withTransaction(async (client) => {
      if (slug) {
        const existingSlug = await eventsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const created = await eventsRepository.createEvent(
        {
          name,
          description,
          type,
          start_date,
          end_date,
          location,
          image_url: image_url || null,
          thumbnail_image_url: thumbnail_image_url || null,
          slug: slug || this.generateSlug(name),
          status,
          seo_metadata: seo_metadata ?? null,
        },
        client
      );

      return created;
    });

    return newEvent;
  }

  /**
   * Update event (overwrite image if a new file is uploaded)
   */
  async updateEvent(req) {
    const { id } = req.params;
    let {
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
      seo_metadata,
    } = req.body;

    if (!id) {
      throw new CustomError({
        message: "Event ID is required",
        statusCode: 400,
      });
    }

    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      throw new CustomError({
        message: "End date must be after start date",
        statusCode: 400,
      });
    }

    if (typeof seo_metadata === "string") {
      try {
        seo_metadata = JSON.parse(seo_metadata);
      } catch {
        // ignore bad JSON
      }
    }

    const updatedEvent = await withTransaction(async (client) => {
      const existing = await eventsRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Event not found",
          statusCode: 404,
        });
      }

      if (slug && slug !== existing.slug) {
        const existingSlug = await eventsRepository.findBySlug(slug, client);
        if (existingSlug) {
          throw new CustomError({
            message: "Slug already exists",
            statusCode: 409,
          });
        }
      }

      const slugToUse = slug || existing.slug;

      // Start with existing image URLs unless explicitly overridden
      let nextImageUrl =
        typeof image_url !== "undefined" ? image_url : existing.image_url;
      let nextThumbUrl =
        typeof thumbnail_image_url !== "undefined"
          ? thumbnail_image_url
          : existing.thumbnail_image_url;

      // Handle new uploaded image (overwrite behavior)
      if (req.file && req.file.buffer) {
        const ext = resolveExt(req.file.originalname, req.file.mimetype);
        const filename = `${slugToUse}${ext || ""}`;

        const uploaded = await imageService.uploadImageWithThumbnail({
          buffer: req.file.buffer,
          filename,
          mimeType: req.file.mimetype,
          public: true,
          overwrite: true, // let your service replace same-key objects
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

      const updated = await eventsRepository.updateEvent(
        id,
        {
          name: typeof name !== "undefined" ? name : existing.name,
          description:
            typeof description !== "undefined"
              ? description
              : existing.description,
          type: typeof type !== "undefined" ? type : existing.type,
          start_date:
            typeof start_date !== "undefined"
              ? start_date
              : existing.start_date,
          end_date:
            typeof end_date !== "undefined" ? end_date : existing.end_date,
          location:
            typeof location !== "undefined" ? location : existing.location,
          image_url: nextImageUrl ?? null,
          thumbnail_image_url: nextThumbUrl ?? null,
          slug: slugToUse,
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
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 255);
  }
}

module.exports = new EventsController();
