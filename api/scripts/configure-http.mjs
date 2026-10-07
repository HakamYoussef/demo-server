import { readFile, writeFile, copyFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

const apiDirectory = fileURLToPath(new URL('../', import.meta.url));
const localPath = fileURLToPath(new URL('../.env.local', import.meta.url));
const legacyPath = fileURLToPath(new URL('../.env', import.meta.url));
async function readOptional(path) {
  try { return await readFile(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}
const args = process.argv.slice(2);
let origin = args.find(arg => arg.startsWith('--origin='))?.slice('--origin='.length);
if (!origin) {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try { origin = (await input.question('Adresse complete du site (exemple http://IP:3000) : ')).trim(); } finally { input.close(); }
}
let url;
try { url = new URL(origin); } catch { throw new Error('Enter the complete http:// address, including the port if present'); }
if (url.protocol !== 'http:' || url.username || url.password || !['', '/'].includes(url.pathname) || url.search || url.hash) throw new Error('Enter an HTTP site origin without a path');
origin = url.origin;
const previous = await readOptional(localPath);
const local = dotenv.parse(previous);
const legacy = dotenv.parse(await readOptional(legacyPath));
// Preserve a strong configured key. Replace only a missing or short key.
const configuredKey = local.JWT_SECRET_KEY || process.env.JWT_SECRET_KEY || legacy.JWT_SECRET_KEY;
const secret = configuredKey && Buffer.byteLength(configuredKey) >= 32 ? configuredKey : randomBytes(48).toString('hex');
const settings = { NODE_ENV: 'production', ALLOW_INSECURE_HTTP: 'true', APP_ORIGINS: origin, JWT_SECRET_KEY: secret };
const lines = previous.split(/\r?\n/).filter(line => !Object.keys(settings).some(key => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line)));
if (previous) {
  const backup = `${localPath}.backup-${Date.now()}`;
  await copyFile(localPath, backup); await chmod(backup, 0o600);
}
const contents = lines.filter(Boolean).join('\n') + '\n' + Object.entries(settings).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n';
await writeFile(localPath, contents, { mode: 0o600 }); await chmod(localPath, 0o600);
console.log(`HTTP configuration saved for ${origin}. JWT key is not displayed; existing MongoDB settings are preserved.`);
console.warn('HTTP does not encrypt passwords or cookies. Use HTTPS when available.');
if (args.includes('--restart')) {
  // Updating PM2's environment avoids an old, short JWT key overriding the new file.
  const environment = { ...legacy, ...process.env, ...local, ...settings };
  const result = spawnSync('pm2', ['restart', 'api', '--update-env'], { cwd: apiDirectory, env: environment, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
} else {
  console.log('Run again with --restart to apply configuration to the PM2 process named api.');
}
