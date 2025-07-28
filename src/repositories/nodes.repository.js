// repositories/nodes.repository.js
const pool = require("../config/db");

class NodesRepository {
  async findAll(client = pool) {
    const query = `SELECT id, name, type, ST_AsGeoJSON(geom)::json AS geom FROM nodes`;
    const { rows } = await client.query(query);
    return rows;
  }

  async findById(id, client = pool) {
    const query = {
      text: `SELECT id, name, type, ST_AsGeoJSON(geom)::json AS geom FROM nodes WHERE id = $1 LIMIT 1`,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async createNode(name, type, lon, lat, client = pool) {
    const query = {
      text: `
        INSERT INTO nodes (name, type, geom)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        RETURNING id, name, type, ST_AsGeoJSON(geom)::json AS geom
      `,
      values: [name, type, lon, lat],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async updateNode(id, data, client = pool) {
    const { name, type, longitude, latitude } = data;

    // build dynamic parts
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(type);
    }
    if (longitude !== undefined && latitude !== undefined) {
      fields.push(`geom = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`);
      values.push(longitude, latitude);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    const query = {
      text: `
        UPDATE nodes
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        RETURNING id, name, type, ST_AsGeoJSON(geom)::json AS geom
      `,
      values: [...values, id],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async deleteNode(id, client = pool) {
    const query = { text: `DELETE FROM nodes WHERE id = $1`, values: [id] };
    await client.query(query);
  }
}

module.exports = new NodesRepository();
