import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import mqtt from "mqtt";
import { readingModel } from "../models/sample.mjs";

const DEVICE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const MESSAGE_ID = /^[a-zA-Z0-9_-]{1,80}$/;
const MAX_PAYLOAD_BYTES = 65536;
// Time-series collections do not support unique indexes or upserts.
// Deduplicate recent QoS 1 deliveries within this server process.
const recentWrites = new WeakMap();
const MAX_RECENT_MESSAGES = 256;

export function mqttSettings(env = process.env) {
  if (!env.MQTT_URL) return null;
  const url = new URL(env.MQTT_URL);
  if (url.protocol !== "mqtts:" || url.username || url.password) {
    throw new Error("MQTT_URL must use mqtts://; put credentials in MQTT_USERNAME and MQTT_PASSWORD");
  }
  const anonymous = env.MQTT_ALLOW_ANONYMOUS === "true";
  if (anonymous && env.NODE_ENV === "production") throw new Error("Anonymous MQTT is disabled in production");
  if (!anonymous && (!env.MQTT_USERNAME || !env.MQTT_PASSWORD)) {
    throw new Error("MQTT_USERNAME and MQTT_PASSWORD are required");
  }
  return {
    url: url.href,
    options: {
      username: anonymous ? undefined : env.MQTT_USERNAME,
      password: anonymous ? undefined : env.MQTT_PASSWORD,
      clientId: env.MQTT_CLIENT_ID || `sensor-server-${randomUUID()}`,
      ca: env.MQTT_CA_FILE ? readFileSync(env.MQTT_CA_FILE) : undefined,
      rejectUnauthorized: true,
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      queueQoSZero: false,
    },
  };
}

export function parseTelemetry(topic, payload) {
  const match = /^devices\/([^/]+)\/telemetry$/.exec(topic);
  if (!match || !DEVICE_ID.test(match[1])) throw new Error("Invalid device topic");
  if (payload.length > MAX_PAYLOAD_BYTES) throw new Error("Telemetry exceeds 64 KiB");
  const body = JSON.parse(payload.toString("utf8"));
  if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("Expected a JSON object");
  if (!MESSAGE_ID.test(body.messageId || "")) throw new Error("A valid messageId is required");
  const values = body.values;
  if (!values || Array.isArray(values) || typeof values !== "object") throw new Error("values must be an object");
  if (Object.keys(values).length === 0) throw new Error("No sensor measurements supplied");
  const document = {};
  for (const [key, value] of Object.entries(values)) {
    const schemaPath = readingModel.schema.path(key);
    if (!schemaPath || schemaPath.instance !== "Number" || typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Invalid sensor measurement: ${key}`);
    }
    document[key] = value;
  }
  return {
    deviceId: match[1],
    messageId: body.messageId,
    document: {
      ...document,
      timestamp: new Date(),
      deviceId: match[1],
      mqttMessageId: `${match[1]}:${body.messageId}`,
    },
  };
}

export async function ingestTelemetry({ topic, payload, retained = false, model = readingModel, io }) {
  // A retained measurement must not be recorded as a fresh reading on reconnect.
  if (retained) return null;
  const reading = parseTelemetry(topic, payload);
  let cache = recentWrites.get(model);
  if (!cache) {
    cache = new Map();
    recentWrites.set(model, cache);
  }
  const key = reading.document.mqttMessageId;
  let write = cache.get(key);
  if (!write) {
    if (cache.size >= MAX_RECENT_MESSAGES) cache.delete(cache.keys().next().value);
    write = Promise.resolve().then(() => model.create(reading.document));
    cache.set(key, write);
  }
  let saved;
  try {
    saved = await write;
  } catch (error) {
    if (cache.get(key) === write) cache.delete(key);
    throw error;
  }
  io.emit("sensorData", saved.toObject ? saved.toObject() : saved);
  return { deviceId: reading.deviceId, messageId: reading.messageId, status: "stored" };
}

export function startMqttSensors({ io, settings, connect = mqtt.connect, logger = console, model = readingModel }) {
  if (!settings) {
    logger.log("MQTTS disabled: set MQTT_URL to enable sensor ingestion");
    return null;
  }
  const client = connect(settings.url, settings.options);
  client.on("connect", () => {
    client.subscribe("devices/+/telemetry", { qos: 1 }, (error, granted) => {
      if (error || !granted?.length || granted.some(item => item.qos === 128)) {
        logger.error("MQTTS telemetry subscription denied or failed");
      } else {
        logger.log("MQTTS connected; listening for sensor telemetry");
      }
    });
  });
  client.on("message", (topic, payload, packet) => {
    ingestTelemetry({ topic, payload, retained: packet.retain, io, model })
      .then(ack => {
        if (!ack) return;
        client.publish(`devices/${ack.deviceId}/ack`, JSON.stringify(ack), { qos: 1, retain: false }, error => {
          if (error) logger.error("MQTTS acknowledgment failed:", error.message);
        });
      })
      .catch(error => logger.error("MQTTS reading rejected:", error.message));
  });
  client.on("error", error => logger.error("MQTTS connection error:", error.message));
  client.on("reconnect", () => logger.log("MQTTS reconnecting"));
  return client;
}


// Start MQTT after HTTP is listening; MQTT is optional for the rest of the API.
export async function startOptionalMqttSensors({
  io, env = process.env, model = readingModel, logger = console,
  settingsFactory = mqttSettings, start = startMqttSensors,
}) {
  try {
    const settings = settingsFactory(env);
    if (settings) await model.init();
    return start({ io, settings, model, logger });
  } catch (error) {
    logger.error("MQTTS disabled: initialization failed:", error.message);
    return null;
  }
}

