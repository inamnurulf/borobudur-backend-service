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
  
}

module.exports = new UserRepository();
