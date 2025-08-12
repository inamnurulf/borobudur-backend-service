const poiRepository = require("../../repositories/point_of_interest.repository");
const CustomError = require("../../helpers/customError");

class PointOfInterestController {
  /**
   * Retrieves all points of interest with pagination.
   * @param {object} req - The request object containing pagination queries.
   * @returns {Promise<object>} A promise that resolves to an object with paginated POI data.
   */
  async getAllPOIs(req) {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const pois = await poiRepository.findAllWithPagination(limit, offset);
    const totalCount = await poiRepository.countAll();
    const totalPages = Math.ceil(totalCount / limit);

    if (!pois || pois.length === 0) {
      throw new CustomError({
        message: "No POIs found",
        statusCode: 404,
      });
    }

    return {
      totalCount,
      totalPages,
      currentPage: parseInt(page),
      limit: parseInt(limit),
      data: pois,
    };
  }
  
  /**
   * Finds points of interest within a given radius of a location.
   * @param {object} req - The request object containing latitude, longitude, radius, and limit.
   * @returns {Promise<Array>} A promise that resolves to an array of nearby POIs.
   */
  async getNearbyPOIs(req) {
    const { latitude, longitude, radius, limit } = req.query;

    const nearbyPOIs = await poiRepository.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius) || 1000,
      parseInt(limit) || 10
    );

    if (!nearbyPOIs || nearbyPOIs.length === 0) {
      throw new CustomError({
        message: "No nearby POIs found",
        statusCode: 404,
      });
    }

    return nearbyPOIs;
  }

 /**
   * Calculates the shortest path from a user's location to a specific POI.
   * @param {object} req - The request object containing poiId, latitude, and longitude.
   * @returns {Promise<object>} A promise that resolves to the route data.
   */
  async routeToPOI(req) {
    const { poiId, latitude, longitude } = req.query;

    const startLat = parseFloat(latitude);
    const startLon = parseFloat(longitude);
    const endPoiId = parseInt(poiId);

    if (isNaN(startLat) || isNaN(startLon) || isNaN(endPoiId) || !startLat || !startLon || !endPoiId) {
      throw new CustomError({
        message: "Invalid input: latitude, longitude, and poiId are required and must be valid numbers.",
        statusCode: 400,
      });
    }

    const route = await poiRepository.findShortestPath(startLat, startLon, endPoiId);

    if (!route) { // The repository now returns null if no route is found
      throw new CustomError({
        message: "Could not compute a route to the POI. It may be unreachable or inputs are invalid.",
        statusCode: 404,
      });
    }

    return route;
  }

  /**
   * Get a single point of interest by ID.
   * @param {object} req - Express request object.
   * @returns {Promise<object>} A promise that resolves to the POI object.
   */
  async getPOIById(req) {
    const { id } = req.params;
    const poi = await poiRepository.findById(id);

    if (!poi) {
      throw new CustomError({
        message: "POI not found.",
        statusCode: 404,
      });
    }

    return poi;
  }

  /**
   * Create a new point of interest.
   * @param {object} req - Express request object.
   * @returns {Promise<object>} A promise that resolves to the newly created POI.
   */
  async createPOI(req) {
    const {
      node_id,
      description,
      opening_hours,
      contact_info,
      image_url,
      rating,
      metadata,
      is_active,
      category_ids,
    } = req.body;

    const newPoi = await poiRepository.createPOI(
      node_id,
      description,
      opening_hours,
      contact_info,
      image_url,
      rating,
      metadata,
      is_active,
      category_ids
    );

    return newPoi;
  }

  /**
   * Update an existing point of interest.
   * @param {object} req - Express request object.
   * @returns {Promise<object>} A promise that resolves to the updated POI.
   */
  async updatePOI(req) {
    const { id } = req.params;
    const updateData = req.body;

    const updatedPoi = await poiRepository.updatePOI(id, updateData);

    if (!updatedPoi) {
      throw new CustomError({
        message: "POI not found.",
        statusCode: 404,
      });
    }

    return updatedPoi;
  }

  /**
   * Delete a point of interest.
   * @param {object} req - Express request object.
   * @returns {Promise<void>} A promise that resolves when the POI is deleted.
   */
  async deletePOI(req) {
    const { id } = req.params;
    const poi = await poiRepository.findById(id);

    if (!poi) {
      throw new CustomError({
        message: "POI not found.",
        statusCode: 404,
      });
    }

    await poiRepository.deletePOI(id);
    return { message: "POI deleted successfully." };
  }
}

module.exports = new PointOfInterestController();