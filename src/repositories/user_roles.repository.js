const pool = require("../config/db");

class UserRolesRepository {
  async assignRole(user_id, role_id, client = pool) {
    const query = {
      text: `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      values: [user_id, role_id],
    };
    await client.query(query);
  }

  async removeRole(user_id, role_id, client = pool) {
    const query = {
      text: `
        DELETE FROM user_roles
        WHERE user_id = $1 AND role_id = $2
      `,
      values: [user_id, role_id],
    };
    await client.query(query);
  }

  async getUserRoles(user_id, client = pool) {
    const query = {
      text: `
        SELECT r.*
        FROM roles r
        INNER JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `,
      values: [user_id],
    };
    const { rows } = await client.query(query);
    return rows;
  }
}

module.exports = new UserRolesRepository();
