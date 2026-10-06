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

test("persists before live emission; repeated message IDs share an upsert key", async () => {
  const calls = [];
  const model = {async findOneAndUpdate(filter, update, options) {
    assert.equal(options.upsert, true);
    calls.push(filter.mqttMessageId);
    return {toObject: () => update.$setOnInsert};
  }};
  const io = {emit(event, reading) {assert.equal(event, "sensorData");assert.ok(calls.length);assert.equal(reading.T_A1,23);}};
  const ack = await ingestTelemetry({topic,payload,model,io});
  assert.equal(ack.status,"stored");
  await ingestTelemetry({topic,payload,model,io});
  assert.equal(calls[0],calls[1]);
  assert.equal(await ingestTelemetry({topic,payload,retained:true,model,io}),null);
  assert.equal(calls.length,2);
});

test("database errors prevent successful live emissions", async () => {
  const model = {async findOneAndUpdate() {throw Error("database unavailable");}};
  const io = {emit() {assert.fail("should not broadcast an unsaved reading");}};
  await assert.rejects(ingestTelemetry({topic,payload,model,io}),/database unavailable/);
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
