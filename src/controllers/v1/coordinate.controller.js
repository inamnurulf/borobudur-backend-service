const axios = require("axios");
const CustomError = require("../../helpers/customError");
const { getAuthToken } = require("../../worker/hyperbaseAuthWorker"); 

const HYPERBASE_HOST = process.env.HYPERBASE_HOST; // e.g., https://api.hyperbase.io
const HYPERBASE_PROJECT_ID = process.env.HYPERBASE_PROJECT_ID || "018e73c9-47a7-718f-a686-07f6b453d93d";
const HYPERBASE_COLLECTION_ID = process.env.HYPERBASE_COLLECTION_ID || "018e73cd-3e8b-76a7-8833-70b8f9f8119e";

class CoordinatesController {
  /**
   * POST /api/coordinates
   * Body: { client_id: string, latitude: number, longitude: number }
   * Returns: created record from Hyperbase
   */
  async sendCoordinate(req) {
    const { client_id, latitude, longitude } = req.body;

    // Minimal runtime guard (validator already covers most)
    if (!client_id || typeof latitude !== "number" || typeof longitude !== "number") {
      throw new CustomError({
        message: "client_id, latitude, and longitude are required",
        statusCode: 400,
      });
    }

    if (!HYPERBASE_HOST) {
      throw new CustomError({
        message: "HYPERBASE_HOST is not configured",
        statusCode: 500,
      });
    }

    const token = getAuthToken();
    if (!token) {
      throw new CustomError({
        message: "Hyperbase auth token unavailable",
        statusCode: 503,
      });
    }

    const url = `${HYPERBASE_HOST}/api/rest/project/${HYPERBASE_PROJECT_ID}/collection/${HYPERBASE_COLLECTION_ID}/record`;

    const payload = {
      client_id,
      latitude,
      longitude,
    };

    try {
      const resp = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // timeout: 8000, // optional
      });

      // normalize the response shape
      const created = resp.data?.data || resp.data;
      if (!created) {
        throw new CustomError({
          message: "Unexpected Hyperbase response",
          statusCode: 502,
          details: { raw: resp.data },
        });
      }

      return created;
    } catch (err) {
      // Axios error formatting
      const status = err.response?.status || 500;
      const details = err.response?.data || { message: err.message };
      throw new CustomError({
        message: "Failed to create record in Hyperbase",
        statusCode: status >= 400 && status < 600 ? status : 502,
        details,
      });
    }
  }
}

module.exports = new CoordinatesController();
