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

const mongoUri = requireMongoUri();
const app = express();
const PORT = process.env.PORT || 5002;

// 1. CRÉATION DU SERVEUR HTTP POUR SOCKET.IO
const httpServer = createServer(app);

// 2. INITIALISATION SOCKET.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 3. RENDRE IO ACCESSIBLE AUX ROUTES (Pour faire io.emit dans les controllers)
app.set("socketio", io);

// Middleware setup
app.use(bodyParser.json());
app.use(cors());

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
  console.log('Client connected:', socket.id);
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
  if (sensorPollInProgress || io.engine.clientsCount === 0) return;
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
  res.status(error.status || 500);
  res.json({ message: error.message });
});

// Connect to MongoDB and start the server
mongoose
  .connect(mongoUri)
  .then(() => {
    // 4. ÉCOUTER VIA HTTPSERVER ET NON APP
    httpServer.listen(PORT, () => {
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

