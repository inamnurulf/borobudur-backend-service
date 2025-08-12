const pool = require("../config/db");

class PoiRepository {
  /**
   * Retrieves all POIs with pagination.
   * @param {number} limit - The number of records to return.
   * @param {number} offset - The number of records to skip.
   * @returns {Promise<Array>} A promise that resolves to an array of POIs.
   */
  async findAllWithPagination(limit, offset) {
    const query = `
      SELECT
          poi.id,
          poi.description,
          poi.opening_hours,
          poi.contact_info,
          poi.image_url,
          poi.rating,
          poi.metadata,
          ST_AsGeoJSON(nodes.geom)::json as geometry,
          ARRAY_AGG(DISTINCT pcm.category_id) AS category_ids
      FROM
          points_of_interest AS poi
      JOIN
          nodes ON poi.node_id = nodes.id
      LEFT JOIN
          poi_category_mapping AS pcm ON poi.id = pcm.poi_id
      GROUP BY
          poi.id, nodes.geom
      ORDER BY
          poi.id
      LIMIT $1 OFFSET $2;
    `;
    const { rows } = await pool.query(query, [limit, offset]);
    return rows;
  }

  /**
   * Counts the total number of POIs.
   * @returns {Promise<number>} The total count of POIs.
   */
  async countAll() {
    const query = `SELECT COUNT(*) FROM points_of_interest;`;
    const { rows } = await pool.query(query);
    return parseInt(rows[0].count);
  }

