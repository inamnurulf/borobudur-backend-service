const userRepository = require("../../repositories/user.repository");
const emailService = require("../../config/nodemailer");
const bcrypt = require("bcrypt");
const {
  generateVerificationCode,
} = require("../../helpers/generateVerificationCode");
const jwt = require("jsonwebtoken");
const CustomError = require("../../helpers/customError");

const register = async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const userExists = await userRepository.findByEmail(normalizedEmail);
  if (userExists)
    throw new CustomError({ message: "User already exists", statusCode: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationCode = generateVerificationCode();

  const user = await userRepository.create({
    name,
    email: normalizedEmail,
    passwordHash,
    verificationCode,
  });

  await emailService.sendRegisterMail({
    to: normalizedEmail,
    name,
    code: verificationCode,
  });

  return { message: "User registered. Please verify your email.", user };
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email.toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new CustomError({ message: "User not found", statusCode: 404 });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new CustomError({
      message: "Invalid email or password",
      statusCode: 401,
    });
  }

  if (!user.is_active) {
    throw new CustomError({ message: "Email not verified", statusCode: 403 });
  }

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "user",
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await userRepository.saveRefreshToken({
    userId: user.id,
    refreshToken,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const userId = payload.id;

  const storedToken = await userRepository.findByRefreshToken(refreshToken);
  if (
    !storedToken ||
    storedToken.is_revoked ||
    storedToken.expires_at < new Date()
  ) {
    throw new CustomError({
      message: "Invalid or expired refresh token",
      statusCode: 403,
    });
  }

  await userRepository.revokeRefreshToken(storedToken.id);

  const newAccessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
  const newRefreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRATION }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await userRepository.saveRefreshToken({
    userId,
    refreshToken: newRefreshToken,
    expiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  const token = await userRepository.findByRefreshToken(refreshToken);

  if (!token) {
    throw new CustomError({
      message: "Already logged out or token not found",
      statusCode: 404,
    });
  }
  if (token) {
    await userRepository.revokeRefreshToken(token.id);
  }

  return { message: "Logged out successfully" };
};

const getCurrentUser = async (req,res) => {
  const user = req.user;
  const existingUser = await userRepository.findByEmail(user.email);

  if (!existingUser) {
    throw new CustomError({ message: "User not found", statusCode: 404 });
  }

  return {
    user: {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role || "user",
      isActive: existingUser.is_active,
    },
  };
};

const forgotPassword = async (req) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new CustomError({ message: "User not found", statusCode: 404 });
  }

  const verificationCode = generateVerificationCode();

  await userRepository.updateVerificationCode(normalizedEmail, verificationCode);

  await emailService.sendResetPasswordMail({
    to: normalizedEmail,
    name: user.name,
    code: verificationCode,
  });

  return { message: "Verification code sent to email" };
};

const verifyCode = async (req) => {
  const { email, code } = req.body;
  const normalizedEmail = email.toLowerCase();

  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user) {
    throw new CustomError({ message: "User not found", statusCode: 404 });
  }

  if (user.is_active) {
    return { message: "User is already verified." };
  }

  if (user.verification_code !== code) {
    throw new CustomError({
      message: "Invalid verification code",
      statusCode: 400,
    });
  }

  await userRepository.activateAccount(normalizedEmail);

  return { message: "Email verified successfully. Account activated." };
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  const normalizedEmail = email.toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new CustomError({ message: "User not found", statusCode: 404 });
  }

  if (user.verification_code !== code) {
    throw new CustomError({
      message: "Invalid verification code",
      statusCode: 400,
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await userRepository.updatePassword(normalizedEmail, passwordHash);

  // Optional: revoke all refresh tokens
  await userRepository.revokeAllRefreshTokens(user.id);

  return { message: "Password has been reset successfully" };
};


module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  forgotPassword,
  verifyCode,
  resetPassword,
};
