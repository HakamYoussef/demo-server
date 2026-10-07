import test from 'node:test';
import assert from 'node:assert/strict';
import { apiEnvPath, requireMongoUri } from '../config.mjs';
import { startOptionalMqttSensors } from '../services/mqtt-sensors.mjs';

test('dotenv targets api/.env independent of the PM2 working directory', () => {
  assert.ok(apiEnvPath.endsWith('/api/.env'));
  assert.equal(requireMongoUri({MONGODB_URI:' mongodb://localhost/test '}),'mongodb://localhost/test');
  assert.throws(()=>requireMongoUri({}),/MONGODB_URI is missing/);
});

test('bad broker settings do not stop the HTTP API startup', async () => {
  let logged = false;
  const result = await startOptionalMqttSensors({io:{},env:{MQTT_URL:'mqtt://invalid'}, logger:{error(){logged=true;}}});
  assert.equal(result,null);
  assert.equal(logged,true);
});

test('MQTT index failure is isolated and no MQTT client starts', async () => {
  let started = false;
  const result = await startOptionalMqttSensors({io:{},settingsFactory:()=>({}),model:{async init(){throw Error('index failed');}},start(){started=true;},logger:{error(){}}});
  assert.equal(result,null);
  assert.equal(started,false);
});

test('enabled MQTT waits for its index; disabled MQTT skips it', async () => {
  const steps=[];
  const client={};
  const model={async init(){steps.push('index');}};
  assert.equal(await startOptionalMqttSensors({io:{},model,settingsFactory:()=>({}),start(){steps.push('client');return client;}}),client);
  assert.deepEqual(steps,['index','client']);
  await startOptionalMqttSensors({io:{},model,settingsFactory:()=>null,start(){steps.push('disabled');return null;}});
  assert.deepEqual(steps,['index','client','disabled']);
});
