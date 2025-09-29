const usersRepository = require("../../repositories/users.repository");
const rolesRepository = require("../../repositories/roles.repository");
const userRolesRepository = require("../../repositories/user_roles.repository");
const verificationCodeRepository = require("../../repositories/verification_codes.repository");
const refreshTokensRepository = require("../../repositories/refresh_tokens.repository");
const emailService = require("../../config/nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  generateVerificationCode,
} = require("../../helpers/generateVerificationCode");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");
const crypto = require("crypto");

const ACCESS_TOKEN_EXP = process.env.JWT_ACCESS_EXP || "15m";
const REFRESH_TOKEN_EXP_DAYS = process.env.JWT_REFRESH_EXP_DAYS || 30;

class UsersController {
  async register(req) {
    const { email, password, name, avatar_url } = req.body;

    if (!email || !password || !name) {
      throw new CustomError({
        message: "Email, password, and name are required",
        statusCode: 400,
      });
    }

    const { user, code } = await withTransaction(async (client) => {
      const existing = await usersRepository.findByEmail(email, client);
      if (existing) {
        throw new CustomError({
          message: "Email already in use",
          statusCode: 409,
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await usersRepository.createUser(
        email,
        name,
        avatar_url,
        hashedPassword,
        false,
        client
      );

      const role = await rolesRepository.findByName("user", client);
      if (role) {
        await userRolesRepository.assignRole(newUser.id, role.id, client);
      }

      const rawCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await verificationCodeRepository.createVerificationCode(
        newUser.id,
        rawCode,
        "email_verification",
        expiresAt,
        client
      );

      return { user: newUser, code: rawCode };
    });

    // send email after commit
    await emailService.sendRegisterMail({
      to: email,
      name,
      code,
    });

    return {
      message: "User registered successfully. Verification code sent.",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  async getUserById(req, res, next) {
    try {
      // TODO: implement get user by id logic
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      // TODO: implement update profile logic
    } catch (err) {
      next(err);
    }
  }

  async login(req) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError({
        message: "Email and password are required",
        statusCode: 400,
      });
    }

    const { user, accessToken, refreshToken } = await withTransaction(
      async (client) => {
        const user = await usersRepository.findByEmail(email, client);
        if (!user) {
          throw new CustomError({
            message: "Invalid credentials",
            statusCode: 401,
          });
        }

        const validPassword = await bcrypt.compare(
          password,
          user.password_hash
        );
        if (!validPassword) {
          throw new CustomError({
            message: "Invalid credentials",
            statusCode: 401,
          });
        }

        if (!user.is_email_verified) {
          throw new CustomError({
            message: "Email not verified",
            statusCode: 403,
          });
        }

        // create tokens
        const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
          expiresIn: ACCESS_TOKEN_EXP,
        });

        const rawRefreshToken = jwt.sign(
          {
            sub: user.id,
            jti: crypto.randomBytes(16).toString("hex"),
          },
          process.env.JWT_REFRESH_SECRET,
          {
            expiresIn: `${REFRESH_TOKEN_EXP_DAYS}d`,
          }
        );

        const expiresAt = new Date(
          Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000
        );

        // revoke all old tokens for user (optional cleanup)
        await refreshTokensRepository.revokeAllForUser(user.id, client);

        // Store plain token (your repository's createRefreshToken expects token_hash parameter)
        await refreshTokensRepository.createRefreshToken(
          user.id,
          rawRefreshToken, // 👈 Pass plain token, it goes into token_hash column
          expiresAt,
          client
        );

        return { user, accessToken, refreshToken: rawRefreshToken };
      }
    );

    return {
      message: "Login successful",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    };
  }

  async verifyEmail(req) {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new CustomError({
        message: "email and code are required",
        statusCode: 400,
      });
    }

    await withTransaction(async (client) => {
      const user = await usersRepository.findByEmail(email, client);

      if (!user) {
        throw new CustomError({
          message: "User not found",
          statusCode: 404,
        });
      }

      const verification =
        await verificationCodeRepository.getValidCodeByUserAndPurpose(
          user.id,
          "email_verification",
          client
        );

      if (!verification) {
        throw new CustomError({
          message: "Invalid or expired verification code",
          statusCode: 400,
        });
      }
      if (verification.code !== code) {
        console.log("Verification code mismatch", {
          provided: code,
          expected: verification.code,
        });
        throw new CustomError({
          message: "Invalid verification code",
          statusCode: 400,
        });
      }

      await verificationCodeRepository.markCodeAsUsed(verification.id, client);
      await usersRepository.verifyEmail(user.id, client);
    });

    return {
      message: "Email verified successfully.",
      data: {
        email,
        verified: true,
      },
    };
  }

