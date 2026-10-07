import express from "express";
import { addRadiationData, getRadiationData } from "../controllers/radiation-controller.mjs";
import { verifyToken, isAdmin } from "../middlewares/authorization.mjs";

const radiationRouter = express.Router();

radiationRouter.post("/", verifyToken, isAdmin, addRadiationData);
radiationRouter.get("/", verifyToken, isAdmin, getRadiationData);

export default radiationRouter;
