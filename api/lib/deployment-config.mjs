// HTTP is an explicit compatibility choice; production defaults remain HTTPS-only.
export function allowsHttp(env = process.env) { return env.ALLOW_INSECURE_HTTP === 'true'; }
export function usesSecureCookies(env = process.env) { return env.NODE_ENV === 'production' && !allowsHttp(env); }
export function validateDeployment(env = process.env) {
  if (!env.JWT_SECRET_KEY || Buffer.byteLength(env.JWT_SECRET_KEY) < 32) throw new Error('JWT_SECRET_KEY must contain at least 32 bytes. Run npm run setup:http for an HTTP deployment.');
  if (env.NODE_ENV !== 'production') return;
  const origins = (env.APP_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length) throw new Error('APP_ORIGINS must contain your exact browser origin');
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('Invalid APP_ORIGINS'); }
    if (url.origin !== origin || url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw new Error('APP_ORIGINS must contain exact HTTP(S) origins without paths');
    if (url.protocol !== 'https:' && !allowsHttp(env)) throw new Error('HTTPS origins are required unless ALLOW_INSECURE_HTTP=true');
  }
}
