// repositories/edges.repository.js

const pool = require("../config/db");

class EdgesRepository {
  /**
   * Get all edges
   */
  async findAll(client = pool) {
    const query = `
      SELECT
        id,
        source,
        target,
        cost,
        ST_AsGeoJSON(geom)::json AS geom
      FROM edges
    `;
    const { rows } = await client.query(query);
    return rows;
  }

  /**
   * Get edge by ID
   */
  async findById(id, client = pool) {
    const query = {
      text: `
        SELECT
          id,
          source,
          target,
          cost,
          ST_AsGeoJSON(geom)::json AS geom
        FROM edges
        WHERE id = $1
        LIMIT 1
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Create a new edge
   */
  async create({ source, target, cost, geom }, client = pool) {
    const query = {
      text: `
        INSERT INTO edges (source, target, cost, geom)
        VALUES (
          $1,
          $2,
          $3,
          ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
        )
        RETURNING
          id,
          source,
          target,
          cost,
          ST_AsGeoJSON(geom)::json AS geom
      `,
      values: [source, target, cost, JSON.stringify(geom)],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  /**
   * Update an existing edge (partial updates supported)
   */
  async update(id, data, client = pool) {
    const { source, target, cost, geom } = data;
    const fields = [];
    const values = [];
    let idx = 1;

    if (source !== undefined) {
      fields.push(`source = $${idx++}`);
      values.push(source);
    }
    if (target !== undefined) {
      fields.push(`target = $${idx++}`);
      values.push(target);
    }
    if (cost !== undefined) {
      fields.push(`cost = $${idx++}`);
      values.push(cost);
    }
    if (geom !== undefined) {
      fields.push(`geom = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`);
      values.push(JSON.stringify(geom));
    }

    // If no fields to update, just return the existing row
    if (fields.length === 0) {
      return this.findById(id, client);
    }

    // Add the id for the WHERE clause
    values.push(id);

    const query = {
      text: `
        UPDATE edges
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        RETURNING
          id,
          source,
          target,
          cost,
          ST_AsGeoJSON(geom)::json AS geom
      `,
      values,
    };

    const { rows } = await client.query(query);
    return rows[0];
  }

  /**
   * Delete an edge
   */
  async remove(id, client = pool) {
    const query = {
      text: `DELETE FROM edges WHERE id = $1`,
      values: [id],
    };
    await client.query(query);
  }

  /**
   * Compute shortest path between two nodes using pgRouting
   */
  async shortestPath(source, target) {
    const query = `
      SELECT
        seq,
        node,
        edge,
        cost,
        ST_AsGeoJSON(e.geom)::json AS geom
      FROM pgr_dijkstra(
        'SELECT id, source, target, cost FROM edges',
        $1,
        $2,
        false
      ) AS dij
      JOIN edges e ON dij.edge = e.id
      ORDER BY seq
    `;
    const { rows } = await pool.query(query, [source, target]);
    // Map to clean JSON
    return rows.map(r => ({
      seq:   r.seq,
      node:  r.node,
      edge:  r.edge,
      cost:  r.cost,
      geom:  r.geom,
    }));
  }
}

module.exports = new EdgesRepository();
