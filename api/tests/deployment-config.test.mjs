import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { allowsHttp, usesSecureCookies, validateDeployment } from '../lib/deployment-config.mjs';
import { securityHeaders } from '../middlewares/security.mjs';
const base = { NODE_ENV: 'production', JWT_SECRET_KEY: 'test-only-secret-with-at-least-thirty-two-bytes', APP_ORIGINS: 'https://app.example.com' };
test('production defaults to HTTPS, strong keys and exact origins', () => {
  assert.doesNotThrow(() => validateDeployment(base)); assert.equal(usesSecureCookies(base), true);
  for (const env of [{ ...base, JWT_SECRET_KEY: 'short' }, { ...base, APP_ORIGINS: 'http://app.example.com' }, { ...base, APP_ORIGINS: '' }, { ...base, APP_ORIGINS: 'https://app.example.com/path' }, { ...base, APP_ORIGINS: 'https://user:password@app.example.com' }]) assert.throws(() => validateDeployment(env));
});
test('HTTP compatibility requires explicit opt-in and cookie Secure follows transport', () => {
  const env = { ...base, ALLOW_INSECURE_HTTP: 'true', APP_ORIGINS: 'http://app.example.com:3000' };
  assert.doesNotThrow(() => validateDeployment(env)); assert.equal(allowsHttp(env), true); assert.equal(usesSecureCookies(env), false);
  assert.equal(allowsHttp({ ...env, ALLOW_INSECURE_HTTP: 'false' }), false);
  assert.throws(() => validateDeployment({ ...env, APP_ORIGINS: 'http://app.example.com/path' }));
});
test('HTTP compatibility retains origin restrictions and does not send HSTS', () => {
  const keys = ['NODE_ENV','ALLOW_INSECURE_HTTP','APP_ORIGINS'];
  const old = Object.fromEntries(keys.map(key => [key,process.env[key]]));
  Object.assign(process.env, { NODE_ENV: 'production', ALLOW_INSECURE_HTTP: 'true', APP_ORIGINS: 'http://app.example.com' });
  try {
    let passed = false, status, headers = {};
    const res = { set(value) { Object.assign(headers,value); return this; }, status(value) { status=value; return this; }, json() { return this; } };
    securityHeaders({ secure: false, headers: { origin: 'http://app.example.com' } }, res, () => { passed=true; });
    assert.equal(passed,true); assert.equal(headers['Strict-Transport-Security'],undefined);
    securityHeaders({ secure: false, headers: { origin: 'http://evil.example.com' } }, res, () => assert.fail()); assert.equal(status,403);
  } finally { for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key]=old[key]; } }
});
test('setup preserves MongoDB, hides secrets, persists strong keys and replaces stale PM2 env', async () => {
  const directory = await mkdtemp(join(tmpdir(),'http-config-test-'));
  try {
    await mkdir(join(directory,'scripts')); await mkdir(join(directory,'bin'));
    await symlink(fileURLToPath(new URL('../node_modules',import.meta.url)),join(directory,'node_modules'));
    await writeFile(join(directory,'scripts/configure-http.mjs'),await readFile(new URL('../scripts/configure-http.mjs',import.meta.url)));
    const legacy = 'MONGODB_URI=mongodb://localhost/fixture\nJWT_SECRET_KEY=old-short-fixture\n';
    await writeFile(join(directory,'.env'),legacy);
    const capture = join(directory,'pm2-capture.json');
    await writeFile(join(directory,'bin/pm2'),`#!${process.execPath}\nrequire('fs').writeFileSync(process.env.CAPTURE_PATH,JSON.stringify({args:process.argv.slice(2),key:process.env.JWT_SECRET_KEY,origin:process.env.APP_ORIGINS,mongo:process.env.MONGODB_URI}));\n`,{mode:0o700});
    const command = [join(directory,'scripts/configure-http.mjs'),'--origin=http://app.example.com:3000','--restart'];
    const env = { ...process.env, PATH: `${join(directory,'bin')}:${process.env.PATH}`, JWT_SECRET_KEY:'stale-pm2-fixture', MONGODB_URI:'mongodb://localhost/fixture', CAPTURE_PATH:capture };
    const result = spawnSync(process.execPath,command,{env,encoding:'utf8'}); assert.equal(result.status,0,result.stderr);
    assert.equal(await readFile(join(directory,'.env'),'utf8'),legacy);
    const local = dotenv.parse(await readFile(join(directory,'.env.local'),'utf8'));
    assert.ok(Buffer.byteLength(local.JWT_SECRET_KEY)>=32); assert.equal(local.ALLOW_INSECURE_HTTP,'true'); assert.equal(local.APP_ORIGINS,'http://app.example.com:3000'); assert.ok(!result.stdout.includes(local.JWT_SECRET_KEY));
    const restarted=JSON.parse(await readFile(capture,'utf8'));
    assert.equal(restarted.key,local.JWT_SECRET_KEY); assert.equal(restarted.mongo,'mongodb://localhost/fixture'); assert.deepEqual(restarted.args,['restart','api','--update-env']);
    assert.equal(spawnSync(process.execPath,command,{env,encoding:'utf8'}).status,0);
    assert.equal(dotenv.parse(await readFile(join(directory,'.env.local'),'utf8')).JWT_SECRET_KEY,local.JWT_SECRET_KEY);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
