const mqtt = require('mqtt');

const brokerUrl = process.env.MQTT_BROKER_URL;
const topic = process.env.MQTT_TOPIC;

let client = null;
let isConnected = false;
let connectPromise = null;

function initMQTTClient() {
  if (!client) {
    client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
      isConnected = true;
      console.log('✅ MQTT connected');
    });

    client.on('reconnect', () => {
      console.log('🔁 MQTT reconnecting...');
    });

    client.on('close', () => {
      isConnected = false;
      console.warn('⚠️ MQTT connection closed');
    });

    client.on('error', (err) => {
      isConnected = false;
      console.error('❗ MQTT error:', err);
    });
  }

  return client;
}

// Wait for the client to be connected
function waitForConnection(timeout = 5000) {
  if (isConnected) return Promise.resolve();

  if (!connectPromise) {
    connectPromise = new Promise((resolve, reject) => {
      const start = Date.now();

      const interval = setInterval(() => {
        if (isConnected) {
          clearInterval(interval);
          connectPromise = null;
          resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          connectPromise = null;
          reject(new Error('MQTT connection timeout'));
        }
      }, 100);
    });
  }

  return connectPromise;
}

exports.sendToBroker = async (payload) => {
  try {
    initMQTTClient();
    await waitForConnection();

    return new Promise((resolve, reject) => {
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ MQTT publish failed:', err);
          return reject(err);
        }

        console.log('📡 Message sent to broker');
        return resolve();
      });
    });
  } catch (err) {
    console.error('🚫 sendToBroker error:', err.message);
    throw err;
  }
};
