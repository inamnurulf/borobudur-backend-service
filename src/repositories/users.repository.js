const pool = require("../config/db");

class UsersRepository {
  /**
   * Create a new user
   * @param {string} email
   * @param {string|null} name
   * @param {string|null} avatar_url
   * @param {string|null} password_hash
   * @param {object} client
   */
async createUser(email, name = null, avatar_url = null, password_hash = null, isEmailVerified = false, client = pool) {
  const query = {
    text: `
      INSERT INTO users (email, name, avatar_url, password_hash, is_email_verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    values: [email, name, avatar_url, password_hash, isEmailVerified],
  };
  const { rows } = await client.query(query);
  return rows[0];
}

  /**
   * Find user by email
   * @param {string} email
   * @param {object} client
   */
  async findByEmail(email, client = pool) {
    const query = {
      text: `
        SELECT *
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      values: [email],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Find user by id
   * @param {string} id
   * @param {object} client
   */
  async findById(id, client = pool) {
    const query = {
      text: `
        SELECT *
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Update user fields
   * @param {string} id
   * @param {object} fields - { name, avatar_url, password_hash }
   * @param {object} client
   */
  async updateUser(id, fields, client = pool) {
    const allowed = ["name", "avatar_url", "password_hash"];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`"${key}" = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }

    if (sets.length === 0) return null;

    // add updated_at
    sets.push(`updated_at = now()`);

    const query = {
      text: `
        UPDATE users
        SET ${sets.join(", ")}
        WHERE id = $${idx}
        RETURNING *
      `,
      values: [...values, id],
    };

    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Update last_login_at
   * @param {string} id
   * @param {object} client
   */
  async updateLastLogin(id, client = pool) {
    const query = {
      text: `
        UPDATE users
        SET last_login_at = now()
        WHERE id = $1
        RETURNING *
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Mark email as verified
   * @param {string} id
   * @param {object} client
   */
  async verifyEmail(id, client = pool) {
    const query = {
      text: `
        UPDATE users
        SET is_email_verified = true, updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Delete user
   * @param {string} id
   * @param {object} client
   */
  async deleteUser(id, client = pool) {
    const query = {
      text: `
        DELETE FROM users
        WHERE id = $1
      `,
      values: [id],
    };
    await client.query(query);
  }
}

module.exports = new UsersRepository();
