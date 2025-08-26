const pool = require("../config/db");

class TempleEdgesRepository {
  async findAll(filters = {}, client = pool) {
    const { bbox, type } = filters;

    const whereConditions = [];
    const values = [];
    let idx = 1;

    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
      whereConditions.push(
        `ST_Intersects(geom, ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326))`
      );
      values.push(minLon, minLat, maxLon, maxLat);
    }

    if (type) {
      whereConditions.push(`type = $${idx++}`);
      values.push(type);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

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
      text: `SELECT id, source, target, cost, reverse_cost, type, ST_AsGeoJSON(geom)::json AS geom 
             FROM temple_edges WHERE id = $1 LIMIT 1`,
      values: [id],
    };
    const { rows } = await client.query(query);
    return rows[0] || null;
  }

  /**
   * Compute route using pgRouting
   */
 // edgesRepo.js
async findRoute(params, client = pool) {
  const { from, to, profile } = params;

  let fromNodeId, toNodeId;

  // --- Resolve TO ---
  if (typeof to === "string" && to.startsWith("node:")) {
    toNodeId = parseInt(to.replace("node:", ""), 10);
  } else if (Number.isInteger(to)) {
    toNodeId = to;
  } else {
    throw new Error("Invalid 'to' format. Use node:id or node integer");
  }

  if (Array.isArray(from) && from.length === 2) {
    const [lon, lat] = from;

    const snapQuery = {
      text: `
        SELECT id,
               ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1,$2),4326)) AS snap_point
        FROM temple_edges
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326)
        LIMIT 1
      `,
      values: [lon, lat],
    };
    const snapResult = await client.query(snapQuery);
    if (snapResult.rowCount === 0) return null;

    const edgeId = snapResult.rows[0].id;
    const snapPoint = snapResult.rows[0].snap_point;

    // 2. Insert virtual node
    const insertNodeQuery = {
      text: `
        INSERT INTO temple_nodes (name, geom)
        VALUES ('virtual_start', $1)
        RETURNING id
      `,
      values: [snapPoint],
    };
    const nodeResult = await client.query(insertNodeQuery);
    fromNodeId = nodeResult.rows[0].id;

    // 3. Connect virtual node to the snapped edge’s endpoints
    const edgeQuery = {
      text: `SELECT source, target, geom, cost, reverse_cost FROM temple_edges WHERE id = $1`,
      values: [edgeId],
    };
    const edgeResult = await client.query(edgeQuery);
    const edge = edgeResult.rows[0];

    // Connect virtual node → source
    await client.query(
      `INSERT INTO temple_edges (source, target, cost, reverse_cost, geom)
       VALUES ($1,$2,
               ST_DistanceSphere($3, (SELECT geom FROM temple_nodes WHERE id=$2)),
               ST_DistanceSphere($3, (SELECT geom FROM temple_nodes WHERE id=$2)),
               ST_MakeLine($3, (SELECT geom FROM temple_nodes WHERE id=$2))
      )`,
      [fromNodeId, edge.source, snapPoint]
    );

    // Connect virtual node → target
    await client.query(
      `INSERT INTO temple_edges (source, target, cost, reverse_cost, geom)
       VALUES ($1,$2,
               ST_DistanceSphere($3, (SELECT geom FROM temple_nodes WHERE id=$2)),
               ST_DistanceSphere($3, (SELECT geom FROM temple_nodes WHERE id=$2)),
               ST_MakeLine($3, (SELECT geom FROM temple_nodes WHERE id=$2))
      )`,
      [fromNodeId, edge.target, snapPoint]
    );
  } else {
    throw new Error("Invalid 'from' format. Must be [lon,lat]");
  }

  const sql = `
    SELECT e.id, e.geom
    FROM pgr_dijkstra(
  'SELECT id, source, target, cost, reverse_cost FROM temple_edges',
  $1::BIGINT, $2::BIGINT, directed := false
  ) as r
  JOIN temple_edges e ON r.edge = e.id
  ORDER BY r.seq
  `;
  const { rows } = await client.query({
    text: sql,
    values: [fromNodeId, toNodeId],
  });

  if (rows.length === 0) return null;

  // --- Merge route into single LineString ---
  const mergeQuery = `
    SELECT ST_AsGeoJSON(ST_LineMerge(ST_Union(geom)))::json AS geom,
           ST_Length(ST_Transform(ST_LineMerge(ST_Union(geom)), 3857)) as distance_m
    FROM temple_edges
    WHERE id = ANY($1::int[])
  `;
  const ids = rows.map((r) => r.id);
  const { rows: merged } = await client.query({
    text: mergeQuery,
    values: [ids],
  });

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: merged[0].geom,
        properties: {
          distance_m: merged[0].distance_m,
          profile,
        },
      },
    ],
  };
}

}

module.exports = new TempleEdgesRepository();
