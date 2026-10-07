import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User, validateLoginUser, validateRegisterUser } from "../models/user.mjs";
import { cookieOptions, sessionCookie, sessionSeconds } from "../middlewares/authorization.mjs";

export const register = asyncHandler(async (req, res) => {
  const { error, value } = validateRegisterUser(req.body);
  if (error) return res.status(400).json({ message: "Invalid registration data" });
  if (await User.findOne({ email: value.email })) return res.status(409).json({ message: "Account already exists" });
  const user = await new User({ email: value.email, password: await bcrypt.hash(value.password, 12) }).save();
  res.status(201).json({ _id: user._id, email: user.email, isAdmin: user.isAdmin });
});
export const login = asyncHandler(async (req, res) => {
  const { error, value } = validateLoginUser(req.body);
  if (error) return res.status(400).json({ message: "Invalid login data" });
  const user = await User.findOne({ email: value.email });
  // Compare even when the account does not exist to reduce timing-based enumeration.
  const dummyHash = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
  const valid = await bcrypt.compare(value.password, user?.password || dummyHash);
  if (!user || !valid) return res.status(401).json({ message: "Invalid email or password" });
  const token = jwt.sign({ _id: String(user._id), version: user.sessionVersion || 0 }, process.env.JWT_SECRET_KEY, {
    expiresIn: sessionSeconds, issuer: "sensor-api", audience: "sensor-web", algorithm: "HS256"
  });
  res.cookie(sessionCookie, token, { ...cookieOptions(), maxAge: sessionSeconds * 1000 });
  res.set("Cache-Control", "no-store");
  return res.json({ user: { _id: user._id, email: user.email, isAdmin: user.isAdmin }, expiresAt: Date.now() + sessionSeconds * 1000 });
});
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth._id).select("_id email isAdmin");
  res.set("Cache-Control", "no-store");
  res.json({ user, expiresAt: req.auth.exp * 1000 });
});
export const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.auth._id }, { $inc: { sessionVersion: 1 } });
  req.app.get("socketio")?.in(`user:${req.auth._id}`).disconnectSockets(true);
  res.clearCookie(sessionCookie, cookieOptions());
  res.status(204).end();
});
