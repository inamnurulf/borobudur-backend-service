const nodesRepository = require("../../repositories/nodes.repository");
const { withTransaction } = require("../../utils/db_transactions");
const CustomError = require("../../helpers/customError");

class NodesController {
  /**
   * Get all nodes
   */
  async getAllNodes(req) {
    const nodes = await withTransaction(async (client) => {
      return await nodesRepository.findAll(client);
    });

    return nodes;
  }

  /**
   * Get node by ID
   */
  async getNodeById(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Node ID is required",
        statusCode: 400,
      });
    }

    const node = await withTransaction(async (client) => {
      const data = await nodesRepository.findById(id, client);
      if (!data) {
        throw new CustomError({
          message: "Node not found",
          statusCode: 404,
        });
      }
      return data;
    });

    return node;
  }

  /**
   * Create a new node
   */
  async createNode(req) {
    const { name, type, longitude, latitude } = req.body;

    if (!name || !type || longitude === undefined || latitude === undefined) {
      throw new CustomError({
        message: "name, type, longitude, and latitude are required",
        statusCode: 400,
      });
    }

    const newNode = await withTransaction(async (client) => {
      const created = await nodesRepository.createNode(
        name,
        type,
        longitude,
        latitude,
        client
      );
      return created;
    });

    return newNode;
  }

  /**
   * Update node
   */
  async updateNode(req) {
    const { id } = req.params;
    const { name, type, longitude, latitude } = req.body;

    if (!id) {
      throw new CustomError({
        message: "Node ID is required",
        statusCode: 400,
      });
    }

    const updatedNode = await withTransaction(async (client) => {
      const existing = await nodesRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Node not found",
          statusCode: 404,
        });
      }

      const updated = await nodesRepository.updateNode(
        id,
        { name, type, longitude, latitude },
        client
      );
      return updated;
    });

    return updatedNode;
  }

  /**
   * Delete node
   */
  async deleteNode(req) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        message: "Node ID is required",
        statusCode: 400,
      });
    }

    await withTransaction(async (client) => {
      const existing = await nodesRepository.findById(id, client);
      if (!existing) {
        throw new CustomError({
          message: "Node not found",
          statusCode: 404,
        });
      }
      await nodesRepository.deleteNode(id, client);
    });

    return { id };
  }
}

module.exports = new NodesController();
