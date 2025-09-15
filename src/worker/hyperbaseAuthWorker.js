const axios = require('axios');

let HYPERBASE_AUTH_TOKEN = null;
const BASE_URL = process.env.HYPERBASE_HOST;
 

async function loginAndUpdateToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/rest/auth/password-based`, {
      email: process.env.HYPERBASE_EMAIL,
      password: process.env.HYPERBASE_PASSWORD,
    });

    const token = response.data?.data?.token;
    if (token) {
      HYPERBASE_AUTH_TOKEN = token;
      console.log('✅ Updated HYPERBASE_AUTH_TOKEN');
    } else {
      console.error('❌ Login response missing token');
    }
  } catch (err) {
    console.error('❌ Failed to login to Hyperbase:', err.message);
  }
}

// Call on startup
loginAndUpdateToken();

// Refresh token every 24 hours (24 * 60 * 60 * 1000 ms)
setInterval(loginAndUpdateToken, 24 * 60 * 60 * 1000);

function getAuthToken() {
  return HYPERBASE_AUTH_TOKEN;
}

module.exports = { getAuthToken };  
