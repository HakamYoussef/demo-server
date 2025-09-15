import express from "express";
import { getConfig, postComptage } from "../controllers/arduino-controller.mjs";

const arduinoRouter = express.Router();

arduinoRouter.get("/config", getConfig);
arduinoRouter.post("/readings", postComptage);

export default arduinoRouter;