  async resendVerification(req) {
    const { email } = req.body;

    if (!email) {
      throw new CustomError({
        message: "email is required",
        statusCode: 400,
      });
    }

    const { user, code } = await withTransaction(async (client) => {
      const user = await usersRepository.findByEmail(email, client);
      if (!user) {
        throw new CustomError({
          message: "User not found",
          statusCode: 404,
        });
      }

      if (user.is_email_verified) {
        throw new CustomError({
          message: "Email already verified",
          statusCode: 400,
        });
      }

      await verificationCodeRepository.deleteCodesByUser(user.id, client);

      // Generate new code
      const rawCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await verificationCodeRepository.createVerificationCode(
        user.id,
        rawCode,
        "email_verification",
        expiresAt,
        client
      );

      return { user, code: rawCode };
    });

    // send email after commit
    await emailService.sendRegisterMail({
      to: email,
      name: user.name,
      code,
    });

    return {
      message: "Verification code resent successfully.",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  async refreshToken(req) {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new CustomError({
        message: "refresh_token is required",
        statusCode: 400,
      });
    }

    const { newAccessToken, newRefreshToken } = await withTransaction(
      async (client) => {
        // 1) Verify the incoming refresh token JWT
        let payload;
        try {
          payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
        } catch {
          throw new CustomError({
            message: "Invalid refresh token",
            statusCode: 401,
          });
        }
        const userId = payload.sub;

        // 2) Find the token directly using findValidToken
        // This method does: WHERE token_hash = $1 AND revoked_at IS NULL
        const storedToken = await refreshTokensRepository.findValidToken(
          refresh_token, // 👈 Pass the plain token
          client
        );

        if (!storedToken) {
          throw new CustomError({
            message: "Refresh token not found or expired",
            statusCode: 401,
          });
        }

        // 3) Revoke the old token (rotation)
        await refreshTokensRepository.revokeToken(storedToken.id, client);

        // 4) Generate new refresh token with unique JTI
        const days = Number(REFRESH_TOKEN_EXP_DAYS) || 30;
        const rawNewRefreshToken = jwt.sign(
          {
            sub: userId,
            jti: crypto.randomBytes(16).toString("hex"),
          },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: `${days}d` }
        );

        const newRtExpiresAt = new Date(
          Date.now() + days * 24 * 60 * 60 * 1000
        );

        // 5) Store new plain token
        await refreshTokensRepository.createRefreshToken(
          userId,
          rawNewRefreshToken, // 👈 Store plain token in token_hash column
          newRtExpiresAt,
          client
        );

        // 6) Generate new access token
        const rawNewAccessToken = jwt.sign(
          { sub: userId },
          process.env.JWT_SECRET,
          { expiresIn: ACCESS_TOKEN_EXP }
        );

        return {
          newAccessToken: rawNewAccessToken,
          newRefreshToken: rawNewRefreshToken,
        };
      }
    );

    return {
      message: "Token refreshed successfully",
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      },
    };
  }

  async logout(req) {
    const { refreshToken } = req.body;

    await withTransaction(async (client) => {
      // 1) Verify the refresh token JWT
      let payload;
      try {
        payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch {
        throw new CustomError({
          message: "Invalid refresh token",
          statusCode: 401,
        });
      }

      const storedToken = await refreshTokensRepository.findValidToken(
        refreshToken,
        client
      );

      if (!storedToken) {
        throw new CustomError({
          message: "Refresh token not found or already revoked",
          statusCode: 404,
        });
      }

      // 3) Revoke this specific token
      await refreshTokensRepository.revokeToken(storedToken.id, client);
    });

    return {
      message: "Logout successful",
      data: {
        logged_out: true,
      },
    };
  }

  async deleteUser(req, res, next) {
    try {
      // TODO: implement delete user logic
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsersController();
