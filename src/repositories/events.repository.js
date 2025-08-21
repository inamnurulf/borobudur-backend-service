const pool = require("../config/db");

class EventsRepository {
  async findAll(filters = {}, pagination = {}, client = pool) {
    const { status, type, location, start_date, end_date } = filters;
    const { page = 1, limit = 10 } = pagination;
    
    // Build dynamic WHERE clause
    const whereConditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      whereConditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (type) {
      whereConditions.push(`type ILIKE $${idx++}`);
      values.push(`%${type}%`);
    }
    if (location) {
      whereConditions.push(`location ILIKE $${idx++}`);
      values.push(`%${location}%`);
    }
    if (start_date) {
      whereConditions.push(`start_date >= $${idx++}`);
      values.push(start_date);
    }
    if (end_date) {
      whereConditions.push(`start_date <= $${idx++}`);
      values.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Main query
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        ${whereClause}
        ORDER BY start_date ASC
        LIMIT $${idx++} OFFSET $${idx++}
      `,
      values: [...values, limit, offset],
    };

    // Count query for pagination
    const countQuery = {
      text: `SELECT COUNT(*) as total FROM events ${whereClause}`,
      values: values,
    };

    const [dataResult, countResult] = await Promise.all([
      client.query(query),
      client.query(countQuery)
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: dataResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  async findById(id, client = pool) {
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        WHERE id = $1 
        LIMIT 1
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async findBySlug(slug, client = pool) {
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        WHERE slug = $1 AND status != 'canceled'
        LIMIT 1
      `,
      values: [slug],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async createEvent(data, client = pool) {
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
    } = data;

    const query = {
      text: `
        INSERT INTO events (
          name, description, type, start_date, end_date, location, 
          image_url, thumbnail_image_url, slug, status, seo_metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, description, type, start_date, end_date, location, 
                  image_url, thumbnail_image_url, slug, status, views_count, 
                  seo_metadata, created_at, updated_at
      `,
      values: [
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
        seo_metadata ? JSON.stringify(seo_metadata) : null
      ],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async updateEvent(id, data, client = pool) {
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
    } = data;

    // Build dynamic parts
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(type);
    }
    if (start_date !== undefined) {
      fields.push(`start_date = $${idx++}`);
      values.push(start_date);
    }
    if (end_date !== undefined) {
      fields.push(`end_date = $${idx++}`);
      values.push(end_date);
    }
    if (location !== undefined) {
      fields.push(`location = $${idx++}`);
      values.push(location);
    }
    if (image_url !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(image_url);
    }
    if (thumbnail_image_url !== undefined) {
      fields.push(`thumbnail_image_url = $${idx++}`);
      values.push(thumbnail_image_url);
    }
    if (slug !== undefined) {
      fields.push(`slug = $${idx++}`);
      values.push(slug);
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }
    if (seo_metadata !== undefined) {
      fields.push(`seo_metadata = $${idx++}`);
      values.push(seo_metadata ? JSON.stringify(seo_metadata) : null);
    }

    // Always update updated_at
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 1) { // Only updated_at was added
      return this.findById(id, client);
    }

    const query = {
      text: `
        UPDATE events
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        RETURNING id, name, description, type, start_date, end_date, location, 
                  image_url, thumbnail_image_url, slug, status, views_count, 
                  seo_metadata, created_at, updated_at
      `,
      values: [...values, id],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async incrementViews(id, client = pool) {
    const query = {
      text: `
        UPDATE events
        SET views_count = views_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, description, type, start_date, end_date, location, 
                  image_url, thumbnail_image_url, slug, status, views_count, 
                  seo_metadata, created_at, updated_at
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async deleteEvent(id, client = pool) {
    const query = { 
      text: `DELETE FROM events WHERE id = $1`, 
      values: [id] 
    };
    await client.query(query);
  }

  // Additional utility methods
  async findByStatus(status, limit = 10, client = pool) {
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        WHERE status = $1
        ORDER BY start_date ASC
        LIMIT $2
      `,
      values: [status, limit],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async findUpcoming(limit = 5, client = pool) {
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        WHERE status = 'upcoming' AND start_date > NOW()
        ORDER BY start_date ASC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async findByDateRange(startDate, endDate, client = pool) {
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        WHERE start_date >= $1 AND start_date <= $2
        AND status != 'canceled'
        ORDER BY start_date ASC
      `,
      values: [startDate, endDate],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async findByLocation(location, limit = 10, client = pool) {
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        WHERE location ILIKE $1 AND status != 'canceled'
        ORDER BY start_date ASC
        LIMIT $2
      `,
      values: [`%${location}%`, limit],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async findPopular(limit = 5, client = pool) {
    const query = {
      text: `
        SELECT id, name, description, type, start_date, end_date, location, 
               image_url, thumbnail_image_url, slug, status, views_count, 
               seo_metadata, created_at, updated_at
        FROM events 
        WHERE status != 'canceled'
        ORDER BY views_count DESC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await client.query(query);
    return rows;
  }
}

module.exports = new EventsRepository();