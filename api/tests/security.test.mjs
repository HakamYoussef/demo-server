import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer } from 'node:http';
import { User } from '../models/user.mjs';
import userRouter from '../routes/user-routes.mjs';
import adminRouter from '../routes/admin.mjs';
import arduinoRouter from '../routes/arduino-routes.mjs';
import capteurRouter from '../routes/capteurs-routes.mjs';
import radiationRouter from '../routes/radiation-routes.mjs';
import { authenticateSocket, cookieOptions, authorization } from '../middlewares/authorization.mjs';
import { securityHeaders, rateLimit } from '../middlewares/security.mjs';
import { pagination } from '../lib/pagination.mjs';
import { readingModel } from '../models/sample.mjs';
import { mqttSettings } from '../services/mqtt-sensors.mjs';
process.env.JWT_SECRET_KEY = 'test-only-secret-with-at-least-thirty-two-bytes';
process.env.APP_ORIGINS = 'https://app.example.com';
process.env.DEVICE_API_KEYS = JSON.stringify({ esp32: 'test-device-key-with-at-least-thirty-two-bytes' });
const id = '507f1f77bcf86cd799439011';
let user, base, server, findCalls;
const hash = await bcrypt.hash('KnownPassword!123', 4);
const originals = [User.findOne, User.findById, User.updateOne, User.prototype.save, readingModel.find];
function sign(extra = {}, options = {}) {
  return jwt.sign({ _id: id, version: 0, ...extra }, process.env.JWT_SECRET_KEY, { algorithm: 'HS256', issuer: 'sensor-api', audience: 'sensor-web', expiresIn: 900, ...options });
}
async function request(path, { cookie, bearer, body, method = body ? 'POST' : 'GET', origin = process.env.APP_ORIGINS, headers = {} } = {}) {
  return fetch(base + path, { method, headers: { ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
}
before(async () => {
  const app = express();
  app.use(securityHeaders, express.json({ limit: '32kb' }));
  for (const [path, router] of [['users',userRouter],['admin',adminRouter],['v1',arduinoRouter],['capteurs',capteurRouter],['radiation',radiationRouter]]) app.use('/api/' + path, router);
  app.get('/limited', rateLimit({ limit: 2 }), (_req, res) => res.json({ ok: true }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: 'Invalid request' }));
  server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  user = { _id: id, email: 'audit@example.com', password: hash, isAdmin: false, sessionVersion: 0 };
  findCalls = 0;
  User.findOne = async () => { findCalls++; return user; };
  User.findById = () => ({ select: async () => user });
  User.updateOne = async () => { user.sessionVersion++; return {}; };
  User.prototype.save = async function () { return this; };
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  [User.findOne, User.findById, User.updateOne, User.prototype.save, readingModel.find] = originals;
});
test('login rejects MongoDB operators and oversized passwords before querying', async () => {
  for (const body of [{ email: { $ne: null }, password: 'test' }, { email: 'audit@example.com', password: 'é'.repeat(37) }, { email: 'audit@example.com', password: 'a'.repeat(73) }]) assert.equal((await request('/api/users/login', { body })).status, 400);
  assert.equal(findCalls, 0);
});
test('unknown account and wrong password return identical errors', async () => {
  const wrong = await request('/api/users/login', { body: { email: 'audit@example.com', password: 'wrong' } });
  const body = await wrong.json();
  User.findOne = async () => null;
  const absent = await request('/api/users/login', { body: { email: 'missing@example.com', password: 'wrong' } });
  assert.equal(wrong.status, 401); assert.equal(absent.status, 401); assert.deepEqual(body, await absent.json());
});
test('login sets HttpOnly expiring cookie without exposing token or hash; me validates it', async () => {
  const response = await request('/api/users/login', { body: { email: 'audit@example.com', password: 'KnownPassword!123' } });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Max-Age=900/);
  const body = await response.json(); assert.equal(body.token, undefined); assert.equal(body.user.password, undefined);
  const claims = jwt.decode(decodeURIComponent(cookie.split(';')[0].slice('session='.length)));
  assert.equal(claims.exp - claims.iat, 900);
  assert.equal((await request('/api/users/me', { cookie: cookie.split(';')[0] })).status, 200);
});
test('all private reads and writes refuse anonymous access', async () => {
  for (const [path, method] of [['/api/capteurs/dataa','GET'], ['/api/v1/readings','GET'], ['/api/admin/threshold','GET'], ['/api/admin/threshold','POST'], ['/api/admin/controlData','GET'], ['/api/admin/register','POST'], ['/api/users/register','POST'], ['/api/radiation','GET']]) assert.equal((await request(path, { method })).status, 401, path);
});
test('ordinary users cannot administer; stale admin JWT claims grant no rights', async () => {
  for (const path of ['/api/admin/threshold', '/api/admin/register', '/api/users/register']) assert.equal((await request(path, { bearer: sign({ isAdmin: true }), body: {} })).status, 403);
});
test('admin registration returns only public user fields', async () => {
  user.isAdmin = true; User.findOne = async () => null;
  const response = await request('/api/admin/register', { bearer: sign(), body: { email: 'new@example.com', password: 'StrongPassword!123' } });
  assert.equal(response.status, 201);
  const body = await response.json(); assert.equal(body.password, undefined); assert.equal(body.isAdmin, false);
});
test('cookie writes require trusted origin; logout revokes existing tokens', async () => {
  const token = sign(), cookie = `session=${token}`;
  assert.equal((await request('/api/users/logout', { cookie, method: 'POST', origin: '' })).status, 403);
  assert.equal((await request('/api/users/logout', { cookie, method: 'POST', origin: 'https://evil.example.com' })).status, 403);
  assert.equal((await request('/api/users/logout', { cookie, method: 'POST' })).status, 204);
  assert.equal((await request('/api/users/me', { bearer: token })).status, 401);
});
test('expired, legacy, tampered and wrong audience JWTs are rejected', async () => {
  const legacy = jwt.sign({ _id: id, isAdmin: true }, process.env.JWT_SECRET_KEY);
  for (const token of [legacy, sign({}, { expiresIn: -1 }), sign({}, { audience: 'other' }), sign() + 'x']) assert.equal((await request('/api/users/me', { bearer: token })).status, 401);
});
test('invalid threshold and radiation values are rejected before database writes', async () => {
  user.isAdmin = true;
  for (const value of ['23', -51, 101, null]) assert.equal((await request('/api/admin/threshold', { bearer: sign(), body: { temperatureThreshold: value } })).status, 400);
  assert.equal((await request('/api/radiation', { bearer: sign(), body: { comptage: -1, pic: 0 } })).status, 400);
});
test('ingestion requires a device key and rejects malformed readings and timestamps', async () => {
  assert.equal((await request('/api/v1/config')).status, 401);
  assert.equal((await request('/api/v1/readings', { bearer: sign(), body: { comptage: 1, pic: 2 } })).status, 401);
  const headers = { 'X-Device-Id': 'esp32', 'X-Device-Key': JSON.parse(process.env.DEVICE_API_KEYS).esp32 };
  for (const body of [{ comptage: '12malformed', pic: 2 }, { comptage: -1, pic: 2 }, { comptage: 1, pic: 2, time: '1900-01-01' }]) assert.equal((await request('/api/v1/readings', { headers, body })).status, 400);
});
test('pagination limits queries and rejects excessive date ranges', async () => {
  assert.deepEqual(pagination({}), { limit: 1000, skip: 0 }); assert.throws(() => pagination({ limit: 1001 })); assert.throws(() => pagination({ page: -1 }));
  let applied;
  readingModel.find = () => ({ sort() { return this; }, skip(n) { assert.equal(n, 25); return this; }, limit(n) { applied = n; return this; }, async lean() { return []; } });
  assert.equal((await request('/api/capteurs/dataa?limit=25&page=2', { bearer: sign() })).status, 200); assert.equal(applied, 25);
  assert.equal((await request('/api/capteurs/dataa?startDate=2000-01-01&endDate=2026-01-01', { bearer: sign() })).status, 400);
});
test('Socket.IO refuses anonymous clients, invalid origins and revoked sessions', async () => {
  const check = socket => new Promise(resolve => authenticateSocket(socket, err => resolve(err)));
  assert.ok(await check({ handshake: { headers: {}, auth: {} } }));
  assert.ok(await check({ handshake: { headers: { origin: 'https://evil.example.com', cookie: `session=${sign()}` }, auth: {} } }));
  const socket = { handshake: { headers: { origin: process.env.APP_ORIGINS, cookie: `session=${sign()}` }, auth: {} } };
  assert.equal(await check(socket), undefined); assert.equal(socket.auth._id, id);
  user.sessionVersion++; assert.ok(await check(socket));
});
test('rate limits enforce 429 and Retry-After', async () => {
  assert.equal((await request('/limited')).status, 200); assert.equal((await request('/limited')).status, 200);
  const response = await request('/limited'); assert.equal(response.status, 429); assert.ok(response.headers.get('retry-after'));
});
test('owner authorization runs normally; production enables Secure and forbids anonymous MQTT', () => {
  let passed = false; authorization({ auth: { _id: id, isAdmin: false }, params: { id } }, {}, () => { passed = true; }); assert.equal(passed, true);
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try { assert.equal(cookieOptions().secure, true); assert.throws(() => mqttSettings({ NODE_ENV: 'production', MQTT_URL: 'mqtts://broker.example.com', MQTT_ALLOW_ANONYMOUS: 'true' })); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('Socket.IO bounds simultaneous connections per user', async () => {
  const socket = { handshake: { headers: { origin: process.env.APP_ORIGINS, cookie: `session=${sign()}` }, auth: {} }, nsp: { sockets: new Map(Array.from({ length: 10 }, (_, i) => [String(i), { auth: { _id: id } }])) } };
  const error = await new Promise(resolve => authenticateSocket(socket, resolve));
  assert.ok(error);
});
