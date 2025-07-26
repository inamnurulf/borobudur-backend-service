const pool = require("../config/db");

class RolesRepository {
  async createRole(name, client = pool) {
    const query = {
      text: `
        INSERT INTO roles (name)
        VALUES ($1)
        RETURNING *
      `,
      values: [name],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async getAllRoles(client = pool) {
    const query = {
      text: `
        SELECT *
        FROM roles
        WHERE deleted_at IS NULL
        ORDER BY id ASC
      `,
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async findByName(name, client = pool) {
    const query = {
      text: `
        SELECT *
        FROM roles
        WHERE name = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      values: [name],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async deleteRole(id, client = pool) {
    const query = {
      text: `
        UPDATE roles
        SET deleted_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }
}

module.exports = new RolesRepository();
