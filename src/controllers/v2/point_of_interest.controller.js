const poiRepository = require("../../repositories/point_of_interest.repository");

class PoiV2Controller {
  async getNearbyPOIs(req) {
    const { latitude, longitude, radius = 1000, limit = 10 } = req.query;

    const nearbyPOIs = await poiRepository.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius),
      parseInt(limit)
    );

    if (!nearbyPOIs || nearbyPOIs.length === 0) {
      return { facilities: [] };
    }

    const facilities = nearbyPOIs.map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      latitude: poi.latitude,
      longitude: poi.longitude,
      description: poi.description,
    }));

    return { facilities };
  }
}

module.exports = new PoiV2Controller();
