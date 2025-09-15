import express from "express";
import { getConfig, postComptage, getComptage } from "../controllers/arduino-controller.mjs";

const arduinoRouter = express.Router();

arduinoRouter.get("/config", getConfig);
arduinoRouter.get("/readings", getComptage);
arduinoRouter.post("/readings", postComptage);

export default arduinoRouter;