  /**
   * Finds a point of interest by its ID.
   * @param {number} id - The ID of the POI to find.
   * @param {object} client - The database client (e.g., pool or transaction client).
   * @returns {Promise<object|null>} A promise that resolves to the POI object or null if not found.
   */
  async findById(id, client = pool) {
    const query = {
      text: `
        SELECT
            poi.id,
            poi.node_id,
            poi.description,
            poi.opening_hours,
            poi.contact_info,
            poi.image_url,
            poi.rating,
            poi.metadata,
            poi.is_active,
            poi.created_at,
            poi.updated_at,
            ST_AsGeoJSON(nodes.geom)::json as geometry,
            ARRAY_AGG(DISTINCT pcm.category_id) FILTER (WHERE pcm.category_id IS NOT NULL) AS category_ids
        FROM
            points_of_interest AS poi
        JOIN
            nodes ON poi.node_id = nodes.id
        LEFT JOIN
            poi_category_mapping AS pcm ON poi.id = pcm.poi_id
        WHERE
            poi.id = $1
        GROUP BY
            poi.id, nodes.geom;
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Creates a new point of interest and links it to categories.
   * This method expects to be called within a transaction if categoryIds are provided.
   * @param {number} node_id - The ID of the associated node.
   * @param {string} description - The description of the POI.
   * @param {object} opening_hours - JSONB object for opening hours.
   * @param {object} contact_info - JSONB object for contact information.
   * @param {string} image_url - URL to an image of the POI.
   * @param {number} rating - Rating of the POI (numeric).
   * @param {object} metadata - JSONB object for additional metadata.
   * @param {boolean} is_active - Whether the POI is active.
   * @param {Array<number>} category_ids - An array of category IDs to link.
   * @param {object} client - The database client (e.g., pool or transaction client).
   * @returns {Promise<object>} A promise that resolves to the newly created POI.
   */
  async createPOI(
    node_id,
    description,
    opening_hours,
    contact_info,
    image_url,
    rating,
    metadata,
    is_active,
    category_ids = [],
    client = pool
  ) {
    const poiQuery = {
      text: `
        INSERT INTO points_of_interest (node_id, description, opening_hours, contact_info, image_url, rating, metadata, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, node_id, description, opening_hours, contact_info, image_url, rating, metadata, is_active, created_at, updated_at;
      `,
      values: [
        node_id,
        description,
        opening_hours,
        contact_info,
        image_url,
        rating,
        metadata,
        is_active,
      ],
    };

    const { rows } = await client.query(poiQuery);
    const newPoi = rows[0];

    if (category_ids.length > 0) {
      const categoryMappingValues = category_ids
        .map((catId) => `(${newPoi.id}, ${catId})`)
        .join(", ");
      const mappingQuery = `
        INSERT INTO poi_category_mapping (poi_id, category_id)
        VALUES ${categoryMappingValues};
      `;
      await client.query(mappingQuery);
    }

    return newPoi;
  }

  /**
   * Updates an existing point of interest.
   * This method expects to be called within a transaction if category_ids are updated.
   * @param {number} id - The ID of the POI to update.
   * @param {object} data - An object containing fields to update (e.g., { description, rating, category_ids }).
   * @param {object} client - The database client (e.g., pool or transaction client).
   * @returns {Promise<object|null>} A promise that resolves to the updated POI object or null if not found.
   */
  async updatePOI(id, data, client = pool) {
    const {
      node_id,
      description,
      opening_hours,
      contact_info,
      image_url,
      rating,
      metadata,
      is_active,
      category_ids,
    } = data;

    const fields = [];
    const values = [];
    let idx = 1;

    if (node_id !== undefined) {
      fields.push(`node_id = $${idx++}`);
      values.push(node_id);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (opening_hours !== undefined) {
      fields.push(`opening_hours = $${idx++}`);
      values.push(opening_hours);
    }
    if (contact_info !== undefined) {
      fields.push(`contact_info = $${idx++}`);
      values.push(contact_info);
    }
    if (image_url !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(image_url);
    }
    if (rating !== undefined) {
      fields.push(`rating = $${idx++}`);
      values.push(rating);
    }
    if (metadata !== undefined) {
      fields.push(`metadata = $${idx++}`);
      values.push(metadata);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 1 && fields[0] === "updated_at = CURRENT_TIMESTAMP") {
      // Only updated_at, no other fields
      return this.findById(id, client); // No actual data fields to update
    }

    const poiUpdateQuery = {
      text: `
        UPDATE points_of_interest
        SET ${fields.join(", ")}
        WHERE id = $${idx++}
        RETURNING id, node_id, description, opening_hours, contact_info, image_url, rating, metadata, is_active, created_at, updated_at;
      `,
      values: [...values, id],
    };

    const { rows } = await client.query(poiUpdateQuery);
    const updatedPoi = rows[0];

    // Handle category updates if provided
    if (category_ids !== undefined) {
      // Delete existing mappings
      await client.query(
        `DELETE FROM poi_category_mapping WHERE poi_id = $1;`,
        [id]
      );

      // Insert new mappings if any categories are provided
      if (category_ids.length > 0) {
        const categoryMappingValues = category_ids
          .map((catId) => `(${id}, ${catId})`)
          .join(", ");
        const insertMappingQuery = `
          INSERT INTO poi_category_mapping (poi_id, category_id)
          VALUES ${categoryMappingValues};
        `;
        await client.query(insertMappingQuery);
      }
    }

    return updatedPoi;
  }

  /**
   * Deletes a point of interest by its ID.
   * @param {number} id - The ID of the POI to delete.
   * @param {object} client - The database client (e.g., pool or transaction client).
   * @returns {Promise<void>}
   */
  async deletePOI(id, client = pool) {
    const query = {
      text: `DELETE FROM points_of_interest WHERE id = $1`,
      values: [id],
    };
    await client.query(query);
  }

  /**
   * Finds POIs within a given radius of a coordinate.
   * @param {number} lat - Latitude of the center point.
   * @param {number} lon - Longitude of the center point.
   * @param {number} radius - Radius in meters.
   * @param {number} limit - Maximum number of results to return.
   * @returns {Promise<Array>} A promise that resolves to an array of nearby POIs.
   */
  async findNearby(lat, lon, radius, limit) {
    const query = `
      SELECT
          poi.id,
          poi.description,
          poi.opening_hours,
          poi.contact_info,
          poi.image_url,
          poi.rating,
          poi.metadata,
          ST_AsGeoJSON(nodes.geom)::json as geometry,
          ST_Distance(nodes.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance_meters,
          ARRAY_AGG(DISTINCT pcm.category_id) FILTER (WHERE pcm.category_id IS NOT NULL) AS category_ids
      FROM
          points_of_interest AS poi
      JOIN
          nodes ON poi.node_id = nodes.id
      LEFT JOIN
          poi_category_mapping AS pcm ON poi.id = pcm.poi_id
      WHERE
          ST_DWithin(nodes.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
      GROUP BY
          poi.id, nodes.geom
      ORDER BY
          distance_meters
      LIMIT $4;
    `;
    const { rows } = await pool.query(query, [lat, lon, radius, limit]);
    return rows;
  }

  /**
   * Computes the shortest path from a starting coordinate to a specific POI using pgRouting.
   * This version handles a starting point that is not on a node.
   * @param {number} startLat - Latitude of the starting point.
   * @param {number} startLon - Longitude of the starting point.
   * @param {number} endPoiId - ID of the destination POI.
   * @param {object} client - The database client (e.g., pool or transaction client).
   * @returns {Promise<object>} A promise that resolves to the route data.
   */
 /**
   * Computes the shortest path from a starting coordinate to a specific POI using pgRouting.
   * This version finds the nearest node to the starting point.
   * @param {number} startLat - Latitude of the starting point.
   * @param {number} startLon - Longitude of the starting point.
   * @param {number} endPoiId - ID of the destination POI.
   * @param {object} client - The database client (e.g., pool or transaction client).
   * @returns {Promise<object>} A promise that resolves to the route data or null if no path.
   */
  async findShortestPath(startLat, startLon, endPoiId, client = pool) {
    const routingQuery = `
      WITH start_point AS (
        -- Find the ID of the node closest to the user's starting coordinates.
        -- ST_MakePoint uses (longitude, latitude).
        SELECT
            id AS start_node_id
        FROM
            nodes
        ORDER BY
            geom <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)
        LIMIT 1
      ),
      end_point AS (
        -- Find the node ID associated with the destination Point of Interest.
        SELECT
            node_id AS end_node_id
        FROM
            points_of_interest
        WHERE
            id = $3
      )
      SELECT
          SUM(di.cost) AS total_cost,
          ST_AsGeoJSON(ST_Collect(e.geom))::json AS route_geometry
      FROM
          pgr_dijkstra(
              'SELECT id, source, target, cost FROM edges',
              (SELECT start_node_id FROM start_point),
              (SELECT end_node_id FROM end_point),
              FALSE
          ) AS di
      JOIN
          edges AS e ON di.edge = e.id;
    `;

    // Execute the query. Parameters passed in order: startLat, startLon, endPoiId
    const { rows: routeRows } = await client.query(routingQuery, [startLat, startLon, endPoiId]);
    
    // If no route is found (total_cost is null or no rows returned), return null.
    if (!routeRows || routeRows.length === 0 || routeRows[0].total_cost === null) {
      return null;
    }

    return routeRows[0];
  }
}

module.exports = new PoiRepository();
