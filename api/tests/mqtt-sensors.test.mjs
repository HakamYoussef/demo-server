import test from "node:test";
import assert from "node:assert/strict";
import { mqttSettings, parseTelemetry, ingestTelemetry, startMqttSensors } from "../services/mqtt-sensors.mjs";
import { EventEmitter } from "node:events";

const topic = "devices/esp32-sim-01/telemetry";
const payload = Buffer.from(JSON.stringify({messageId: "reading-01", values: {T_A1: 23, H_S1: 60, O_eau: 7, PH_eau: 6.8}}));

test("requires TLS and separate credentials, leaves MQTT optional", () => {
  assert.equal(mqttSettings({}), null);
  assert.throws(() => mqttSettings({MQTT_URL: "mqtt://localhost"}), /mqtts/);
  assert.throws(() => mqttSettings({MQTT_URL: "mqtts://localhost"}), /required/);
  assert.throws(() => mqttSettings({MQTT_URL: "mqtts://user:password@localhost"}), /credentials/);
  const settings = mqttSettings({MQTT_URL: "mqtts://localhost:8883", MQTT_USERNAME: "server", MQTT_PASSWORD: "test-password"});
  assert.equal(settings.options.rejectUnauthorized, true);
});

test("validates device topics, JSON, schema fields and finite numbers", () => {
  const parsed = parseTelemetry(topic, payload);
  assert.equal(parsed.document.O_eau, 7);
  assert.equal(parsed.document.mqttMessageId, "esp32-sim-01:reading-01");
  assert.ok(parsed.document.timestamp instanceof Date);
  for (const body of [null, [], {messageId:"r",values:{}}, {messageId:"r",values:{T_A1:"23"}}, {messageId:"r",values:{unexpected:3}}, {values:{T_A1:23}}]) {
    assert.throws(() => parseTelemetry(topic, Buffer.from(JSON.stringify(body))));
  }
  assert.throws(() => parseTelemetry("devices/bad/device/telemetry", payload));
  assert.throws(() => parseTelemetry(topic, Buffer.from("invalid JSON")));
  assert.throws(() => parseTelemetry(topic, Buffer.alloc(65537)));
});

test("time-series writes use inserts and deduplicate concurrent redeliveries", async () => {
  const documents = [];
  const model = {async create(document) {
    documents.push(document);
    return {toObject: () => document};
  }};
  const io = {emit(event, reading) {
    assert.equal(event, "sensorData");
    assert.ok(documents.length);
    assert.equal(reading.T_A1, 23);
  }};
  const results = await Promise.all([
    ingestTelemetry({topic,payload,model,io}),
    ingestTelemetry({topic,payload,model,io}),
  ]);
  assert.equal(results[0].status, "stored");
  assert.equal(results[1].status, "stored");
  assert.equal(documents.length, 1);
  assert.equal(documents[0].mqttMessageId, "esp32-sim-01:reading-01");
  assert.equal(await ingestTelemetry({topic,payload,retained:true,model,io}), null);
  const next = Buffer.from(JSON.stringify({messageId:"reading-02",values:{T_A1:23}}));
  await ingestTelemetry({topic,payload:next,model,io});
  assert.equal(documents.length, 2);
});

test("failed inserts do not broadcast and can be retried", async () => {
  let calls = 0, emitted = 0;
  const model = {async create(document) {
    calls++;
    if (calls === 1) throw Error("database unavailable");
    return document;
  }};
  const io = {emit() {emitted++;}};
  await assert.rejects(ingestTelemetry({topic,payload,model,io}), /database unavailable/);
  assert.equal(emitted, 0);
  await ingestTelemetry({topic,payload,model,io});
  assert.equal(calls, 2);
  assert.equal(emitted, 1);
});

test("subscribes again after connection and keeps malformed messages isolated", async () => {
  const client = new EventEmitter();
  let subscriptions = 0, rejected = false;
  client.subscribe = (topic, options, callback) => {
    assert.equal(topic,"devices/+/telemetry");assert.equal(options.qos,1);subscriptions++;
    callback(null,[{topic,qos:1}]);
  };
  const logger = {log(){},error(){rejected=true;}};
  startMqttSensors({io:{emit(){}},settings:{url:"mqtts://localhost",options:{}},connect:()=>client,logger});
  client.emit("connect");client.emit("connect");assert.equal(subscriptions,2);
  client.emit("message", topic, Buffer.from("bad"), {retain:false});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(rejected,true);
});

test("public broker mode requires explicit opt-in and retains TLS verification", () => {
  const env = {MQTT_URL: "mqtts://broker.emqx.io:8883"};
  assert.throws(() => mqttSettings(env), /required/);
  assert.throws(() => mqttSettings({...env, MQTT_ALLOW_ANONYMOUS: "false"}), /required/);
  const settings = mqttSettings({...env, MQTT_ALLOW_ANONYMOUS: "true", MQTT_USERNAME: "old-user", MQTT_PASSWORD: "old-password"});
  assert.equal(settings.options.username, undefined);
  assert.equal(settings.options.password, undefined);
  assert.equal(settings.options.rejectUnauthorized, true);
  assert.throws(() => mqttSettings({...env, MQTT_URL: "mqtt://broker.emqx.io:1883", MQTT_ALLOW_ANONYMOUS: "true"}), /mqtts/);
});
