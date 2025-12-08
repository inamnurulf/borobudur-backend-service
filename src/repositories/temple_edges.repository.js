const pool = require("../config/db");

class TempleEdgesRepository {
  static ENTRY_DISTANCE_THRESHOLD_M = 4;
  static ENTRY_NAME_PATTERN_SQL = `^ENTRY(\\b|_|\\s|$)`;

  async findAll(filters = {}, client = pool) {
    const { bbox, type } = filters;

    const where = [];
    const values = [];
    let idx = 1;

    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = String(bbox)
        .split(",")
        .map(Number);
      where.push(
        `ST_Intersects(geom, ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326))`
      );
      values.push(minLon, minLat, maxLon, maxLat);
    }

    if (type) {
      where.push(`type = $${idx++}`);
      values.push(type);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = {
      text: `
        SELECT id, source, target, cost, reverse_cost,
               ST_AsGeoJSON(geom)::json AS geom
        FROM temple_edges
        ${whereClause}
      `,
      values,
    };

    const { rows } = await client.query(query);
    return rows;
  }

  async findById(id, client = pool) {
    const query = {
      text: `
        SELECT id, source, target, cost, reverse_cost, type,
               ST_AsGeoJSON(geom)::json AS geom
        FROM temple_edges
        WHERE id = $1
        LIMIT 1
      `,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  async findRoute(params, client = pool) {
    const { from, to, toFeaturesId, profile = "walking" } = params;

    // 1. validate & parse input
    const [lon, lat] = this.validateFrom(from);

    // 2. resolve starting node (snap or entry fallback)
    const startInfo = await this.resolveStartNode(lon, lat, client);

    // 3. resolve destination node
    const toNodeId = await this.resolveDestination(to, toFeaturesId, client);

    // 4. compute route
    const row = await this.routeFromNodeToNode(startInfo.id, toNodeId, client);
    if (!row || !row.geometry) return { error: "No path found" };

    // 5. assemble result
    const distance_m = Number(row.distance_m) || 0;
    const duration_s = this.secondsFromMeters(distance_m, profile);

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: row.geometry,
          properties: {
            distance_m,
            duration_s,
            profile,
            segments: row.segments || [],
          },
        },
      ],
    };
  }

  // --- private helpers ---
  validateFrom(from) {
    if (!Array.isArray(from) || from.length !== 2) {
      throw new Error("Invalid 'from' format. Must be [lon,lat]");
    }
    return from.map(Number);
  }

  async resolveStartNode(lon, lat, client) {
    const nearest = await this.getNearestNodeInfo(lon, lat, client);
    if (nearest.distance_m > TempleEdgesRepository.ENTRY_DISTANCE_THRESHOLD_M) {
      const entry = await this.getNearestEntryNodeInfo(lon, lat, client);
      return entry || nearest;
    }
    return nearest;
  }

  async resolveDestination(to, toFeaturesId, client) {
    if (Number.isInteger(toFeaturesId)) {
      const sql = `SELECT node_id AS id FROM temple_features WHERE id = $1::int`;
      const { rows } = await client.query(sql, [toFeaturesId]);
      if (!rows.length) throw new Error(`Feature ${toFeaturesId} not found`);
      return rows[0].id;
    }

    if (Number.isInteger(to)) return to;
    if (typeof to === "string" && to.startsWith("node:")) {
      return parseInt(to.slice(5), 10);
    }

    throw new Error("Invalid destination. Provide toFeaturesId or to=node:<id>/nodeId");
  }

  async getNearestNodeInfo(lon, lat, client) {
    const sql = `
      WITH params AS (SELECT ST_SetSRID(ST_MakePoint($1,$2), 4326) AS pt)
      SELECT n.id, n.name, n.altitude_m,
             ST_X(n.geom) AS lon, ST_Y(n.geom) AS lat,
             ST_Distance(n.geom::geography, (SELECT pt FROM params)::geography) AS distance_m
      FROM temple_nodes n, params p
      ORDER BY n.geom <-> p.pt
      LIMIT 1
    `;
    const { rows } = await client.query(sql, [lon, lat]);
    if (!rows.length) throw new Error("No nodes near the given coordinate");
    return rows[0];
  }

  async getNearestEntryNodeInfo(lon, lat, client) {
    const sql = `
      WITH params AS (SELECT ST_SetSRID(ST_MakePoint($1,$2), 4326) AS pt)
      SELECT n.id, n.name,
             ST_X(n.geom) AS lon, ST_Y(n.geom) AS lat,
             ST_Distance(n.geom::geography, (SELECT pt FROM params)::geography) AS distance_m
      FROM temple_nodes n, params p
      WHERE n.name ~* $3
      ORDER BY n.geom <-> p.pt
      LIMIT 1
    `;
    const { rows } = await client.query(sql, [
      lon,
      lat,
      TempleEdgesRepository.ENTRY_NAME_PATTERN_SQL,
    ]);
    return rows[0] || null;
  }

  async routeFromNodeToNode(fromNodeId, toNodeId, client) {
    const sql = `
      WITH route AS (
        SELECT *
        FROM pgr_dijkstra(
          'SELECT id, source, target, cost, COALESCE(reverse_cost, cost) AS reverse_cost FROM temple_edges',
          $1::int, $2::int, true
        )
      ),
      edges AS (
        SELECT e.id, e.geom, ST_Length(e.geom::geography) AS len_m
        FROM route r
        JOIN temple_edges e ON e.id = r.edge
        WHERE r.edge <> -1
        ORDER BY r.seq
      ),
      meta AS (SELECT COALESCE(SUM(len_m),0) AS total_m FROM edges),
      line AS (SELECT ST_LineMerge(ST_Union(geom)) AS linegeom FROM edges),
      line_json AS (SELECT ST_AsGeoJSON(linegeom)::json AS geometry FROM line),
      segments AS (
        SELECT COALESCE(
          json_agg(json_build_object('edge_id', id, 'length_m', len_m)),
          '[]'::json
        ) AS segs FROM edges
      )
      SELECT
        (SELECT total_m FROM meta) AS distance_m,
        (SELECT geometry FROM line_json) AS geometry,
        (SELECT segs FROM segments) AS segments
    `;
    const { rows } = await client.query(sql, [fromNodeId, toNodeId]);
    return rows[0] || null;
  }

  secondsFromMeters(m, profile) {
    const v =
      profile === "walking" ? 1.35 :
      profile === "wheelchair" ? 1.10 :
      profile === "guided" ? 1.20 :
      1.30;
    return Math.round((m || 0) / v);
  }
}

module.exports = new TempleEdgesRepository();
