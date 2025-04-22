const { sendToBroker } = require("../../utils/hyperbase");

const sendMessage = async ({ latitude, longitude, client_id }) => {
  const payload = {
    project_id: process.env.HYPERBASE_PROJECT_ID,
    token_id: process.env.HYPERBASE_TOKEN_ID,
    collection_id: process.env.HYPERBASE_COLLECTION_ID,
    data: {
      client_id,
      latitude,
      longitude,
    },
  };

  await sendToBroker(payload);
  return { message: "Sent to broker successfully" };
};

module.exports = {
  sendMessage,
};
