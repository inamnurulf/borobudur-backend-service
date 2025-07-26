const usersRepository = require("../../repositories/users.repository");
const rolesRepository = require("../../repositories/roles.repository");
const userRolesRepository = require("../../repositories/user_roles.repository");
const verificationCodeRepository = require("../../repositories/verification_codes.repository");
const emailService = require("../../config/nodemailer");
const bcrypt = require("bcrypt");
const {
  generateVerificationCode,
} = require("../../helpers/generateVerificationCode");
const { successResponse } = require("../../helpers/response");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");
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

  async login(req, res, next) {
    try {
      // TODO: implement login logic
    } catch (err) {
      next(err);
    }
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

    await verificationCodeRepository.deleteCodesByUser(
      user.id,
      client
    );

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


  async deleteUser(req, res, next) {
    try {
      // TODO: implement delete user logic
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsersController();
