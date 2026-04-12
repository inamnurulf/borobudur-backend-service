const pool = require("../config/db");

class TempleFeaturesRepository {
  async findAll(filters = {}, pagination = {}, client = pool) {
    const { type, q, bbox } = filters;
    const { page = 1, limit = 20 } = pagination;

    const whereConditions = [];
    const values = [];
    let idx = 1;

    if (type) {
      whereConditions.push(`type = $${idx++}`);
      values.push(type);
    }

    if (q) {
      whereConditions.push(`(name ILIKE $${idx++} OR description ILIKE $${idx++})`);
      values.push(`%${q}%`, `%${q}%`);
    }

    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
      whereConditions.push(
        `ST_Intersects(n.geom, ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326))`
      );
      values.push(minLon, minLat, maxLon, maxLat);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const offset = (page - 1) * limit;

    const query = {
      text: `
        SELECT f.id, f.type, f.name, f.description, f.image_url, f.rating,
               ST_AsGeoJSON(n.geom)::json AS geom
        FROM temple_features f
        JOIN temple_nodes n ON f.node_id = n.id
        ${whereClause}
        ORDER BY f.id ASC
        LIMIT $${idx++} OFFSET $${idx++}
      `,
      values: [...values, limit, offset],
    };

    const countQuery = {
      text: `SELECT COUNT(*) FROM temple_features f JOIN temple_nodes n ON f.node_id = n.id ${whereClause}`,
      values,
    };

    const [dataResult, countResult] = await Promise.all([
      client.query(query),
      client.query(countQuery),
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
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

 async findNearest(filters = {}, pagination = {}, client = pool) {
  const { lat, lon, type, radius } = filters;
  const { page = 1, limit = 10 } = pagination;

  // Always need lon/lat for queries
  const values = [lon, lat];
  let idx = 3; // start at $3, since $1 = lon, $2 = lat

  const whereConditions = [];

  if (type) {
    whereConditions.push(`f.type = $${idx++}`);
    values.push(type);
  }

  if (radius) {
    whereConditions.push(`
      ST_DWithin(
        n.geom::geography,
        ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
        $${idx++}
      )
    `);
    values.push(radius);
  }

  const whereClause = whereConditions.length
    ? `AND ${whereConditions.join(" AND ")}`
    : "";

  const offset = (page - 1) * limit;

  // Main query: return features sorted by nearest distance
  const query = {
    text: `
      SELECT f.id,
             f.type,
             f.name,
             f.description,
             f.image_url,
             ST_AsGeoJSON(n.geom)::json AS geom,
             ST_DistanceSphere(
               n.geom,
               ST_SetSRID(ST_MakePoint($1,$2),4326)
             ) AS distance_m
      FROM temple_features f
      JOIN temple_nodes n ON f.node_id = n.id
      WHERE 1=1
      ${whereClause}
      ORDER BY ST_DistanceSphere(n.geom, ST_SetSRID(ST_MakePoint($1,$2),4326))
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    values: [...values, limit, offset],
  };

  // Count query: for pagination (no ORDER BY, no LIMIT)
  const countQuery = {
    text: `
      SELECT COUNT(*) AS total
      FROM temple_features f
      JOIN temple_nodes n ON f.node_id = n.id
      WHERE 1=1
      ${whereClause}
    `,
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

  /**
   * Find nearby features grouped by floor/zone.
   * If floor is provided, search only on that floor.
   * If floor is not provided, auto-detect by finding the nearest node.
   *
   * @param {number} lat - User latitude
   * @param {number} lon - User longitude
   * @param {object} options
   * @param {number} [options.radius] - Search radius in meters
   * @param {number} [options.floor] - Explicit floor (skip auto-detect)
   * @param {object} [client=pool] - DB client
   * @returns {Promise<{ floor_detected: number, data: Array }>}
   */
  async findNearbyGrouped(lat, lon, { radius, floor } = {}, client = pool) {
    const userPoint = `ST_SetSRID(ST_MakePoint(${lon},${lat}),4326)`;
    let detectedFloor = floor;

    // Auto-detect floor from nearest node if not provided
    if (!detectedFloor) {
      const detectQuery = {
        text: `
          SELECT floor
          FROM temple_nodes
          WHERE floor IS NOT NULL
          ORDER BY geom <-> ${userPoint}
          LIMIT 1
        `,
      };
      const detectResult = await client.query(detectQuery);

      if (!detectResult.rows.length || detectResult.rows[0].floor === null) {
        return { floor_detected: null, data: [] };
      }

      detectedFloor = detectResult.rows[0].floor;
    }

    // Build the features query with optional radius filter
    const values = [detectedFloor, lon, lat];
    let idx = 4;
    let radiusCondition = "";

    if (radius) {
      radiusCondition = `AND ST_DWithin(n.geom::geography, ST_SetSRID(ST_MakePoint($2,$3),4326)::geography, $${idx++})`;
      values.push(radius);
    }

    const query = {
      text: `
        SELECT f.id,
               f.type,
               f.name,
               f.description,
               f.image_url,
               f.radius,
               n.floor,
               n.zone,
               ST_AsGeoJSON(n.geom)::json AS geom,
               ST_DistanceSphere(n.geom, ST_SetSRID(ST_MakePoint($2,$3),4326)) AS distance_m
        FROM temple_features f
        JOIN temple_nodes n ON f.node_id = n.id
        WHERE n.floor = $1
        ${radiusCondition}
        ORDER BY distance_m
      `,
      values,
    };

    const { rows } = await client.query(query);
    return { floor_detected: detectedFloor, data: rows };
  }

}

module.exports = new TempleFeaturesRepository();
