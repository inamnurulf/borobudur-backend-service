const nodesRepo = require("../../repositories/temple_nodes.repository");
const edgesRepo = require("../../repositories/temple_edges.repository");
const featuresRepo = require("../../repositories/temple_features.repository");

const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");

/**
 * Inject Z into GeoJSON geometry.
 * - For Point: append z
 * - For LineString: interpolate z across vertices using zStart/zEnd
 * - For other types: will append constant z (if provided), recursively
 */
function to3DGeometry(geom, { z, zStart, zEnd } = {}) {
  if (!geom || !geom.type || !geom.coordinates) return geom;

  const addZConst = (coords, zConst) => {
    if (!Array.isArray(coords)) return coords;

    // coordinate tuple like [x,y] or [x,y,z]
    if (typeof coords[0] === "number") {
      const [x, y] = coords;
      const zFinal = coords.length >= 3 ? coords[2] : (zConst ?? 0);
      return [x, y, zFinal];
    }

    // nested coords
    return coords.map((c) => addZConst(c, zConst));
  };

  const addZInterpolatedLine = (coords, start, end) => {
    if (!Array.isArray(coords) || coords.length === 0) return coords;
    const z0 = Number.isFinite(start) ? start : 0;
    const z1 = Number.isFinite(end) ? end : z0;

    const n = coords.length;
    return coords.map((pt, i) => {
      if (!Array.isArray(pt) || pt.length < 2) return pt;
      const t = n === 1 ? 0 : i / (n - 1);
      const zi = z0 + (z1 - z0) * t;
      const [x, y] = pt;
      return [x, y, pt.length >= 3 ? pt[2] : zi];
    });
  };

  if (geom.type === "Point") {
    return { ...geom, coordinates: addZConst(geom.coordinates, z) };
  }

  if (geom.type === "LineString") {
    // prefer interpolation if start/end provided
    if (Number.isFinite(zStart) || Number.isFinite(zEnd)) {
      return { ...geom, coordinates: addZInterpolatedLine(geom.coordinates, zStart, zEnd) };
    }
    return { ...geom, coordinates: addZConst(geom.coordinates, z) };
  }

  // MultiPoint, Polygon, MultiLineString, MultiPolygon, etc.
  return { ...geom, coordinates: addZConst(geom.coordinates, z) };
}

class TemplesControllerV2 {
  /**
   * Get graph (nodes + edges) as 3D GeoJSON (Z in geometry)
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

      // altitude lookup for edge interpolation
      const nodeAltById = new Map(
        nodes.map((n) => [n.id, Number.isFinite(n.altitude_m) ? n.altitude_m : 0])
      );

      const nodeFeatures = nodes.map((n) => ({
        type: "Feature",
        geometry: to3DGeometry(n.geom, { z: n.altitude_m }),
        properties: {
          id: n.id,
          name: n.name,
          // NOTE: altitude moved into geometry Z (no longer in properties)
        },
      }));

      const edgeFeatures = edges.map((e) => {
        const zStart = nodeAltById.get(e.source);
        const zEnd = nodeAltById.get(e.target);

        return {
          type: "Feature",
          geometry: to3DGeometry(e.geom, { zStart, zEnd }),
          properties: {
            id: e.id,
            source: e.source,
            target: e.target,
            cost: e.cost,
            reverse_cost: e.reverse_cost,
            type: e.type,
          },
        };
      });

      return {
        type: "FeatureCollection",
        features: [...nodeFeatures, ...edgeFeatures],
      };
    });

    return graph;
  }

  /**
   * Get features list as 3D GeoJSON (if altitude exists)
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
        geometry: to3DGeometry(f.geom, { z: f.altitude_m }), // only works if your repo includes altitude_m
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
   * Get nearest features (sorted by distance) - 3D if altitude exists
   */
  async getNearestFeatures(req) {
    const { lat, lon, type, radius, page, limit } = req.query;

    if (!lat || !lon) {
      throw new CustomError({ message: "lat and lon are required", statusCode: 400 });
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
        geometry: to3DGeometry(f.geom, { z: f.altitude_m }),
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
   * Compute navigation route (ensure route GeoJSON becomes 3D too)
   * Assumes edgesRepo.findRoute returns a GeoJSON Feature/FeatureCollection or something similar.
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
      profile: profile || "walking",
    };

    const route = await withTransaction(async (client) => {
      return await edgesRepo.findRoute(params, client);
    });

    if (!route) {
      throw new CustomError({ message: "Route not found", statusCode: 404 });
    }

    // If your route already includes Z from SQL, this won't break it.
    // If not, and you want true Z, you’ll need the SQL to output 3D (ST_Force3D / add z values).
    if (route.type === "Feature") {
      return { ...route, geometry: to3DGeometry(route.geometry) };
    }
    if (route.type === "FeatureCollection") {
      return {
        ...route,
        features: route.features.map((ft) =>
          ft?.geometry ? { ...ft, geometry: to3DGeometry(ft.geometry) } : ft
        ),
      };
    }

    return route;
  }
}

module.exports = new TemplesControllerV2();
