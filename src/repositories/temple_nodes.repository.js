const pool = require("../config/db");

class TempleNodesRepository {
  async findAll(filters = {}, client = pool) {
    const { bbox } = filters;

    const whereConditions = [];
    const values = [];
    let idx = 1;

    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
      whereConditions.push(
        `ST_Intersects(geom, ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326))`
      );
      values.push(minLon, minLat, maxLon, maxLat);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const query = {
      text: `
        SELECT id, name, ST_AsGeoJSON(geom)::json AS geom
        FROM temple_nodes
        ${whereClause}
      `,
      values,
    };

    const { rows } = await client.query(query);
    return rows;
  }

  async findById(id, client = pool) {
    const query = {
      text: `SELECT id, name, ST_AsGeoJSON(geom)::json AS geom FROM temple_nodes WHERE id = $1 LIMIT 1`,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }
}

module.exports = new TempleNodesRepository();
