import express from "express";
import { getDataa, getLatestData } from "../controllers/capteurs-controller.mjs";

import { verifyToken } from "../middlewares/authorization.mjs";

const capteurRouter = express.Router();

capteurRouter.get("/dataa", verifyToken, getDataa);


export default capteurRouter;
