const pool = require("../config/db");

class NewsRepository {
  async findAll(filters = {}, pagination = {}, client = pool) {
    const { status, author } = filters;
    const { page = 1, limit = 10 } = pagination;
    
    // Build dynamic WHERE clause
    const whereConditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      whereConditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (author) {
      whereConditions.push(`author ILIKE $${idx++}`);
      values.push(`%${author}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Main query
    const query = {
      text: `
        SELECT id, title, content, publication_date, image_url, thumbnail_image_url, 
               slug, author, status, views_count, seo_metadata, created_at, updated_at
        FROM news 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `,
      values: [...values, limit, offset],
    };

    // Count query for pagination
    const countQuery = {
      text: `SELECT COUNT(*) as total FROM news ${whereClause}`,
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
        SELECT id, title, content, publication_date, image_url, thumbnail_image_url, 
               slug, author, status, views_count, seo_metadata, created_at, updated_at
        FROM news 
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
        SELECT id, title, content, publication_date, image_url, thumbnail_image_url, 
               slug, author, status, views_count, seo_metadata, created_at, updated_at
        FROM news 
        WHERE slug = $1 AND status = 'published'
        LIMIT 1
      `,
      values: [slug],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async createNews(data, client = pool) {
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
    } = data;

    const query = {
      text: `
        INSERT INTO news (
          title, content, publication_date, image_url, thumbnail_image_url, 
          slug, author, status, seo_metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, title, content, publication_date, image_url, thumbnail_image_url, 
                  slug, author, status, views_count, seo_metadata, created_at, updated_at
      `,
      values: [
        title,
        content,
        publication_date,
        image_url,
        thumbnail_image_url,
        slug,
        author,
        status,
        seo_metadata ? JSON.stringify(seo_metadata) : null
      ],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async updateNews(id, data, client = pool) {
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
    } = data;

    // Build dynamic parts
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (content !== undefined) {
      fields.push(`content = $${idx++}`);
      values.push(content);
    }
    if (publication_date !== undefined) {
      fields.push(`publication_date = $${idx++}`);
      values.push(publication_date);
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
    if (author !== undefined) {
      fields.push(`author = $${idx++}`);
      values.push(author);
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
        UPDATE news
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        RETURNING id, title, content, publication_date, image_url, thumbnail_image_url, 
                  slug, author, status, views_count, seo_metadata, created_at, updated_at
      `,
      values: [...values, id],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async incrementViews(id, client = pool) {
    const query = {
      text: `
        UPDATE news
        SET views_count = views_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, title, content, publication_date, image_url, thumbnail_image_url, 
                  slug, author, status, views_count, seo_metadata, created_at, updated_at
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async deleteNews(id, client = pool) {
    const query = { 
      text: `DELETE FROM news WHERE id = $1`, 
      values: [id] 
    };
    await client.query(query);
  }

  // Additional utility methods
  async findByStatus(status, limit = 10, client = pool) {
    const query = {
      text: `
        SELECT id, title, content, publication_date, image_url, thumbnail_image_url, 
               slug, author, status, views_count, seo_metadata, created_at, updated_at
        FROM news 
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      values: [status, limit],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async findRecent(limit = 5, client = pool) {
    const query = {
      text: `
        SELECT id, title, content, publication_date, image_url, thumbnail_image_url, 
               slug, author, status, views_count, seo_metadata, created_at, updated_at
        FROM news 
        WHERE status = 'published'
        ORDER BY publication_date DESC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async findPopular(limit = 5, client = pool) {
    const query = {
      text: `
        SELECT id, title, content, publication_date, image_url, thumbnail_image_url, 
               slug, author, status, views_count, seo_metadata, created_at, updated_at
        FROM news 
        WHERE status = 'published'
        ORDER BY views_count DESC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await client.query(query);
    return rows;
  }
}

module.exports = new NewsRepository();