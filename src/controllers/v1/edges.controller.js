// controllers/v1/edges.controller.js

const edgesRepository = require("../../repositories/edges.repository");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");

class EdgesController {
  /**
   * Get all edges
   */
  async getAllEdges(req) {
    const edges = await withTransaction(async (client) => {
      return await edgesRepository.findAll(client);
    });
    return edges;
  }

  /**
   * Get edge by ID
   */
  async getEdgeById(req) {
    const { id } = req.params;
    if (!id) {
      throw new CustomError({
        message: "Edge ID is required",
        statusCode: 400,
      });
    }

    const edge = await withTransaction(async (client) => {
      const data = await edgesRepository.findById(id, client);
      if (!data) {
        throw new CustomError({
          message: "Edge not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return edge;
  }

  /**
   * Create a new edge
   */
  async createEdge(req) {
    const { source, target, cost, geom } = req.body;
    if (
      source === undefined ||
      target === undefined ||
      cost === undefined ||
      !geom
    ) {
      throw new CustomError({
        message: "source, target, cost, and geom are required",
        statusCode: 400,
      });
    }

    const newEdge = await withTransaction(async (client) => {
      const created = await edgesRepository.create(
        { source, target, cost, geom },
        client
      );
      return created;
    });

    return newEdge;
  }

  /**
   * Update an edge
   */
  async updateEdge(req) {
    const { id } = req.params;
    const { source, target, cost, geom } = req.body;

    if (!id) {
      throw new CustomError({
        message: "Edge ID is required",
        statusCode: 400,
      });
    }

    const updatedEdge = await withTransaction(async (client) => {
      const existing = await edgesRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Edge not found",
          statusCode: 404,
        });
      }

      const updated = await edgesRepository.update(
        id,
        { source, target, cost, geom },
        client
      );
      return updated;
    });

    return updatedEdge;
  }

  /**
   * Delete an edge
   */
  async deleteEdge(req) {
    const { id } = req.params;
    if (!id) {
      throw new CustomError({
        message: "Edge ID is required",
        statusCode: 400,
      });
    }

    await withTransaction(async (client) => {
      const existing = await edgesRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Edge not found",
          statusCode: 404,
        });
      }
      await edgesRepository.remove(id, client);
    });

    return { id };
  }

  /**
   * Compute shortest path between two nodes
   */
  async getShortestPath(req) {
    const { source, target } = req.query;

    if (source === undefined || target === undefined) {
      throw new CustomError({
        message: "source and target query parameters are required",
        statusCode: 400,
      });
    }

    // no transaction needed since shortestPath uses its own pool connection
    const path = await edgesRepository.shortestPath(
      parseInt(source, 10),
      parseInt(target, 10)
    );

    if (!path || path.length === 0) {
      throw new CustomError({
        message: "No path found between the specified nodes",
        statusCode: 404,
      });
    }

    return path;
  }
}

module.exports = new EdgesController();
