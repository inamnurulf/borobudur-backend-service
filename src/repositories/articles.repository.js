// repositories/articles.repository.js
const pool = require("../config/db");

class ArticlesRepository {
  // List with filters + pagination
  async findAll(filters = {}, pagination = {}, client = pool) {
    const { status, author, date_from, date_to, q } = filters;
    const { page = 1, limit = 10 } = pagination;

    const where = [];
    const values = [];
    let i = 1;

    if (status) {
      where.push(`status = $${i++}`);
      values.push(status);
    }
    if (author) {
      where.push(`author ILIKE $${i++}`);
      values.push(`%${author}%`);
    }
    if (date_from) {
      where.push(`publication_date >= $${i++}`);
      values.push(date_from);
    }
    if (date_to) {
      where.push(`publication_date <= $${i++}`);
      values.push(date_to);
    }
    if (q) {
      where.push(`(title ILIKE $${i} OR content ILIKE $${i})`);
      values.push(`%${q}%`);
      i++;
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    const query = {
      text: `
        SELECT id, title, content, publication_date,
               image_url, thumbnail_image_url, slug, author, status,
               views_count, seo_metadata, created_at, updated_at
        FROM articles
        ${whereClause}
        ORDER BY publication_date DESC, id DESC
        LIMIT $${i++} OFFSET $${i++}
      `,
      values: [...values, limit, offset],
    };

    const countQuery = {
      text: `SELECT COUNT(*) AS total FROM articles ${whereClause}`,
      values,
    };

    const [dataResult, countResult] = await Promise.all([
      client.query(query),
      client.query(countQuery),
    ]);

    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: dataResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id, client = pool) {
    const query = {
      text: `
        SELECT id, title, content, publication_date,
               image_url, thumbnail_image_url, slug, author, status,
               views_count, seo_metadata, created_at, updated_at
        FROM articles
        WHERE id = $1
        LIMIT 1
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  // By default, do not return drafts (tweak as needed)
  async findBySlug(slug, { includeDraft = false } = {}, client = pool) {
    const base = `
      SELECT id, title, content, publication_date,
             image_url, thumbnail_image_url, slug, author, status,
             views_count, seo_metadata, created_at, updated_at
      FROM articles
      WHERE slug = $1
    `;
    const text = includeDraft ? `${base} LIMIT 1`
                              : `${base} AND status != 'draft' LIMIT 1`;
    const { rows } = await client.query({ text, values: [slug] });
    return rows[0] || null;
  }

  async createArticle(data, client = pool) {
    const {
      title,
      content,
      publication_date,
      image_url,
      thumbnail_image_url,
      slug,
      author,
      status,
      seo_metadata,
    } = data;

    const query = {
      text: `
        INSERT INTO articles (
          title, content, publication_date,
          image_url, thumbnail_image_url, slug, author, status, seo_metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id, title, content, publication_date,
                  image_url, thumbnail_image_url, slug, author, status,
                  views_count, seo_metadata, created_at, updated_at
      `,
      values: [
        title,
        content,
        publication_date,
        image_url || null,
        thumbnail_image_url || null,
        slug,
        author,
        status,
        seo_metadata ? JSON.stringify(seo_metadata) : null,
      ],
    };

    const { rows } = await client.query(query);
    return rows[0];
  }

  async updateArticle(id, data, client = pool) {
    const {
      title,
      content,
      publication_date,
      image_url,
      thumbnail_image_url,
      slug,
      author,
      status,
      seo_metadata,
    } = data;

    const sets = [];
    const values = [];
    let i = 1;

    if (title !== undefined) { sets.push(`title = $${i++}`); values.push(title); }
    if (content !== undefined) { sets.push(`content = $${i++}`); values.push(content); }
    if (publication_date !== undefined) { sets.push(`publication_date = $${i++}`); values.push(publication_date); }
    if (image_url !== undefined) { sets.push(`image_url = $${i++}`); values.push(image_url); }
    if (thumbnail_image_url !== undefined) { sets.push(`thumbnail_image_url = $${i++}`); values.push(thumbnail_image_url); }
    if (slug !== undefined) { sets.push(`slug = $${i++}`); values.push(slug); }
    if (author !== undefined) { sets.push(`author = $${i++}`); values.push(author); }
    if (status !== undefined) { sets.push(`status = $${i++}`); values.push(status); }
    if (seo_metadata !== undefined) {
      sets.push(`seo_metadata = $${i++}`);
      values.push(seo_metadata ? JSON.stringify(seo_metadata) : null);
    }

    // Always bump updated_at
    sets.push(`updated_at = CURRENT_TIMESTAMP`);

    if (sets.length === 1) {
      // Only updated_at -> no actual field provided
      return this.findById(id, client);
    }

    const query = {
      text: `
        UPDATE articles
        SET ${sets.join(", ")}
        WHERE id = $${i}
        RETURNING id, title, content, publication_date,
                  image_url, thumbnail_image_url, slug, author, status,
                  views_count, seo_metadata, created_at, updated_at
      `,
      values: [...values, id],
    };

    const { rows } = await client.query(query);
    return rows[0];
  }

  async incrementViews(id, client = pool) {
    const query = {
      text: `
        UPDATE articles
        SET views_count = views_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, title, content, publication_date,
                  image_url, thumbnail_image_url, slug, author, status,
                  views_count, seo_metadata, created_at, updated_at
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async deleteArticle(id, client = pool) {
    await client.query({ text: `DELETE FROM articles WHERE id = $1`, values: [id] });
  }

  // --- Convenience queries ---

  async findByStatus(status, limit = 10, client = pool) {
    const { rows } = await client.query({
      text: `
        SELECT id, title, content, publication_date,
               image_url, thumbnail_image_url, slug, author, status,
               views_count, seo_metadata, created_at, updated_at
        FROM articles
        WHERE status = $1
        ORDER BY publication_date DESC, id DESC
        LIMIT $2
      `,
      values: [status, limit],
    });
    return rows;
  }

  async findRecent(limit = 10, client = pool) {
    const { rows } = await client.query({
      text: `
        SELECT id, title, content, publication_date,
               image_url, thumbnail_image_url, slug, author, status,
               views_count, seo_metadata, created_at, updated_at
        FROM articles
        WHERE status = 'published'
        ORDER BY publication_date DESC, id DESC
        LIMIT $1
      `,
      values: [limit],
    });
    return rows;
  }

  async findPopular(limit = 10, client = pool) {
    const { rows } = await client.query({
      text: `
        SELECT id, title, content, publication_date,
               image_url, thumbnail_image_url, slug, author, status,
               views_count, seo_metadata, created_at, updated_at
        FROM articles
        ORDER BY views_count DESC, id DESC
        LIMIT $1
      `,
      values: [limit],
    });
    return rows;
  }

  async findByAuthor(author, { includeDraft = false } = {}, limit = 10, client = pool) {
    const text = `
      SELECT id, title, content, publication_date,
             image_url, thumbnail_image_url, slug, author, status,
             views_count, seo_metadata, created_at, updated_at
      FROM articles
      WHERE author ILIKE $1
      ${includeDraft ? "" : `AND status != 'draft'`}
      ORDER BY publication_date DESC, id DESC
      LIMIT $2
    `;
    const { rows } = await client.query({ text, values: [`%${author}%`, limit] });
    return rows;
  }

  async findByDateRange(from, to, { includeDraft = false } = {}, client = pool) {
    const text = `
      SELECT id, title, content, publication_date,
             image_url, thumbnail_image_url, slug, author, status,
             views_count, seo_metadata, created_at, updated_at
      FROM articles
      WHERE publication_date >= $1 AND publication_date <= $2
      ${includeDraft ? "" : `AND status != 'draft'`}
      ORDER BY publication_date DESC, id DESC
    `;
    const { rows } = await client.query({ text, values: [from, to] });
    return rows;
  }

  async search(q, limit = 10, client = pool) {
    const { rows } = await client.query({
      text: `
        SELECT id, title, content, publication_date,
               image_url, thumbnail_image_url, slug, author, status,
               views_count, seo_metadata, created_at, updated_at
        FROM articles
        WHERE (title ILIKE $1 OR content ILIKE $1)
          AND status != 'draft'
        ORDER BY publication_date DESC, id DESC
        LIMIT $2
      `,
      values: [`%${q}%`, limit],
    });
    return rows;
  }
}

module.exports = new ArticlesRepository();
