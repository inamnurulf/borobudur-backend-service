const pool = require("../config/db");

class UserProvidersRepository {
  async createProvider(user_id, provider, provider_user_id, refresh_token = null, scope = null, client = pool) {
    const query = {
      text: `
        INSERT INTO user_providers (user_id, provider, provider_user_id, refresh_token, scope)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      values: [user_id, provider, provider_user_id, refresh_token, scope],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async findByProvider(provider, provider_user_id, client = pool) {
    const query = {
      text: `
        SELECT * FROM user_providers
        WHERE provider = $1 AND provider_user_id = $2
        LIMIT 1
      `,
      values: [provider, provider_user_id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async updateRefreshToken(id, refresh_token, client = pool) {
    const query = {
      text: `
        UPDATE user_providers
        SET refresh_token = $1, updated_at = now()
        WHERE id = $2
        RETURNING *
      `,
      values: [refresh_token, id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async getProvidersByUser(user_id, client = pool) {
    const query = {
      text: `
        SELECT * FROM user_providers
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      values: [user_id],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async deleteProvider(id, client = pool) {
    const query = {
      text: `DELETE FROM user_providers WHERE id = $1`,
      values: [id],
    };
    await client.query(query);
  }
}

module.exports = new UserProvidersRepository();
