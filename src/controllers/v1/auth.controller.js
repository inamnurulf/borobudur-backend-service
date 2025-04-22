const register = async ({ name, email, password }) => {
    console.log("Registering:", { name, email, password });
  
    // Replace this with real logic (e.g., save to DB, hash password, etc.)
    return { message: "User registered successfully" };
  };
  
  const login = async ({ email, password }) => {
    console.log("Logging in:", { email, password });
  
    // Dummy tokens
    return {
      accessToken: "dummyAccessToken",
      refreshToken: "dummyRefreshToken"
    };
  };
  
  const refreshToken = async ({ refreshToken }) => {
    console.log("Refreshing token:", refreshToken);
  
    // Return new dummy tokens
    return {
      accessToken: "newDummyAccessToken",
      refreshToken: "newDummyRefreshToken"
    };
  };
  
  const logout = async ({ refreshToken }) => {
    console.log("Logging out, token:", refreshToken);
  
    return { message: "Logged out successfully" };
  };
  
  const getCurrentUser = async (user) => {
    // Assume user object is injected after JWT verification
    return {
      user: {
        id: "user_123",
        name: "John Doe",
        email: "john@example.com",
        role: "user"
      }
    };
  };
  
  const forgotPassword = async ({ email }) => {
    console.log("Sending verification code to:", email);
  
    return { message: "Verification code sent to email" };
  };
  
  const verifyCode = async ({ email, code }) => {
    console.log("Verifying code:", { email, code });
  
    return { message: "Code verified successfully" };
  };
  
  const resetPassword = async ({ email, code, newPassword }) => {
    console.log("Resetting password for:", email, "with code:", code);
  
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
    resetPassword
  };
  