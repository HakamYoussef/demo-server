import { usesSecureCookies } from "../lib/deployment-config.mjs";
import "../config.mjs";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import { User } from "../models/user.mjs";

export const sessionCookie = "session";
export const sessionSeconds = 900;
export const cookieOptions = () => ({ httpOnly: true, secure: usesSecureCookies(), sameSite: "strict", path: "/" });
export const allowedOrigins = () => (process.env.APP_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim()).filter(Boolean);
export function readCookie(header = "") {
  const entry = header.split(";").find(item => item.trim().startsWith(`${sessionCookie}=`));
  try { return entry ? decodeURIComponent(entry.trim().slice(sessionCookie.length + 1)) : undefined; } catch { return undefined; }
}
export async function authenticateToken(token) {
  if (!token) throw new Error("Missing session");
  const claims = jwt.verify(token, process.env.JWT_SECRET_KEY, { algorithms: ["HS256"], issuer: "sensor-api", audience: "sensor-web", maxAge: `${sessionSeconds}s` });
  if (!Number.isInteger(claims.exp) || typeof claims._id !== "string" || !/^[a-f0-9]{24}$/i.test(claims._id)) throw new Error("Invalid session");
  const user = await User.findById(claims._id).select("-password");
  if (!user || claims.version !== (user.sessionVersion || 0)) throw new Error("Expired session");
  return { _id: String(user._id), isAdmin: user.isAdmin === true, exp: claims.exp };
}
export async function verifyToken(req, res, next) {
  try {
    const cookie = readCookie(req.headers.cookie);
    if (cookie && !["GET", "HEAD", "OPTIONS"].includes(req.method) && !allowedOrigins().includes(req.headers.origin)) {
      return res.status(403).json({ message: "Untrusted request origin" });
    }
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || "")?.[1];
    req.auth = await authenticateToken(cookie || bearer);
    return next();
  } catch { return res.status(401).json({ message: "Invalid or expired session" }); }
}
export function authorization(req, res, next) {
  if (req.auth && (req.auth.isAdmin || String(req.params.id) === req.auth._id)) return next();
  return res.status(403).json({ message: "Forbidden" });
}
export function isAdmin(req, res, next) {
  if (req.auth?.isAdmin === true) return next();
  return res.status(403).json({ message: "Administrator access required" });
}
export function verifyDevice(req, res, next) {
  // A distinct key is provisioned per device; never reuse a user's session token.
  let devices;
  try { devices = JSON.parse(process.env.DEVICE_API_KEYS || "{}"); } catch { return res.status(503).json({ message: "Device authentication unavailable" }); }
  const id = req.headers["x-device-id"];
  const key = req.headers["x-device-key"];
  const expected = typeof id === "string" && Object.hasOwn(devices, id) ? devices[id] : undefined;
  if (typeof key !== "string" || typeof expected !== "string" || expected.length < 32) return res.status(401).json({ message: "Invalid device credentials" });
  const a = Buffer.from(key), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ message: "Invalid device credentials" });
  req.deviceId = id;
  return next();
}
export async function authenticateSocket(socket, next) {
  try {
    const origin = socket.handshake.headers.origin;
    if (origin && !allowedOrigins().includes(origin)) throw new Error("Invalid origin");
    socket.auth = await authenticateToken(readCookie(socket.handshake.headers.cookie) || socket.handshake.auth?.token);
    const connections = socket.nsp?.sockets ? [...socket.nsp.sockets.values()].filter(client => client.auth?._id === socket.auth._id).length : 0;
    if (connections >= 10) throw new Error("Connection limit exceeded");
    next();
  } catch { next(new Error("Unauthorized")); }
}
