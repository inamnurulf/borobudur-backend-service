const pool = require("../config/db");

class VerificationCodeRepository {
  /**
   * Create a new verification code
   * @param {string} user_id - UUID of the user
   * @param {string} code - The code value
   * @param {string} purpose - Purpose like 'signup', 'reset_password', etc.
   * @param {Date} expires_at - Expiration timestamp
   * @param {object} client - Optional pg client/transaction
   */
  async createVerificationCode(user_id, code, purpose, expires_at, client = pool) {
    const query = {
      text: `
        INSERT INTO verification_codes (user_id, code, purpose, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      values: [user_id, code, purpose, expires_at],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  /**
   * Update a verification code by user_id and purpose
   * @param {string} user_id - UUID
   * @param {string} purpose - Purpose to match
   * @param {string} newCode - New code value
   * @param {Date} newExpiresAt - New expiration
   * @param {object} client - Optional pg client/transaction
   */
  async updateVerificationCode(user_id, purpose, newCode, newExpiresAt, client = pool) {
    const query = {
      text: `
        UPDATE verification_codes
        SET code = $1, expires_at = $2, used_at = NULL
        WHERE user_id = $3 AND purpose = $4
        RETURNING *
      `,
      values: [newCode, newExpiresAt, user_id, purpose],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  /**
   * Mark a code as used
   * @param {number} id - id of the verification_code
   * @param {object} client - Optional pg client/transaction
   */
  async markCodeAsUsed(id, client = pool) {
    const query = {
      text: `
        UPDATE verification_codes
        SET used_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0];
  }

  /**
   * Get a valid (not expired, not used) code by user and purpose
   * @param {string} user_id - UUID
   * @param {string} purpose - Purpose
   * @param {object} client - Optional pg client/transaction
   */
  async getValidCodeByUserAndPurpose(user_id, purpose, client = pool) {
    const query = {
      text: `
        SELECT *
        FROM verification_codes
        WHERE user_id = $1
          AND purpose = $2
          AND used_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `,
      values: [user_id, purpose],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Delete all codes by user (e.g. cleanup)
   * @param {string} user_id - UUID
   * @param {object} client - Optional pg client/transaction
   */
  async deleteCodesByUser(user_id, client = pool) {
    const query = {
      text: `
        DELETE FROM verification_codes
        WHERE user_id = $1
      `,
      values: [user_id],
    };
    await client.query(query);
  }
}

module.exports = new VerificationCodeRepository();
