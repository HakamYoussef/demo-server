import { allowsHttp } from "../lib/deployment-config.mjs";
import { allowedOrigins } from "./authorization.mjs";
export function rateLimit({ limit = 300, windowMs = 60000, maxKeys = 10000 } = {}) {
  const buckets = new Map();
  const timer = setInterval(() => { const now = Date.now(); for (const [key, b] of buckets) if (b.until <= now) buckets.delete(key); }, windowMs);
  timer.unref();
  return (req, res, next) => {
    const key = req.deviceId || req.ip;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.until <= now) {
      if (!b && buckets.size >= maxKeys) return res.status(429).json({ message: "Too many requests" });
      b = { count: 0, until: now + windowMs }; buckets.set(key, b);
    }
    if (++b.count > limit) { res.set("Retry-After", String(Math.ceil((b.until - now) / 1000))); return res.status(429).json({ message: "Too many requests" }); }
    next();
  };
}
export function securityHeaders(req, res, next) {
  res.set({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" });
  if (process.env.NODE_ENV === "production" && !allowsHttp()) {
    res.set("Strict-Transport-Security", "max-age=31536000");
    if (!req.secure) return res.status(426).json({ message: "HTTPS required" });
  }
  if (req.headers.origin && !allowedOrigins().includes(req.headers.origin)) return res.status(403).json({ message: "Untrusted request origin" });
  next();
}
