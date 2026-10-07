import { allowedOrigins, authenticateSocket } from "./middlewares/authorization.mjs";
import { rateLimit, securityHeaders } from "./middlewares/security.mjs";
import "./config.mjs";
import express from "express";
import { createServer } from "http"; // AJOUT : Import natif Node
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userRouter from "./routes/user-routes.mjs";
import cors from "cors";
import capteurRouter from "./routes/capteurs-routes.mjs";
import { Server } from "socket.io";

import { fetchLatestData } from "./controllers/capteurs-controller.mjs";
import adminRouter from "./routes/admin.mjs";
import radiationRouter from "./routes/radiation-routes.mjs";
import arduinoRouter from "./routes/arduino-routes.mjs";

import { requireMongoUri } from "./config.mjs";
import { startOptionalMqttSensors } from "./services/mqtt-sensors.mjs";

if (!process.env.JWT_SECRET_KEY || Buffer.byteLength(process.env.JWT_SECRET_KEY) < 32) throw new Error("JWT_SECRET_KEY must contain at least 32 bytes");
if (process.env.NODE_ENV === "production" && (!process.env.APP_ORIGINS || allowedOrigins().some(origin => !origin.startsWith("https://")))) throw new Error("Set APP_ORIGINS to explicit HTTPS origins");
const mongoUri = requireMongoUri();
const app = express();
app.disable("x-powered-by");
// Enable only the exact trusted proxy hop count configured by the operator.
if (process.env.TRUST_PROXY_HOPS) {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 1 || hops > 5) throw new Error("Invalid TRUST_PROXY_HOPS");
  app.set("trust proxy", hops);
}
const PORT = process.env.PORT || 5002;

// 1. CRÉATION DU SERVEUR HTTP POUR SOCKET.IO
const httpServer = createServer(app);

// 2. INITIALISATION SOCKET.IO
const io = new Server(httpServer, {
  allowRequest: (req, callback) => callback(null,
    (io.engine.clientsCount < 1000) &&
    (!req.headers.origin || allowedOrigins().includes(req.headers.origin)) &&
    (process.env.NODE_ENV !== "production" || req.socket.encrypted === true ||
      (process.env.TRUST_PROXY_HOPS && req.headers["x-forwarded-proto"] === "https"))),
  cors: {
    origin: allowedOrigins(),
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// 3. RENDRE IO ACCESSIBLE AUX ROUTES (Pour faire io.emit dans les controllers)
app.set("socketio", io);
io.use(authenticateSocket);


// Middleware setup
app.use(securityHeaders);
app.use(cors({ origin: allowedOrigins(), credentials: true }));
app.use(rateLimit());
app.use(bodyParser.json({ limit: "32kb" }));

// Routes
app.use("/api/users", userRouter);
app.use("/api/capteurs", capteurRouter);
app.use("/api/admin", adminRouter);
app.use("/api/radiation", radiationRouter);
app.use("/api/v1", arduinoRouter);

app.get("/", (req, res) => {
  res.send("dzaza");
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  socket.join(`user:${socket.auth._id}`);
  const expirationTimer = setTimeout(() => socket.disconnect(true), Math.max(0, socket.auth.exp * 1000 - Date.now()));
  expirationTimer.unref();
  socket.once("disconnect", () => clearTimeout(expirationTimer));
  socket.emit('message', 'Connection successful');

  // On envoie les données actuelles immédiatement à la connexion
  fetchLatestData()
    .then(data => {
      socket.emit('sensorData', data);
      socket.emit('radiationData', data);
    })
    .catch(err => console.error(err));


  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Python inserts directly into MongoDB; poll to broadcast those readings too.
let sensorPollInProgress = false;
const sensorPollTimer = setInterval(async () => {
  if (sensorPollInProgress || io.of("/").sockets.size === 0) return;
  sensorPollInProgress = true;
  try {
    const data = await fetchLatestData();
    io.emit("sensorData", data);
  } catch (error) {
    console.error("Failed to broadcast sensor readings:", error.message);
  } finally {
    sensorPollInProgress = false;
  }
}, 5000);
sensorPollTimer.unref();
httpServer.on("close", () => clearInterval(sensorPollTimer));

// Error handling
app.use((req, res, next) => {
  const error = new Error("Could not find page");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const status = error.status || (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);
  res.status(status).json({ message: status >= 500 ? "Internal server error" : status === 404 ? "Not found" : "Invalid request" });
});

// Connect to MongoDB and start the server
mongoose
  .connect(mongoUri)
  .then(() => {
    // 4. ÉCOUTER VIA HTTPSERVER ET NON APP
    httpServer.listen(PORT, process.env.HOST || "127.0.0.1", () => {
      console.log(`Server is running in REAL-TIME mode on port ${PORT}`);
      // MQTT configuration or index errors must not disable login and HTTP routes.
      startOptionalMqttSensors({ io }).then(client => {
        if (client) httpServer.once("close", () => client.end());
      });
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });

