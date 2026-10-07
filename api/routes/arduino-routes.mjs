import express from "express";
import { getConfig, postComptage, getComptage } from "../controllers/arduino-controller.mjs";

import { verifyToken, verifyDevice } from "../middlewares/authorization.mjs";
import { rateLimit } from "../middlewares/security.mjs";

const arduinoRouter = express.Router();

arduinoRouter.get("/config", verifyDevice, getConfig);
arduinoRouter.get("/readings", verifyToken, getComptage);
arduinoRouter.post("/readings", verifyDevice, rateLimit({ limit: 120, windowMs: 60000 }), postComptage);

export default arduinoRouter;
