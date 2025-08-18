const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");
const logger = require("../../config/logger");
const usersRepository = require("../../repositories/users.repository");
const rolesRepository = require("../../repositories/roles.repository");
const userRolesRepository = require("../../repositories/user_roles.repository");
const refreshTokensRepository = require("../../repositories/refresh_tokens.repository");

const userProvidersRepository = require("../../repositories/user_providers.repository");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const ACCESS_TOKEN_EXP = process.env.JWT_ACCESS_EXP || "15m";
const REFRESH_TOKEN_EXP_DAYS = process.env.JWT_REFRESH_EXP_DAYS || 30;

class ProvidersController {
  /**
   * Handles Google OAuth2 login and registration.
   * Exchanges the authorization code for tokens, fetches user info,
   * creates/updates user and provider entries, and generates application tokens.
   * This function is now more flexible, accepting the redirect_uri from the client,
   * making it compatible with web, Android, and iOS clients.
   *
   * @param {Object} req - Express request object.
   * @returns {Object} User data with access and refresh tokens.
   */
  async googleLogin(req) {
    const { code, redirect_uri } = req.body;

    if (!code) {
      throw new CustomError({
        message: "Authorization code is required",
        statusCode: 400,
      });
    }

    if (!redirect_uri) {
        throw new CustomError({
            message: "Redirect URI is required in the request body.",
            statusCode: 400,
        });
    }

    let googleAccessToken;
    let googleRefreshToken;
    let googleIdToken;
    let googleUserInfo;

    try {
      const tokenResponse = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code: code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirect_uri,
          grant_type: "authorization_code",
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      googleAccessToken = tokenResponse.data.access_token;
      googleIdToken = tokenResponse.data.id_token;
      googleRefreshToken = tokenResponse.data.refresh_token; 

      if (!googleAccessToken || !googleIdToken) {
        throw new CustomError({
          message: "Failed to obtain access or ID token from Google.",
          statusCode: 500,
        });
      }

      const userInfoResponse = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );
      googleUserInfo = userInfoResponse.data;
    } catch (googleAuthError) {
      logger.error("Google authentication error during token exchange or user info fetch:", {
          message: googleAuthError.message,
          status: googleAuthError.response ? googleAuthError.response.status : 'N/A',
          data: googleAuthError.response ? googleAuthError.response.data : 'N/A',
      });
      throw new CustomError({
        message: "Google authentication failed. Please try again. " + (googleAuthError.response && googleAuthError.response.data && googleAuthError.response.data.error_description ? googleAuthError.response.data.error_description : googleAuthError.message),
        statusCode: googleAuthError.response
          ? googleAuthError.response.status
          : 500,
      });
    }

    const googleUserId = googleUserInfo.sub; 
    const userEmail = googleUserInfo.email;
    const userName = googleUserInfo.name;
    const userAvatarUrl = googleUserInfo.picture;
    const isEmailVerifiedByGoogle = googleUserInfo.email_verified;

    const { user, accessToken, refreshToken } = await withTransaction(
      async (client) => {
        let userRecord;
        let userProviderRecord =
          await userProvidersRepository.findByProvider(
            "google",
            googleUserId,
            client
          );

        if (userProviderRecord) {
          userRecord = await usersRepository.findById(
            userProviderRecord.user_id,
            client
          );

          if (!userRecord) {
            throw new CustomError({
              message: "Linked user not found for Google provider.",
              statusCode: 500,
            });
          }

          await usersRepository.updateUser(
            userRecord.id,
            { last_login_at: new Date() },
            client
          );

          if (
            googleRefreshToken &&
            userProviderRecord.refresh_token !== googleRefreshToken
          ) {
            await userProvidersRepository.updateRefreshToken(
              userProviderRecord.id,
              googleRefreshToken,
              client
            );
          }
        } else {
          userRecord = await usersRepository.findByEmail(userEmail, client);

          if (userRecord) {
            if (!userRecord.is_email_verified && isEmailVerifiedByGoogle) {
              await usersRepository.verifyEmail(userRecord.id, client);
            }
            await userProvidersRepository.createProvider(
              userRecord.id,
              "google",
              googleUserId,
              googleRefreshToken,
              googleUserInfo.scope, 
              client
            );
            await usersRepository.updateById(
              userRecord.id,
              { last_login_at: new Date() },
              client
            );
          } else {
            userRecord = await usersRepository.createUser(
              userEmail,
              userName,
              userAvatarUrl,
              null, 
              isEmailVerifiedByGoogle, 
            );

            const role = await rolesRepository.findByName("user", client);
            if (role) {
              await userRolesRepository.assignRole(
                userRecord.id,
                role.id,
                client
              );
            }

            await userProvidersRepository.createProvider(
              userRecord.id,
              "google",
              googleUserId,
              googleRefreshToken,
              googleUserInfo.scope,
              client
            );
          }
        }

        const appAccessToken = jwt.sign(
          { sub: userRecord.id },
          process.env.JWT_SECRET,
          { expiresIn: ACCESS_TOKEN_EXP }
        );

        const rawRefreshToken = jwt.sign(
          { sub: userRecord.id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: `${REFRESH_TOKEN_EXP_DAYS}d` }
        );

        const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
        const expiresAt = new Date(
          Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000
        );

        await refreshTokensRepository.revokeAllForUser(userRecord.id, client);

        await refreshTokensRepository.createRefreshToken(
          userRecord.id,
          tokenHash,
          expiresAt,
          client
        );

        return {
          user: userRecord,
          accessToken: appAccessToken,
          refreshToken: rawRefreshToken,
        };
      }
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}

module.exports = new ProvidersController();
