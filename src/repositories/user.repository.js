const pool = require("../config/db");

class UserRepository {
  async findByEmail(email) {
    const query = {
      text: "SELECT * FROM users WHERE email = $1",
      values: [email],
    };
    const res = await pool.query(query);
    return res.rows[0];
  }

  async create({ name, email, passwordHash, verificationCode }) {
    const res = await pool.query(
      `INSERT INTO users (name, email, password_hash, verification_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active`,
      [name, email, passwordHash, verificationCode]
    );
    return res.rows[0];
  }

  async activateAccount(email) {
    const res = await pool.query(
      `UPDATE users
       SET is_active = TRUE,
           verification_code = NULL
       WHERE email = $1
       RETURNING id, name, email, role, is_active`,
      [email]
    );
    return res.rows[0];
  }
  
  async saveRefreshToken({ userId, refreshToken, expiresAt }) {
    const query = {
      text: `
        INSERT INTO tokens (user_id, refresh_token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, refresh_token, created_at, expires_at, is_revoked
      `,
      values: [userId, refreshToken, expiresAt],
    };
  
    const res = await pool.query(query);
    return res.rows[0];
  }

  async findByRefreshToken(refreshToken) {
    const query = {
      text: `
        SELECT * FROM tokens
        WHERE refresh_token = $1
          AND is_revoked = FALSE
          AND expires_at > NOW()
      `,
      values: [refreshToken],
    };
  
    const res = await pool.query(query);
    return res.rows[0];
  } 

  async revokeRefreshToken(tokenId) {
    const query = {
      text: `
        UPDATE tokens
        SET is_revoked = TRUE
        WHERE id = $1
      `,
      values: [tokenId],
    };
  
    await pool.query(query);
  }
  async revokeAllRefreshTokens(userId) {
    const query = {
      text: `
        UPDATE tokens
        SET is_revoked = TRUE
        WHERE user_id = $1`,
      values: [userId],
    };
  
    await pool.query(query);
  }
  
  async updateVerificationCode(email, code) {
    const query = {
      text: `
        UPDATE users
        SET verification_code = $1
        WHERE email = $2
      `,
      values: [code, email],
    };
    await pool.query(query);
  }

  async updatePassword(email, passwordHash) {
    const query = {
      text: `
        UPDATE users
        SET password_hash = $1,
            verification_code = NULL
        WHERE email = $2
      `,
      values: [passwordHash, email],
    };
    await pool.query(query);
  }
}

module.exports = new UserRepository();
