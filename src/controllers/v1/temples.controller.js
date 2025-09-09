const nodesRepo = require("../../repositories/temple_nodes.repository");
const edgesRepo = require("../../repositories/temple_edges.repository");
const featuresRepo = require("../../repositories/temple_features.repository");

const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");

class TemplesController {
  /**
   * Get graph (nodes + edges) as GeoJSON
   */
  async getGraph(req) {
    const { bbox, area_id, type } = req.query;

    const filters = {};
    if (bbox) filters.bbox = bbox;
    if (area_id) filters.area_id = parseInt(area_id);
    if (type) filters.type = type;

    const graph = await withTransaction(async (client) => {
      const [nodes, edges] = await Promise.all([
        nodesRepo.findAll(filters, client),
        edgesRepo.findAll(filters, client),
      ]);

      return {
        type: "FeatureCollection",
        features: [
          ...nodes.map((n) => ({
            type: "Feature",
            geometry: n.geom, // already JSON
            properties: { id: n.id, name: n.name },
          })),
          ...edges.map((e) => ({
            type: "Feature",
            geometry: e.geom, // already JSON
            properties: {
              id: e.id,
              source: e.source,
              target: e.target,
              cost: e.cost,
              reverse_cost: e.reverse_cost,
              type: e.type,
            },
          })),
        ],
      };
    });

    return graph;
  }

  /**
   * Get features list as GeoJSON
   */
  async getFeatures(req) {
    const { type, q, bbox, near, radius, page, limit } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (q) filters.q = q;
    if (bbox) filters.bbox = bbox;
    if (near) filters.near = near;
    if (radius) filters.radius = parseFloat(radius);

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };

    const features = await withTransaction(async (client) => {
      return await featuresRepo.findAll(filters, pagination, client);
    });

    return {
      type: "FeatureCollection",
      features: features.data.map((f) => ({
        type: "Feature",
        geometry: f.geom,
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          description: f.description,
          image_url: f.image_url,
          rating: f.rating,
        },
      })),
      pagination: features.pagination,
    };
  }

  /**
   * Get nearest features (sorted by distance)
   */
  async getNearestFeatures(req) {
    const { lat, lon, type, radius, page, limit } = req.query;

    if (!lat || !lon) {
      throw new CustomError({
        message: "lat and lon are required",
        statusCode: 400,
      });
    }

    const filters = { lat: parseFloat(lat), lon: parseFloat(lon) };
    if (type) filters.type = type;
    if (radius) filters.radius = parseFloat(radius);

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const nearest = await withTransaction(async (client) => {
      return await featuresRepo.findNearest(filters, pagination, client);
    });

    return {
      type: "FeatureCollection",
      features: nearest.data.map((f) => ({
        type: "Feature",
        geometry: f.geom,
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          description: f.description,
          distance_m: f.distance_m,
        },
      })),
      pagination: nearest.pagination,
    };
  }

  /**
   * Compute navigation route
   */
  async getRoute(req) {
    const { fromLat, fromLon, toNodeId, profile } = req.query;

    if (!fromLat || !fromLon || !toNodeId) {
      throw new CustomError({
        message: "fromLat, fromLon, and toNodeId are required",
        statusCode: 400,
      });
    }

    const params = {
      from: [parseFloat(fromLon), parseFloat(fromLat)], // [lon, lat]
      to: parseInt(toNodeId),
      profile: profile || "walking"
    };

    const route = await withTransaction(async (client) => {
      return await edgesRepo.findRoute(params, client);
    });

    if (!route) {
      throw new CustomError({
        message: "Route not found",
        statusCode: 404,
      });
    }

    return route;
  }
}

module.exports = new TemplesController();
