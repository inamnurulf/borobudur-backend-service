const pool = require("../config/db");

class TempleFloorContoursRepository {
  async findByAltitudeAndClosestPoint(lon, lat, altitude, client = pool) {
    const query = {
      text: `
        WITH closest_floor AS (
          SELECT floor, name, altitude_m, geom
          FROM temple_floor_contours
          ORDER BY ABS(altitude_m - $3) ASC
          LIMIT 1
        ),
        input_point AS (
          SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS point
        )
        SELECT
          cf.floor,
          cf.name,
          cf.altitude_m,
          ST_Contains(cf.geom, ip.point) AS inside,
          CASE
            WHEN ST_Contains(cf.geom, ip.point)
            THEN $1
            ELSE ST_X(ST_ClosestPoint(cf.geom::geometry, ip.point))
          END AS corrected_lon,
          CASE
            WHEN ST_Contains(cf.geom, ip.point)
            THEN $2
            ELSE ST_Y(ST_ClosestPoint(cf.geom::geometry, ip.point))
          END AS corrected_lat
        FROM closest_floor cf, input_point ip
      `,
      values: [lon, lat, altitude],
    };

    const { rows } = await client.query(query);
    return rows[0] || null;
  }
}

module.exports = new TempleFloorContoursRepository();
