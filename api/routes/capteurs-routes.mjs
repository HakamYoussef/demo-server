import express from "express";
import { getDataa, getLatestData } from "../controllers/capteurs-controller.mjs";

const capteurRouter = express.Router();

capteurRouter.get("/dataa", getDataa);


export default capteurRouter;
