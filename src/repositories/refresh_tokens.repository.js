const pool = require("../config/db");

class RefreshTokensRepository {
  async createRefreshToken(user_id, token_hash, expires_at, client = pool) {
    const query = {
      text: `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      values: [user_id, token_hash, expires_at],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  async findValidToken(token_hash, client = pool) {
    const query = {
      text: `
        SELECT * FROM refresh_tokens
        WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
        LIMIT 1
      `,
      values: [token_hash],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async revokeToken(id, client) {
    const query = {
      text: `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async revokeAllForUser(user_id, client) {
    const query = {
      text: `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      values: [user_id],
    };
    await client.query(query);
  }

  async findAllValidByUser(user_id, client = pool) {
    const query = {
      text: `
      SELECT * FROM refresh_tokens
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
    `,
      values: [user_id],
    };
    const { rows } = await client.query(query);
    return rows;
  }

  async deleteExpiredTokens(client = pool) {
    const query = {
      text: `
        DELETE FROM refresh_tokens
        WHERE expires_at <= NOW()
      `,
    };
    await client.query(query);
  }
}

module.exports = new RefreshTokensRepository();
