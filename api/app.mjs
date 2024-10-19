import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userRouter from "./routes/user-routes.mjs";
import cors from "cors";
import capteurRouter from "./routes/capteurs-routes.mjs";
import dotenv from "dotenv";
dotenv.config();
import { WebSocketServer } from "ws";

import { fetchLatestData, getLatestData } from "./controllers/capteurs-controller.mjs";
import adminRouter from "./routes/admin.mjs";

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware setup
app.use(bodyParser.json()); // Parse incoming JSON requests
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use("/api/users", userRouter); // Route for user-related requests
app.use("/api/capteurs", capteurRouter); // Route for capteur-related requests
app.use("/api/admin", adminRouter); // Route for admin-related requests

// Route for the root URL
app.get("/", (req, res, next) => {
  res.send("dzaza");
});

// Error handling middleware for 404 Not Found
app.use((req, res, next) => {
  const error = new Error("Could not find page");
  error.status = 404;
  next(error);
});

// Error handling middleware for other errors
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({ message: error.message });
});

// Connect to MongoDB and start the server
mongoose
  .connect(process.env.MONGODB_URI || "mongodb+srv://fatimaeddaoudi:fatimaD147011474@cluster0.vkuykr8.mongodb.net/arduino_data_db")
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Setup WebSocket server
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      console.log('Client connected');
      ws.send(JSON.stringify({ message: 'Connection successful' }));

      // Function to fetch and send the latest data
      const sendData = async () => {
        try {
          const latestData = await fetchLatestData();
          ws.send(JSON.stringify(latestData));
        } catch (error) {
          console.error('Error fetching latest data:', error);
          ws.send(JSON.stringify({ error: 'Error fetching latest data' }));
        }
      };

      sendData();

      // Send data every 2 seconds
      const intervalId = setInterval(sendData, 2000);

      // Handle WebSocket disconnection
      ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(intervalId);
      });

      // Handle WebSocket errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clearInterval(intervalId); 
      });
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
